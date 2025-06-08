import {
  CognitoAttribute,
  CognitoClient,
  CognitoUserAttributes,
  DEFAULT_USAGE_LIMIT_ID,
} from '@company-z/api-management-library';
import {
  ApiUserModel,
  ApiUserStatus,
  ApiUserSuperStatus,
  DynamoApiUserService,
  DynamoUsageLimitService,
  Plan,
  UsageLimitModel,
} from '@company-z/crypto-data';

export interface CreateApiKeyInput {
  name: string;
  origins?: string[];
}

export interface DeleteApiKeyInput {
  id: string;
}

export interface GetApiKeyInput {
  id: string;
  includeValue?: boolean;
}

export interface GetApiKeysInput {
  includeValues?: boolean;
  userId?: string;
}

export interface UpdateApiKeyInput {
  id: string;
  enabled?: boolean;
  name?: string;
  origins?: string[];
}

// TODO temp, this whole file should live in the api mgmt lib.
const maybeJson = <T>(value: string): T => {
  try {
    const json = JSON.parse(value);
    return json as T;
  } catch {
    return value as unknown as T;
  }
};

export class ApiKeyService {
  constructor(
    protected cognitoClient: CognitoClient,
    protected apiUserService: DynamoApiUserService,
    protected usageLimitService: DynamoUsageLimitService
  ) {}

  async getApiKey(input: GetApiKeyInput): Promise<any> {
    const apiUser = await this.apiUserService.findByKey({ id: input.id });

    if (!apiUser) {
      throw new Error('API key not found');
    }

    return input.includeValue ? apiUser : { ...apiUser, apiKey: null };
  }

  async getApiKeys(input: GetApiKeysInput & { cognitoId: string }): Promise<{ items: any[] }> {
    const result = await this.apiUserService.query({
      cognitoId: input.cognitoId,
      status: [ApiUserStatus.Active, ApiUserStatus.Inactive, ApiUserStatus.Deleted],
    });

    return input.includeValues
      ? result
      : {
          ...result,
          items: result.items.map((apiUser: any) => ({ ...apiUser, apiKey: null })),
        };
  }

  async createApiKey(input: CreateApiKeyInput, verifiedId: string): Promise<ApiUserModel> {
    const user = await this.cognitoClient.getAttributes(verifiedId);

    await this.enforceApiKeyLimitsOnCreate(user);

    const usageLimit = await this.getUsageLimit(verifiedId);

    const stripeSubscriptionId = user[CognitoAttribute.StripeSubscriptionId];

    const superStatuses: ApiUserSuperStatus[] =
      maybeJson(user[CognitoAttribute.SuperStatuses]) || [];

    const values = {
      ...input,
      cognitoId: user[CognitoAttribute.Sub],
      ...(superStatuses.length && { superStatuses }),
      // Need a fallback here since not all cognito users will have a plan type.
      planType: (user[CognitoAttribute.PlanType] as Plan) || Plan.Free,
      status: ApiUserStatus.Active,
      stripeSubscriptionId,
      usageLimitId: usageLimit.id,
      webhookEnabled: !!stripeSubscriptionId,
      websocketEnabled: !!stripeSubscriptionId,
    };

    if (!values.origins || values.origins.length === 0) {
      delete values.origins;
    }

    return await this.apiUserService.create(values);
  }

  async updateApiKey(input: UpdateApiKeyInput, verifiedId: string): Promise<ApiUserModel> {
    const [isOwner, user] = await Promise.all([
      this.verifyApiKeyOwnership(input.id, verifiedId),
      this.cognitoClient.getAttributes(verifiedId),
    ]);

    if (!isOwner) {
      throw new Error('Unauthorized');
    }

    const existingApiUser = await this.apiUserService.findByKey({
      id: input.id,
    });

    if (!existingApiUser) {
      throw new Error('API User Not Found');
    }

    // If the API key is being (re)enabled, enforce the API key limits.
    const statusChanged = typeof input.enabled === 'boolean';

    // The user is trying to enable or disable the key
    if (statusChanged) {
      await this.enforceApiKeyLimitsOnUpdate(user, input.id);

      const updatedApiUser = await this.apiUserService.saveByValues({
        ...existingApiUser,
        status: input.enabled ? ApiUserStatus.Active : ApiUserStatus.Inactive,
      });

      // Note: Side effects for enable/disable would be handled here in full implementation
      // input.enabled
      //   ? await this.sideEffectsService.onEnable(input.id)
      //   : await this.sideEffectsService.onDisable(input.id);

      return updatedApiUser;
    }

    // Since name and origins can be updated independently we need
    // to fallback to the existing values if they are not provided.
    const values = {
      ...existingApiUser,
      name: input.name || existingApiUser.name,
      origins: input.origins || existingApiUser.origins,
    };

    if (!values.origins || values.origins.length === 0) {
      delete values.origins;
    }

    return await this.apiUserService.saveByValues(values);
  }

  async deleteApiKey(input: DeleteApiKeyInput, verifiedId: string): Promise<boolean> {
    const isOwner = await this.verifyApiKeyOwnership(input.id, verifiedId);

    if (!isOwner) {
      throw new Error('Unauthorized');
    }

    const apiUser = await this.apiUserService.findByKey({ id: input.id });
    if (apiUser) {
      await this.apiUserService.delete(apiUser);
    }

    // Note: Side effects for delete would be handled here in full implementation
    // await this.sideEffectsService.onDelete(input.id);

    return true;
  }

  // TODO deprecate this method, specifically the "plan" language since it's "limit" now.
  //      this should happen along with deprecating the shimmed usage limit => usage plan model.
  async getUsagePlanByUserId(verifiedId: string): Promise<UsageLimitModel> {
    return this.getUsageLimit(verifiedId);
  }

  //
  // Private
  //
  private async verifyApiKeyOwnership(id: ApiUserModel['id'], verifiedId: string) {
    try {
      const apiUser = await this.apiUserService.findByKey({ id });
      return apiUser?.cognitoId === verifiedId;
    } catch (e) {
      console.error('Error verifying ownership', e);
      return false;
    }
  }

  private async getUsageLimit(verifiedId: string): Promise<UsageLimitModel> {
    const accountUsageLimitId = await this.cognitoClient.getAttributeByName(
      verifiedId,
      CognitoAttribute.UsageLimitId
    );

    const usageLimitId = accountUsageLimitId || DEFAULT_USAGE_LIMIT_ID;

    const [defaultUsageLimit, customUsageLimit] = await Promise.all([
      this.usageLimitService.findByKey({
        id: usageLimitId,
      }),
      this.usageLimitService.findByKeyValues({
        id: usageLimitId,
        accountId: verifiedId,
      }),
    ]);

    const result = customUsageLimit || defaultUsageLimit;
    if (!result) {
      throw new Error(`Usage limit not found for ID: ${usageLimitId}`);
    }

    return result;
  }

  private async enforceApiKeyLimitsOnCreate(user: CognitoUserAttributes): Promise<void> {
    const apiKeys = await this.getApiKeys({ cognitoId: user.sub });
    const nonDeletedApiKeys = apiKeys.items.filter(k => k.status !== ApiUserStatus.Deleted);
    const userApiKeyLimit = parseInt(user[CognitoAttribute.ApiKeyLimit]);
    const limitedReached = nonDeletedApiKeys.length >= userApiKeyLimit;

    if (limitedReached) {
      throw new Error(
        `Cannot create API key. Your account is limited to ${userApiKeyLimit} api key${
          userApiKeyLimit === 1 ? '' : 's'
        }. To increase your limit, please upgrade your plan.`
      );
    }
  }

  private async enforceApiKeyLimitsOnUpdate(
    user: CognitoUserAttributes,
    id: ApiUserModel['id']
  ): Promise<void> {
    const apiKeys = await this.getApiKeys({ cognitoId: user.sub });
    const userApiKeyLimit = parseInt(user[CognitoAttribute.ApiKeyLimit]);

    // If they have more API keys than their limit, then only let them
    // enable up to their limit. This happens when a user downgrades.
    const enabledApiKeys = apiKeys.items.filter(apiKey => apiKey.status === ApiUserStatus.Active);
    const limitedReached = enabledApiKeys.length >= userApiKeyLimit;
    const isEnabled = enabledApiKeys.find(apiKey => id === apiKey.id);

    if (limitedReached && !isEnabled) {
      throw new Error(
        `Cannot enable API key. Your account is limited to ${userApiKeyLimit} api key${
          userApiKeyLimit === 1 ? '' : 's'
        }. To increase your limit, please upgrade your plan.`
      );
    }
  }
}
