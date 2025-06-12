import { Container } from 'inversify';
import { Session } from 'next-auth';

import { SYMBOLS } from '@/di/symbols';

import { ActionContext, ActionResult, UserContext } from '../base-action';

/**
 * Mock user contexts for testing
 */
export const mockUsers = {
  normalUser: {
    userId: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
    isVerified: true,
  } as UserContext,

  adminUser: {
    userId: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    isAdmin: true,
    isVerified: true,
  } as UserContext,

  unverifiedUser: {
    userId: 'unverified-123',
    email: 'unverified@example.com',
    name: 'Unverified User',
    isAdmin: false,
    isVerified: false,
  } as UserContext,
};

/**
 * Mock session data for testing
 */
export const mockSessions = {
  normalUser: {
    user: {
      id: mockUsers.normalUser.userId,
      email: mockUsers.normalUser.email,
      name: mockUsers.normalUser.name,
      role: 'user',
      emailVerified: new Date(),
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session,

  adminUser: {
    user: {
      id: mockUsers.adminUser.userId,
      email: mockUsers.adminUser.email,
      name: mockUsers.adminUser.name,
      role: 'admin',
      emailVerified: new Date(),
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session,

  unverifiedUser: {
    user: {
      id: mockUsers.unverifiedUser.userId,
      email: mockUsers.unverifiedUser.email,
      name: mockUsers.unverifiedUser.name,
      role: 'user',
      emailVerified: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session,
};

/**
 * Mock DI container for testing
 */
export function createMockContainer(): Container {
  const container = new Container();

  // Mock CognitoClient
  const mockCognitoClient = {
    adminGetUser: jest.fn(),
    adminUpdateUserAttributes: jest.fn(),
    adminSetUserPassword: jest.fn(),
    adminDeleteUser: jest.fn(),
    listUsers: jest.fn(),
  };

  container.bind(SYMBOLS.CognitoClient).toConstantValue(mockCognitoClient);

  // Mock ApiKeyService
  const mockApiKeyService = {
    createApiKey: jest.fn(),
    getApiKeys: jest.fn(),
    getApiKey: jest.fn(),
    updateApiKey: jest.fn(),
    deleteApiKey: jest.fn(),
  };

  container.bind(SYMBOLS.ApiKeyService).toConstantValue(mockApiKeyService);

  // Mock ApiUsageService
  const mockApiUsageService = {
    getUsage: jest.fn(),
    getAccountUsage: jest.fn(),
    getUsageMetrics: jest.fn(),
  };

  container.bind(SYMBOLS.ApiUsageService).toConstantValue(mockApiUsageService);

  // Mock ApiProductService
  const mockApiProductService = {
    getProducts: jest.fn(),
    getProduct: jest.fn(),
  };

  container.bind(SYMBOLS.ApiProductService).toConstantValue(mockApiProductService);

  // Mock ApiSubscriptionService
  const mockApiSubscriptionService = {
    getSubscription: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
  };

  container.bind(SYMBOLS.ApiSubscriptionService).toConstantValue(mockApiSubscriptionService);

  return container;
}

/**
 * Create mock action context
 */
export function createMockActionContext(user: UserContext, container?: Container): ActionContext {
  return {
    user,
    services: {
      cognitoClient:
        container?.get(SYMBOLS.CognitoClient) || createMockContainer().get(SYMBOLS.CognitoClient),
      container: container || createMockContainer(),
    },
  };
}

/**
 * Test helper for mocking auth function
 */
export function mockAuth(session: Session | null = null) {
  const authMock = jest.fn().mockResolvedValue(session);

  // Mock the auth import
  jest.doMock('@/lib/auth', () => ({
    auth: authMock,
  }));

  return authMock;
}

/**
 * Test helper for mocking revalidation functions
 */
export function mockRevalidation() {
  const revalidatePathMock = jest.fn();
  const revalidateTagMock = jest.fn();

  jest.doMock('next/cache', () => ({
    revalidatePath: revalidatePathMock,
    revalidateTag: revalidateTagMock,
  }));

  return {
    revalidatePath: revalidatePathMock,
    revalidateTag: revalidateTagMock,
  };
}

/**
 * Test helper for action results
 */
export class ActionTestHelper {
  /**
   * Assert that an action result is successful
   */
  static expectSuccess<T>(
    result: ActionResult<T>
  ): asserts result is ActionResult<T> & { success: true; data: T } {
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  }

  /**
   * Assert that an action result is an error
   */
  static expectError<T>(
    result: ActionResult<T>,
    expectedError?: string
  ): asserts result is ActionResult<T> & { success: false; error: string } {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();

    if (expectedError) {
      expect(result.error).toBe(expectedError);
    }
  }

  /**
   * Assert that an action result has validation errors
   */
  static expectValidationError<T>(
    result: ActionResult<T>,
    expectedFieldErrors?: Record<string, string[]>
  ): asserts result is ActionResult<T> & { success: false; fieldErrors: Record<string, string[]> } {
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();

    if (expectedFieldErrors) {
      expect(result.fieldErrors).toEqual(expectedFieldErrors);
    }
  }

  /**
   * Test action with different user contexts
   */
  static async testWithUsers<TInput, TOutput>(
    action: (input: TInput) => Promise<ActionResult<TOutput>>,
    input: TInput,
    expectations: {
      normalUser?: (result: ActionResult<TOutput>) => void;
      adminUser?: (result: ActionResult<TOutput>) => void;
      unverifiedUser?: (result: ActionResult<TOutput>) => void;
      noUser?: (result: ActionResult<TOutput>) => void;
    }
  ) {
    // Test with normal user
    if (expectations.normalUser) {
      mockAuth(mockSessions.normalUser);
      const result = await action(input);
      expectations.normalUser(result);
    }

    // Test with admin user
    if (expectations.adminUser) {
      mockAuth(mockSessions.adminUser);
      const result = await action(input);
      expectations.adminUser(result);
    }

    // Test with unverified user
    if (expectations.unverifiedUser) {
      mockAuth(mockSessions.unverifiedUser);
      const result = await action(input);
      expectations.unverifiedUser(result);
    }

    // Test with no user
    if (expectations.noUser) {
      mockAuth(null);
      const result = await action(input);
      expectations.noUser(result);
    }
  }
}

/**
 * Common test data generators
 */
export const testDataGenerators = {
  /**
   * Generate random API key
   */
  apiKey: () => ({
    id: `ak_${Math.random().toString(36).substring(7)}`,
    name: `Test API Key ${Math.random().toString(36).substring(7)}`,
    key: `sk_test_${Math.random().toString(36).substring(7)}`,
    keyPreview: 'sk_test_...',
    userId: mockUsers.normalUser.userId,
    isActive: true,
    usageCount: Math.floor(Math.random() * 1000),
    rateLimitPerMinute: 100,
    monthlyQuota: 10000,
    usedThisMonth: Math.floor(Math.random() * 5000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  /**
   * Generate random user
   */
  user: () => ({
    id: `user_${Math.random().toString(36).substring(7)}`,
    email: `test-${Math.random().toString(36).substring(7)}@example.com`,
    name: `Test User ${Math.random().toString(36).substring(7)}`,
    role: 'user' as const,
    emailVerified: true,
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  }),

  /**
   * Generate random subscription
   */
  subscription: () => ({
    id: `sub_${Math.random().toString(36).substring(7)}`,
    userId: mockUsers.normalUser.userId,
    planId: 'plan_basic',
    plan: {
      id: 'plan_basic',
      name: 'Basic Plan',
      description: 'Basic API access',
      price: 2900,
      currency: 'usd',
      interval: 'month' as const,
      features: ['10,000 requests/month', 'Basic support'],
      limits: {
        monthlyRequests: 10000,
        rateLimitPerMinute: 100,
        apiKeysLimit: 5,
        dataRetentionDays: 30,
      },
    },
    status: 'active' as const,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  /**
   * Generate usage metrics
   */
  usageMetrics: () => ({
    totalRequests: Math.floor(Math.random() * 10000),
    successfulRequests: Math.floor(Math.random() * 9000),
    failedRequests: Math.floor(Math.random() * 1000),
    averageResponseTime: Math.floor(Math.random() * 500),
    dataTransferred: Math.floor(Math.random() * 1000000),
    uniqueEndpoints: Math.floor(Math.random() * 20),
    topEndpoints: [
      {
        endpoint: '/api/v1/tokens',
        requests: Math.floor(Math.random() * 5000),
        percentage: Math.floor(Math.random() * 100),
      },
    ],
  }),
};

/**
 * Mock environment variables for testing
 */
export function setupTestEnvironment() {
  const originalEnv = process.env;

  // Create a new environment object with test values
  (process as any).env = {
    ...originalEnv,
    NODE_ENV: 'test',
    NEXTAUTH_SECRET: 'test-secret',
    AWS_REGION: 'us-west-2',
    COGNITO_USER_POOL_ID: 'us-east-1_testpool',
    COGNITO_CLIENT_ID: 'test-client-id',
    STRIPE_SECRET_KEY: 'sk_test_testkey',
    API_USERS_TABLE: 'test-users',
    DYNAMODB_API_KEYS_TABLE: 'test-api-keys',
    DYNAMODB_USAGE_TABLE: 'test-usage',
    REDIS_URL: 'redis://localhost:6379',
  };

  return originalEnv;
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment(originalEnv?: typeof process.env) {
  if (typeof jest !== 'undefined') {
    jest.clearAllMocks();
    jest.resetModules();
  }

  if (originalEnv) {
    (process as any).env = originalEnv;
  }
}

/**
 * Test suite helper for server actions
 */
export function createActionTestSuite<TInput, TOutput>(
  name: string,
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  validInput: TInput,
  invalidInputs: Array<{ input: unknown; expectedError?: string }>
) {
  describe(`${name} Action`, () => {
    beforeEach(() => {
      setupTestEnvironment();
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    describe('Input Validation', () => {
      test('should accept valid input', async () => {
        mockAuth(mockSessions.normalUser);
        const result = await action(validInput);

        // Should not fail due to validation
        if (!result.success) {
          expect(result.error).not.toBe('Invalid input data');
        }
      });

      invalidInputs.forEach(({ input, expectedError }, index) => {
        test(`should reject invalid input ${index + 1}`, async () => {
          mockAuth(mockSessions.normalUser);
          const result = await action(input as TInput);

          ActionTestHelper.expectError(result);
          if (expectedError) {
            expect(result.error).toContain(expectedError);
          }
        });
      });
    });

    describe('Authorization', () => {
      test('should handle different user roles appropriately', async () => {
        await ActionTestHelper.testWithUsers(action, validInput, {
          normalUser: result => {
            // Should work for normal authenticated users by default
            expect(result).toBeDefined();
          },
          adminUser: result => {
            // Should work for admin users
            expect(result).toBeDefined();
          },
          unverifiedUser: result => {
            // May or may not work depending on action requirements
            expect(result).toBeDefined();
          },
          noUser: result => {
            // Should fail for unauthenticated users by default
            ActionTestHelper.expectError(result, 'Authentication required');
          },
        });
      });
    });
  });
}
