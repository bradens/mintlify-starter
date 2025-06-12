import { z } from 'zod';

/**
 * Schema for validating environment variables
 * Separates required from optional variables
 */
const environmentSchema = z.object({
  // Next.js Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // NextAuth Configuration (Required)
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // AWS Cognito Configuration (Required for auth)
  AWS_REGION: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_CLIENT_SECRET: z.string().min(1),
  COGNITO_ISSUER: z.string().url(),

  // DynamoDB Configuration (Required for data persistence)
  API_USERS_TABLE: z.string(),
  USAGE_LIMITS_TABLE: z.string(),

  // Stripe Configuration (Required for billing)
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Optional Variables with defaults
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),

  CORS_ORIGIN: z.string().optional(),
  API_KEY_ENCRYPTION_SECRET: z.string().min(32).optional(),
  SESSION_COOKIE_SECRET: z.string().min(32).optional(),

  ENABLE_DEV_TOOLS: z.string().default('true'),
  MOCK_EXTERNAL_APIS: z.string().default('false'),
  DEBUG_MODE: z.string().default('false'),
});

/**
 * Type for validated environment variables
 */
export type ValidatedEnv = z.infer<typeof environmentSchema>;

/**
 * Validates environment variables and returns typed object
 * Throws descriptive error if validation fails
 */
export function validateEnvironment(): ValidatedEnv {
  try {
    const env = environmentSchema.parse(process.env);

    // Additional validation for development environment
    if (env.NODE_ENV === 'development') {
      console.warn('✅ Environment variables validated successfully');

      // Warn about missing optional variables in development
      const warnings = [];
      if (!env.RESEND_API_KEY) {
        warnings.push('RESEND_API_KEY (email notifications disabled)');
      }
      if (!env.API_KEY_ENCRYPTION_SECRET) {
        warnings.push('API_KEY_ENCRYPTION_SECRET (using fallback)');
      }
      if (!env.SESSION_COOKIE_SECRET) {
        warnings.push('SESSION_COOKIE_SECRET (using fallback)');
      }

      if (warnings.length > 0) {
        console.warn('⚠️  Optional environment variables missing:');
        warnings.forEach(warning => console.warn(`   • ${warning}`));
      }
    }

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        const path = err.path.join('.');
        console.error(`   • ${path}: ${err.message}`);
      });

      console.error('\n📚 Please check ENVIRONMENT_SETUP.md for configuration details');
      throw new Error('Environment validation failed');
    }

    throw error;
  }
}

/**
 * Helper function to check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Helper function to check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Helper function to check if we're in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Helper function to check if we're building
 */
export function isBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Gets a typed environment variable with runtime validation
 */
export function getEnvVar<K extends keyof ValidatedEnv>(
  key: K,
  fallback?: ValidatedEnv[K]
): ValidatedEnv[K] {
  const value = process.env[key] as ValidatedEnv[K];

  if (value === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }

  return value;
}

/**
 * Validates that required secrets are properly set in production
 */
export function validateProductionSecrets(): void {
  if (!isProduction()) {
    return;
  }

  const requiredSecrets = ['NEXTAUTH_SECRET', 'API_KEY_ENCRYPTION_SECRET', 'SESSION_COOKIE_SECRET'];

  const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);

  if (missingSecrets.length > 0) {
    console.error('❌ Production deployment blocked - missing required secrets:');
    missingSecrets.forEach(secret => {
      console.error(`   • ${secret}`);
    });
    throw new Error('Missing required secrets');
  }
}

// Validate environment on module load (except in test or build)
if (!isTest() && !isBuild()) {
  validateEnvironment();
  validateProductionSecrets();
}
