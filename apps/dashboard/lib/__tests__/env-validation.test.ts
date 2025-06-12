// Set up environment before importing the module to prevent auto-validation
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'a-very-long-secret-that-is-at-least-32-characters-long';
process.env.AWS_REGION = 'us-east-1';
process.env.COGNITO_USER_POOL_ID = 'us-east-1_XXXXXXXXX';
process.env.COGNITO_CLIENT_ID = 'test-client-id';
process.env.COGNITO_CLIENT_SECRET = 'test-client-secret';
process.env.COGNITO_ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

import {
  validateEnvironment,
  isDevelopment,
  isProduction,
  isTest,
  getEnvVar,
} from '@/lib/env-validation';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Environment Validation', () => {
  const validEnvVars = {
    NODE_ENV: 'test',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: 'a-very-long-secret-that-is-at-least-32-characters-long',
    AWS_REGION: 'us-west-2',
    COGNITO_USER_POOL_ID: 'us-east-1_XXXXXXXXX',
    COGNITO_CLIENT_ID: 'test-client-id',
    COGNITO_CLIENT_SECRET: 'test-client-secret',
    COGNITO_ISSUER: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
  };

  // Mock process.exit for the entire test suite
  let mockExit: jest.SpyInstance;

  beforeAll(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  beforeEach(() => {
    // Clear all env vars
    Object.keys(process.env).forEach(key => {
      if (
        key.startsWith('NODE_ENV') ||
        key.startsWith('NEXT_PUBLIC_') ||
        key.startsWith('NEXTAUTH_') ||
        key.startsWith('AWS_') ||
        key.startsWith('COGNITO_') ||
        key.startsWith('STRIPE_') ||
        key.startsWith('COMPANY_Z_')
      ) {
        delete process.env[key];
      }
    });
  });

  describe('Environment Detection Functions', () => {
    it('should detect development environment', () => {
      (process.env as any).NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      (process.env as any).NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      (process.env as any).NODE_ENV = 'test';
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });

  describe('getEnvVar Function', () => {
    it('should return environment variable value', () => {
      (process.env as any).NODE_ENV = 'test';
      expect(getEnvVar('NODE_ENV')).toBe('test');
    });

    it('should return fallback value for undefined variable', () => {
      delete (process.env as any).NODE_ENV;
      expect(getEnvVar('NODE_ENV', 'fallback' as any)).toBe('fallback');
    });

    it('should throw error for required variable without fallback', () => {
      delete (process.env as any).NODE_ENV;
      expect(() => getEnvVar('NODE_ENV')).toThrow(
        'Environment variable NODE_ENV is required but not set'
      );
    });
  });

  describe('URL Validation', () => {
    it('should accept valid URLs', () => {
      const env = {
        ...validEnvVars,
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        NEXTAUTH_URL: 'https://example.com',
        COGNITO_ISSUER: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX',
      };

      Object.assign(process.env, env);

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      const env = {
        ...validEnvVars,
        NEXT_PUBLIC_APP_URL: 'not-a-url',
      };

      Object.assign(process.env, env);

      expect(() => validateEnvironment()).toThrow('process.exit called');
    });
  });

  describe('Secret Validation', () => {
    it('should accept secrets with minimum length', () => {
      const env = {
        ...validEnvVars,
        NEXTAUTH_SECRET: 'a'.repeat(32), // Exactly 32 characters
      };

      Object.assign(process.env, env);

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject secrets that are too short', () => {
      const env = {
        ...validEnvVars,
        NEXTAUTH_SECRET: 'too-short', // Less than 32 characters
      };

      Object.assign(process.env, env);

      expect(() => validateEnvironment()).toThrow('process.exit called');
    });
  });

  describe('Stripe Key Validation', () => {
    it('should accept valid Stripe keys', () => {
      const env = {
        ...validEnvVars,
        STRIPE_PUBLISHABLE_KEY: 'pk_test_valid_key',
        STRIPE_SECRET_KEY: 'sk_test_valid_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_valid_secret',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_valid_key',
      };

      Object.assign(process.env, env);

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should reject invalid Stripe key formats', () => {
      const env = {
        ...validEnvVars,
        STRIPE_PUBLISHABLE_KEY: 'invalid_key_format',
      };

      Object.assign(process.env, env);

      expect(() => validateEnvironment()).toThrow('process.exit called');
    });
  });

  describe('Missing Required Variables', () => {
    it('should fail validation when required variables are missing', () => {
      // Only set some required variables, missing others
      (process.env as any).NODE_ENV = 'test';
      (process.env as any).NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      // Missing NEXTAUTH_URL and other required vars

      expect(() => validateEnvironment()).toThrow('process.exit called');
    });
  });

  describe('Default Values', () => {
    it('should apply default values for optional variables', () => {
      Object.assign(process.env, validEnvVars);
      const env = validateEnvironment();
    });
  });
});
