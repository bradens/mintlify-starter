import { z } from 'zod';

import { getService } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';
import {
  type ActionResult,
  type ActionContext,
  createAction,
  createSuccessResult,
  createErrorResult,
  AuthLevel,
  logAction,
} from '@/lib/actions/base-action';
import {
  type ApiKey,
  type PaginatedResponse,
  createApiKeySchema,
  updateApiKeySchema,
  deleteApiKeySchema,
  getApiKeysSchema,
} from '@/types/actions';

// Input validation schemas for action handlers (without defaults to avoid type issues)
const createApiKeyInputSchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(50, 'Name must be less than 50 characters'),
  allowedDomains: z.array(z.string()).optional(),
});

const getApiKeysInputSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

const toggleApiKeyStatusSchema = z.object({
  id: z.string().min(1, 'API key ID is required'),
  isActive: z.boolean(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;
export type GetApiKeysInput = z.infer<typeof getApiKeysInputSchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
export type ToggleApiKeyStatusInput = z.infer<typeof toggleApiKeyStatusSchema>;

/**
 * Helper function to transform server API user model to dashboard ApiKey type
 */
function transformApiUserToApiKey(apiUser: any): ApiKey {
  return {
    id: apiUser.id,
    name: apiUser.name,
    key: apiUser.apiKey,
    keyPreview: apiUser.apiKey
      ? `${apiUser.apiKey.substring(0, 12)}...${apiUser.apiKey.substring(apiUser.apiKey.length - 6)}`
      : '',
    userId: apiUser.cognitoId,
    isActive: apiUser.status === 'ACTIVE',
    usageCount: apiUser.usageCount || 0,
    rateLimitPerMinute: 100, // Default from usage plan
    monthlyQuota: 10000, // Default from usage plan
    usedThisMonth: apiUser.usageThisMonth || 0,
    createdAt: new Date(apiUser.createdAt * 1000),
    updatedAt: new Date(apiUser.updatedAt * 1000),
    lastUsedAt: apiUser.lastUsedAt ? new Date(apiUser.lastUsedAt * 1000) : undefined,
    expiresAt: apiUser.expiresAt ? new Date(apiUser.expiresAt * 1000) : undefined,
    allowedDomains: apiUser.origins || [],
  };
}

/**
 * Create a new API key for the authenticated user
 */
export const createApiKey = createAction<CreateApiKeyInput, ApiKey>(
  {
    authLevel: AuthLevel.VERIFIED,
    revalidate: {
      tags: ['api-keys'],
      paths: ['/api-keys'],
    },
  },
  createApiKeyInputSchema,
  async (input, context: ActionContext): Promise<ActionResult<ApiKey>> => {
    try {
      logAction('create-api-key', context.user.userId, {
        name: input.name,
        allowedDomains: input.allowedDomains,
      });

      // Get the ApiKeyService from the DI container
      const apiKeyService = getService<any>(SYMBOLS.ApiKeyService);

      // Create the API key using the server service
      const apiUser = await apiKeyService.createApiKey(
        {
          name: input.name,
          origins: input.allowedDomains || [],
        },
        context.user.userId // This should be the verified Cognito ID
      );

      // Transform the server model to our dashboard ApiKey type
      const apiKey = transformApiUserToApiKey(apiUser);

      return createSuccessResult(apiKey);
    } catch (error) {
      console.error('Error creating API key:', error);

      if (error instanceof Error) {
        // Handle specific API key service errors
        if (error.message.includes('limit')) {
          return createErrorResult(error.message) as ActionResult<ApiKey>;
        }
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          return createErrorResult(
            'An API key with this name already exists. Please choose a different name.'
          ) as ActionResult<ApiKey>;
        }
        if (error.message.includes('rate limit')) {
          return createErrorResult(
            'Rate limit exceeded. Please try again later.'
          ) as ActionResult<ApiKey>;
        }
      }

      return createErrorResult(
        'Failed to create API key. Please try again.'
      ) as ActionResult<ApiKey>;
    }
  }
);

/**
 * Get paginated list of API keys for the authenticated user
 */
export const getApiKeys = createAction<GetApiKeysInput, PaginatedResponse<ApiKey>>(
  {
    authLevel: AuthLevel.VERIFIED,
  },
  getApiKeysInputSchema,
  async (input, context: ActionContext): Promise<ActionResult<PaginatedResponse<ApiKey>>> => {
    try {
      logAction('get-api-keys', context.user.userId, {
        page: input.page,
        limit: input.limit,
        search: input.search,
      });

      // Get the ApiKeyService from the DI container
      const apiKeyService = getService<any>(SYMBOLS.ApiKeyService);

      // Get API keys from the server service
      const result = await apiKeyService.getApiKeys({
        cognitoId: context.user.userId,
        includeValues: true, // We want the actual API key values for the dashboard
      });

      // Filter out deleted API keys before transformation
      const activeApiUsers = result.items.filter((apiUser: any) => apiUser.status !== 'DELETED');

      // Transform server models to dashboard types
      let apiKeys = activeApiUsers.map(transformApiUserToApiKey);

      // Apply client-side filtering since the server service doesn't support all our filters
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        apiKeys = apiKeys.filter(
          (key: ApiKey) =>
            key.name.toLowerCase().includes(searchLower) ||
            key.keyPreview.toLowerCase().includes(searchLower)
        );
      }

      if (typeof input.isActive === 'boolean') {
        apiKeys = apiKeys.filter((key: ApiKey) => key.isActive === input.isActive);
      }

      // Apply pagination
      const total = apiKeys.length;
      const totalPages = Math.ceil(total / input.limit);
      const offset = (input.page - 1) * input.limit;
      const paginatedKeys = apiKeys.slice(offset, offset + input.limit);

      const response: PaginatedResponse<ApiKey> = {
        data: paginatedKeys,
        meta: {
          total,
          page: input.page,
          limit: input.limit,
          totalPages,
          hasNext: input.page < totalPages,
          hasPrevious: input.page > 1,
        },
      };

      return createSuccessResult(response);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return createErrorResult('Failed to fetch API keys. Please try again.') as ActionResult<
        PaginatedResponse<ApiKey>
      >;
    }
  }
);

/**
 * Get a specific API key by ID
 */
export const getApiKey = createAction<{ id: string }, ApiKey>(
  {
    authLevel: AuthLevel.VERIFIED,
  },
  deleteApiKeySchema, // Reuse schema that just needs id
  async (input, context: ActionContext): Promise<ActionResult<ApiKey>> => {
    try {
      logAction('get-api-key', context.user.userId, { apiKeyId: input.id });

      // Get the ApiKeyService from the DI container
      const apiKeyService = getService<any>(SYMBOLS.ApiKeyService);

      // Get the API key from the server service
      const apiUser = await apiKeyService.getApiKey({
        id: input.id,
        includeValue: true,
      });

      // Verify ownership (the service should handle this, but double-check)
      if (apiUser.cognitoId !== context.user.userId) {
        return createErrorResult(
          'You do not have permission to access this API key.'
        ) as ActionResult<ApiKey>;
      }

      const apiKey = transformApiUserToApiKey(apiUser);
      return createSuccessResult(apiKey);
    } catch (error) {
      console.error('Error fetching API key:', error);

      if (error instanceof Error && error.message.includes('Not Found')) {
        return createErrorResult('API key not found.') as ActionResult<ApiKey>;
      }

      return createErrorResult(
        'Failed to fetch API key. Please try again.'
      ) as ActionResult<ApiKey>;
    }
  }
);

/**
 * Update an existing API key
 */
export const updateApiKey = createAction<UpdateApiKeyInput, ApiKey>(
  {
    authLevel: AuthLevel.VERIFIED,
    revalidate: {
      tags: ['api-keys'],
      paths: ['/api-keys'],
    },
  },
  updateApiKeySchema,
  async (input, context: ActionContext): Promise<ActionResult<ApiKey>> => {
    try {
      logAction('update-api-key', context.user.userId, {
        apiKeyId: input.id,
        updates: Object.keys(input).filter(key => key !== 'id'),
      });

      // Get the ApiKeyService from the DI container
      const apiKeyService = getService<any>(SYMBOLS.ApiKeyService);

      // Update the API key using the server service
      const apiUser = await apiKeyService.updateApiKey(
        {
          id: input.id,
          name: input.name,
          enabled: input.isActive,
          origins: (input as any).allowedDomains, // Type assertion since our schema extends the base
        },
        context.user.userId
      );

      const apiKey = transformApiUserToApiKey(apiUser);
      return createSuccessResult(apiKey);
    } catch (error) {
      console.error('Error updating API key:', error);

      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          return createErrorResult(
            'You do not have permission to update this API key.'
          ) as ActionResult<ApiKey>;
        }
        if (error.message.includes('Not Found')) {
          return createErrorResult('API key not found.') as ActionResult<ApiKey>;
        }
      }

      return createErrorResult(
        'Failed to update API key. Please try again.'
      ) as ActionResult<ApiKey>;
    }
  }
);

/**
 * Delete an API key
 */
export const deleteApiKey = createAction<DeleteApiKeyInput, { success: boolean }>(
  {
    authLevel: AuthLevel.VERIFIED,
    revalidate: {
      tags: ['api-keys'],
      paths: ['/api-keys'],
    },
  },
  deleteApiKeySchema,
  async (input, context: ActionContext): Promise<ActionResult<{ success: boolean }>> => {
    try {
      logAction('delete-api-key', context.user.userId, { apiKeyId: input.id });

      // Get the ApiKeyService from the DI container
      const apiKeyService = getService<any>(SYMBOLS.ApiKeyService);

      // Delete the API key using the server service
      const success = await apiKeyService.deleteApiKey({ id: input.id }, context.user.userId);

      return createSuccessResult({ success });
    } catch (error) {
      console.error('Error deleting API key:', error);

      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          return createErrorResult(
            'You do not have permission to delete this API key.'
          ) as ActionResult<{ success: boolean }>;
        }
        if (error.message.includes('Not Found')) {
          return createErrorResult('API key not found.') as ActionResult<{ success: boolean }>;
        }
      }

      return createErrorResult('Failed to delete API key. Please try again.') as ActionResult<{
        success: boolean;
      }>;
    }
  }
);

/**
 * Regenerate an API key (creates new key value while keeping same configuration)
 */
export const regenerateApiKey = createAction<{ id: string }, ApiKey>(
  {
    authLevel: AuthLevel.VERIFIED,
    revalidate: {
      tags: ['api-keys'],
      paths: ['/api-keys'],
    },
  },
  deleteApiKeySchema, // Reuse the same schema (just needs id)
  async (input, context: ActionContext): Promise<ActionResult<ApiKey>> => {
    try {
      logAction('regenerate-api-key', context.user.userId, { apiKeyId: input.id });

      // For regeneration, we'll need to implement this in the server service
      // For now, return not implemented
      console.warn('API Key regeneration not yet implemented - needs server service method');
      return createErrorResult(
        'API key regeneration is not yet implemented. Please check back later.'
      ) as ActionResult<ApiKey>;
    } catch (error) {
      console.error('Error regenerating API key:', error);
      return createErrorResult(
        'Failed to regenerate API key. Please try again.'
      ) as ActionResult<ApiKey>;
    }
  }
);

/**
 * Toggle API key status (enable/disable)
 */
export const toggleApiKeyStatus = createAction<ToggleApiKeyStatusInput, ApiKey>(
  {
    authLevel: AuthLevel.VERIFIED,
    revalidate: {
      tags: ['api-keys'],
      paths: ['/api-keys'],
    },
  },
  toggleApiKeyStatusSchema,
  async (input, context: ActionContext): Promise<ActionResult<ApiKey>> => {
    try {
      logAction('toggle-api-key-status', context.user.userId, {
        apiKeyId: input.id,
        isActive: input.isActive,
      });

      // Get the ApiKeyService from the DI container
      const apiKeyService = getService<any>(SYMBOLS.ApiKeyService);

      // Update the API key status using the server service
      const apiUser = await apiKeyService.updateApiKey(
        {
          id: input.id,
          enabled: input.isActive,
        },
        context.user.userId
      );

      const apiKey = transformApiUserToApiKey(apiUser);
      return createSuccessResult(apiKey);
    } catch (error) {
      console.error('Error toggling API key status:', error);

      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          return createErrorResult(
            'You do not have permission to modify this API key.'
          ) as ActionResult<ApiKey>;
        }
        if (error.message.includes('Not Found')) {
          return createErrorResult('API key not found.') as ActionResult<ApiKey>;
        }
        if (error.message.includes('limit')) {
          return createErrorResult(error.message) as ActionResult<ApiKey>;
        }
      }

      return createErrorResult(
        'Failed to toggle API key status. Please try again.'
      ) as ActionResult<ApiKey>;
    }
  }
);
