import 'reflect-metadata';

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  ApiAccountService,
  ApiAccountServiceSideEffects,
  ApiProductService,
  ApiSubscriptionService,
  AuthorizationService,
  BlockedDomainService,
  BucketRateLimiter,
  CognitoClient,
  StripeEventService,
  UsageLimitCacheService,
  VerifyMailService,
  WebhookTaskQueueClient,
  WebhookTaskQueueService,
} from '@company-z/api-management-library';

import { RedisCacheService } from '@company-z/crypto-data';
import {
  db,
  DynamoApiUserService,
  DynamoMetricsService,
  DynamoUsageLimitService,
  MetricsCacheService,
  ApiUserStatus,
  Plan,
} from '@company-z/crypto-data';
import { Container } from 'inversify';
import Stripe from 'stripe';

import { SYMBOLS } from './symbols';
import { ApiUsageService } from '../lib/services/api-usage-service';
import { ApiKeyService } from '../lib/services/api-key-service';

/**
 * Main dependency injection container for the dashboard application.
 *
 * This container mirrors the server-side container configuration but is adapted
 * for the dashboard environment with proper environment variable handling
 * and Next.js specific considerations.
 */
export const container = new Container({ defaultScope: 'Singleton' });

/**
 * Environment variable helper with validation
 */
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * AWS Cognito Client Configuration
 */
function createCognitoClient(): CognitoClient {
  const cognitoClient = new CognitoClient(
    new CognitoIdentityProviderClient({
      region: getEnvVar('AWS_REGION', 'us-east-1'),
    }),
    getEnvVar('COGNITO_USER_POOL_ID')
  );

  container.bind(SYMBOLS.CognitoClient).toConstantValue(cognitoClient);
  return cognitoClient;
}

/**
 * Stripe Client Configuration
 */
function createStripeClient(): Stripe {
  const stripeClient = new Stripe(getEnvVar('STRIPE_SECRET_KEY'), {
    apiVersion: '2022-11-15',
    maxNetworkRetries: 5,
  });

  return stripeClient;
}

/**
 * Cache Services Configuration
 */
function createCacheServices() {
  const redisUrl = getEnvVar('REDIS_URL', 'redis://localhost:6379');
  const metricsRedisUrl = getEnvVar('METRICS_REDIS_URL', redisUrl);
  const apiAuthRedisUrl = getEnvVar('API_AUTHORIZATION_REDIS_URL', redisUrl);

  const usageLimitCacheService = new UsageLimitCacheService(redisUrl);
  const apiManagementRedisCacheService = new RedisCacheService(redisUrl);
  const metricsCacheService = new MetricsCacheService(metricsRedisUrl, 60 * 60 * 24 * 3);

  container.bind(SYMBOLS.MetricsCacheService).toConstantValue(metricsCacheService);

  return {
    usageLimitCacheService,
    apiManagementRedisCacheService,
    metricsCacheService,
  };
}

/**
 * Database Services Configuration
 */
function createDatabaseServices() {
  const apiUserService = new DynamoApiUserService(
    db,
    getEnvVar('API_USERS_TABLE', 'crypto-dashboard-users')
  );

  const apiMgmtUserService = new DynamoApiUserService(
    db as any, // Type compatibility issue with @company-z library
    getEnvVar('API_USERS_TABLE', 'crypto-dashboard-users')
  );

  const metricsService = new DynamoMetricsService(
    db,
    getEnvVar('METRICS_TABLE', 'crypto-metrics-staging')
  );

  const usageLimitService = new DynamoUsageLimitService(
    db,
    getEnvVar('USAGE_LIMITS_TABLE', 'crypto-dashboard-usage-limits')
  );

  const apiMgmtUsageLimitService = new DynamoUsageLimitService(
    db,
    getEnvVar('USAGE_LIMITS_TABLE', 'crypto-dashboard-usage-limits')
  );

  container.bind(SYMBOLS.ApiUserService).toConstantValue(apiUserService);
  container.bind(SYMBOLS.UsageLimitService).toConstantValue(usageLimitService);

  return {
    apiUserService,
    apiMgmtUserService,
    metricsService,
    usageLimitService,
    apiMgmtUsageLimitService,
  };
}

/**
 * Create Resend client if API key is available
 * Note: Resend is optional dependency, gracefully handle if not available
 */
function createResendClient(): any {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('Resend API key not configured, email features will be limited');
    return null;
  }

  try {
    // Dynamic import of Resend since it's an optional dependency
    const { Resend } = require('resend');
    return new Resend(resendApiKey);
  } catch (error) {
    console.warn('Resend package not available, email features will be limited');
    return null;
  }
}

/**
 * Create API Key Service for the dashboard
 */
function createApiKeyService(
  cognitoClient: CognitoClient,
  apiUserService: DynamoApiUserService,
  usageLimitService: DynamoUsageLimitService
): ApiKeyService {
  const apiKeyService = new ApiKeyService(
    cognitoClient,
    apiUserService,
    usageLimitService
  );

  container.bind(SYMBOLS.ApiKeyService).toConstantValue(apiKeyService);
  return apiKeyService;
}

/**
 * Create API Usage Service for real usage analytics
 */
function createApiUsageService(
  metricsService: DynamoMetricsService,
  apiUserService: DynamoApiUserService,
  usageLimitService: DynamoUsageLimitService,
  cognitoClient: CognitoClient
): ApiUsageService {
  const apiUsageService = new ApiUsageService(
    metricsService,
    apiUserService,
    usageLimitService,
    cognitoClient
  );

  container.bind(SYMBOLS.ApiUsageService).toConstantValue(apiUsageService);
  return apiUsageService;
}

/**
 * Initialize the dependency injection container
 */
export function initializeContainer(): Container {
  try {
    // Create core clients
    const cognitoClient = createCognitoClient();
    const stripeClient = createStripeClient();

    // Create cache services
    const cacheServices = createCacheServices();

    // Create database services
    const dbServices = createDatabaseServices();

    // Create webhook service
    const webhookTaskQueueClient = new WebhookTaskQueueClient(
      new WebhookTaskQueueService(
        getEnvVar('WEBHOOK_TASK_QUEUE_REGION', 'us-east-1'),
        getEnvVar('WEBHOOK_TASK_QUEUE_URL', '')
      )
    );

    // Create authorization service
    const authorizationService = new AuthorizationService(
      getEnvVar('API_USERS_TABLE', 'crypto-dashboard-users'),
      getEnvVar('REDIS_URL', 'redis://localhost:6379'),
      getEnvVar('API_AUTHORIZATION_REDIS_URL', 'redis://localhost:6379'),
      getEnvVar('API_USER_TOKEN_TABLE', 'crypto-dashboard-api-tokens')
    );

    // Create rate limiter
    const bucketRateLimiter = new BucketRateLimiter(
      dbServices.apiMgmtUsageLimitService,
      cacheServices.usageLimitCacheService
    );

    // Create BlockedDomainService (constant value, not factory)
    const blockedDomainService = new BlockedDomainService(cacheServices.apiManagementRedisCacheService);
    container.bind(SYMBOLS.BlockedDomainService).toConstantValue(blockedDomainService);

    // Create VerifyMailService if API key is available
    const verifyMailApiKey = process.env.VERIFY_MAIL_API_KEY;
    if (verifyMailApiKey) {
      const verifyMailService = new VerifyMailService(verifyMailApiKey);
      container.bind(SYMBOLS.VerifyMailService).toConstantValue(verifyMailService);
    } else {
      console.warn('VerifyMail API key not configured, email verification will be skipped');
    }

    // Create API Key Service
    const apiKeyService = createApiKeyService(
      cognitoClient,
      dbServices.apiUserService,
      dbServices.usageLimitService
    );

    // Create API Usage Service
    const apiUsageService = createApiUsageService(
      dbServices.metricsService,
      dbServices.apiUserService,
      dbServices.usageLimitService,
      cognitoClient
    );

    // Bind core services
    container.bind(SYMBOLS.ApiProductService).toFactory(() => () => {
      return new ApiProductService(stripeClient);
    });

    container.bind(SYMBOLS.ApiSubscriptionService).toFactory(() => () => {
      return new ApiSubscriptionService(cognitoClient, stripeClient);
    });

    container.bind(SYMBOLS.StripeEventService).toFactory(() => () => {
      const resendClient = createResendClient();

      return new StripeEventService(stripeClient, new ApiAccountService(
        cognitoClient,
        new ApiAccountServiceSideEffects(
          webhookTaskQueueClient,
          dbServices.apiMgmtUserService,
          dbServices.apiMgmtUsageLimitService,
          bucketRateLimiter,
          authorizationService,
          cacheServices.metricsCacheService,
          cacheServices.apiManagementRedisCacheService,
          resendClient as any // Type assertion since Resend is optional
        )
      ));
    });

    console.log('✅ Dashboard DI container initialized successfully');
    return container;
  } catch (error) {
    console.error('❌ Failed to initialize DI container:', error);
    throw error;
  }
}

/**
 * Get the initialized container instance
 */
export function getContainer(): Container {
  if (container.isBound(SYMBOLS.CognitoClient)) {
    return container;
  }

  return initializeContainer();
}

/**
 * Helper function to get a service from the container with type safety
 */
export function getService<T>(symbol: symbol): T {
  const serviceContainer = getContainer();
  return serviceContainer.get<T>(symbol);
}

/**
 * Helper function to check if a service is bound in the container
 */
export function isServiceBound(symbol: symbol): boolean {
  const serviceContainer = getContainer();
  return serviceContainer.isBound(symbol);
}