import {
  ALL_OPERATIONS,
  bucketsBetween,
  CognitoAttribute,
  CognitoClient,
  DEFAULT_USAGE_LIMIT_ID,
  QUERY_OPERATIONS,
  SUBSCRIPTION_OPERATIONS,
} from '@company-z/api-management-library';
import {
  ApiUserStatus,
  durationAgo,
  DynamoApiUserService,
  DynamoMetricsService,
  DynamoUsageLimitService,
  MetricsModel,
  modelReadOptionsCacheFirst,
  UsageLimitModel,
  WebhookMetricType,
} from '@company-z/crypto-data';

// Local Duration enum to avoid crypto-types dependency
export enum Duration {
  Week1 = 'week1',
  Day1 = 'day1',
  Hour1 = 'hour1',
  Minute5 = 'minute5',
}

export enum OperationType {
  All = 'ALL',
  Query = 'QUERY',
  Subscription = 'SUBSCRIPTION',
  Webhook = 'WEBHOOK',
}

export interface GetUsageInput {
  apiUserIds?: string[];
  lowerBound: number;
  operationType?: OperationType;
  resolution?: string;
  statuses?: string[];
  upperBound: number;
  userId?: string;
}

const OperationsFromTypeMap = {
  [OperationType.Query]: QUERY_OPERATIONS,
  [OperationType.Subscription]: SUBSCRIPTION_OPERATIONS,
  [OperationType.All]: ALL_OPERATIONS,
  [OperationType.Webhook]: Object.values(WebhookMetricType),
};

const DEFAULT_INPUT = {
  lowerBound: durationAgo(Duration.Week1 as any),
  operationType: OperationType.All,
  resolution: Duration.Day1,
  statuses: [ApiUserStatus.Active, ApiUserStatus.Inactive, ApiUserStatus.Deleted],
  upperBound: Math.floor(Date.now() / 1000),
};

export class ApiUsageService {
  constructor(
    protected metricsService: DynamoMetricsService,
    protected apiUserService: DynamoApiUserService,
    protected usageLimitService: DynamoUsageLimitService,
    protected cognitoClient: CognitoClient
  ) {}

  async getUsageLimit(verifiedId: string): Promise<UsageLimitModel> {
    try {
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
    } catch (error) {
      console.error('Error getting usage limit:', error);
      throw error;
    }
  }

  async getUsageMetrics(userInput: GetUsageInput, verifiedId: string): Promise<MetricsModel[]> {
    try {
      const input = {
        ...DEFAULT_INPUT,
        ...userInput,
        operations: OperationsFromTypeMap[userInput.operationType || OperationType.All],
      };

      const apiUserIds = (
        await this.apiUserService.query(
          { cognitoId: verifiedId, status: input.statuses },
          { IndexName: 'cognitoIdIndex' }
        )
      ).items.map((apiUser: any) => apiUser.id);

      // Filter by specific API user IDs if provided
      const filteredApiUserIds = userInput.apiUserIds
        ? apiUserIds.filter((id: any) => userInput.apiUserIds!.includes(id))
        : apiUserIds;

      const buckets = bucketsBetween(input.upperBound, input.lowerBound, input.resolution as any);

      console.log('filteredApiUserIds', buckets, input);
      const keys = input.operations
        .map((operation: any) =>
          buckets
            .map((bucket: any) =>
              filteredApiUserIds.map((apiUserId: any) => ({
                id: this.metricsService.userHashKeyFromValues({
                  apiUserId,
                  operation,
                  resolution: input.resolution as any,
                }),
                timestamp: bucket,
              }))
            )
            .flat()
        )
        .flat();

      console.log('keys', keys);

      const metrics = await this.metricsService.findByKeys(keys, modelReadOptionsCacheFirst);

      const filteredMetrics = metrics.filter((metric: any) => metric);
      console.log('filteredMetrics', filteredMetrics);
      return filteredMetrics;
    } catch (error) {
      console.error('Error getting usage metrics:', error);
      throw error;
    }
  }
}
