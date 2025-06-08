import { CognitoClient } from '@company-z/api-management-library';
import { z } from 'zod';

import { getContainer, getService } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';
import { auth } from '@/lib/auth';

/**
 * Base result type for all server actions
 */
export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Success result helper
 */
export function createSuccessResult<T>(data?: T): ActionResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Error result helper
 */
export function createErrorResult(
  error: string,
  fieldErrors?: Record<string, string[]>
): ActionResult {
  return {
    success: false,
    error,
    fieldErrors,
  };
}

/**
 * User context interface
 */
export interface UserContext {
  userId: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  isVerified: boolean;
}

/**
 * Action context interface containing user info and services
 */
export interface ActionContext {
  user: UserContext;
  services: {
    cognitoClient: CognitoClient;
    container: ReturnType<typeof getContainer>;
  };
}

/**
 * Authorization levels for actions
 */
export enum AuthLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  VERIFIED = 'verified',
  ADMIN = 'admin',
}

/**
 * Action configuration
 */
export interface ActionConfig {
  authLevel: AuthLevel;
  rateLimit?: {
    max: number;
    windowMs: number;
  };
  revalidate?: {
    paths?: string[];
    tags?: string[];
  };
}

/**
 * Action handler function type
 */
export type ActionHandler<TInput, TOutput> = (
  input: TInput,
  context: ActionContext
) => Promise<ActionResult<TOutput>>;

/**
 * Public action handler function type (no auth required)
 */
export type PublicActionHandler<TInput, TOutput> = (
  input: TInput
) => Promise<ActionResult<TOutput>>;

/**
 * Get user context from session
 */
async function getUserContext(): Promise<UserContext | null> {
  try {
    const session = await auth();

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email!,
      name: session.user.name || undefined,
      isAdmin: session.user.role === 'admin',
      isVerified: session.user.emailVerified !== null,
    };
  } catch (error) {
    console.error('Failed to get user context:', error);
    return null;
  }
}

/**
 * Create action context with DI services
 */
async function createActionContext(user: UserContext): Promise<ActionContext> {
  const container = getContainer();
  const cognitoClient = getService<CognitoClient>(SYMBOLS.CognitoClient);

  return {
    user,
    services: {
      cognitoClient,
      container,
    },
  };
}

/**
 * Validate authorization level
 */
function validateAuthLevel(user: UserContext | null, authLevel: AuthLevel): boolean {
  switch (authLevel) {
    case AuthLevel.PUBLIC:
      return true;
    case AuthLevel.AUTHENTICATED:
      return user !== null;
    case AuthLevel.VERIFIED:
      return user !== null && user.isVerified;
    case AuthLevel.ADMIN:
      return user !== null && user.isAdmin;
    default:
      return false;
  }
}

/**
 * Handle action revalidation
 */
async function handleRevalidation(config: ActionConfig): Promise<void> {
  if (config.revalidate?.paths || config.revalidate?.tags) {
    const { revalidatePath, revalidateTag } = await import('next/cache');

    if (config.revalidate?.paths) {
      config.revalidate.paths.forEach(path => revalidatePath(path));
    }

    if (config.revalidate?.tags) {
      config.revalidate.tags.forEach(tag => revalidateTag(tag));
    }
  }
}

/**
 * Create a server action with authentication and DI integration
 */
export function createAction<TInput, TOutput>(
  config: ActionConfig,
  schema: z.ZodSchema<TInput>,
  handler: ActionHandler<TInput, TOutput>
) {
  return async (input: unknown): Promise<ActionResult<TOutput>> => {
    try {
      // Validate input schema
      const validationResult = schema.safeParse(input);
      if (!validationResult.success) {
        const fieldErrors: Record<string, string[]> = {};
        validationResult.error.errors.forEach(error => {
          const path = error.path.join('.');
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(error.message);
        });

        return createErrorResult('Invalid input data', fieldErrors) as ActionResult<TOutput>;
      }

      // Get user context
      const user = await getUserContext();

      // Check authorization
      if (!validateAuthLevel(user, config.authLevel)) {
        if (config.authLevel === AuthLevel.AUTHENTICATED && !user) {
          return createErrorResult('Authentication required') as ActionResult<TOutput>;
        }
        if (config.authLevel === AuthLevel.VERIFIED && user && !user.isVerified) {
          return createErrorResult('Email verification required') as ActionResult<TOutput>;
        }
        if (config.authLevel === AuthLevel.ADMIN && user && !user.isAdmin) {
          return createErrorResult('Admin access required') as ActionResult<TOutput>;
        }
        return createErrorResult('Unauthorized') as ActionResult<TOutput>;
      }

      // Create action context (only if authenticated)
      const context = user ? await createActionContext(user) : null;

      // Execute handler
      const result = await handler(validationResult.data, context!);

      // Handle revalidation if successful
      if (result.success) {
        await handleRevalidation(config);
      }

      return result;
    } catch (error) {
      console.error('Action execution error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          return createErrorResult(
            'Too many requests. Please try again later.'
          ) as ActionResult<TOutput>;
        }
        if (error.message.includes('Network')) {
          return createErrorResult(
            'Network error. Please check your connection.'
          ) as ActionResult<TOutput>;
        }
      }

      return createErrorResult(
        'An unexpected error occurred. Please try again.'
      ) as ActionResult<TOutput>;
    }
  };
}

/**
 * Create a public server action (no authentication required)
 */
export function createPublicAction<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: PublicActionHandler<TInput, TOutput>,
  revalidate?: { paths?: string[]; tags?: string[] }
) {
  return async (input: unknown): Promise<ActionResult<TOutput>> => {
    try {
      // Validate input schema
      const validationResult = schema.safeParse(input);
      if (!validationResult.success) {
        const fieldErrors: Record<string, string[]> = {};
        validationResult.error.errors.forEach(error => {
          const path = error.path.join('.');
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(error.message);
        });

        return createErrorResult('Invalid input data', fieldErrors) as ActionResult<TOutput>;
      }

      // Execute handler
      const result = await handler(validationResult.data);

      // Handle revalidation if successful
      if (result.success && revalidate) {
        const { revalidatePath, revalidateTag } = await import('next/cache');

        if (revalidate.paths) {
          revalidate.paths.forEach(path => revalidatePath(path));
        }
        if (revalidate.tags) {
          revalidate.tags.forEach(tag => revalidateTag(tag));
        }
      }

      return result;
    } catch (error) {
      console.error('Public action execution error:', error);
      return createErrorResult(
        'An unexpected error occurred. Please try again.'
      ) as ActionResult<TOutput>;
    }
  };
}

/**
 * Rate limiting utility (placeholder for future implementation)
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  // TODO: Implement actual rate limiting logic
  // This could use Redis or in-memory cache
  console.warn('Rate limiting not yet implemented for:', action);
  return true;
}

/**
 * Logger utility for actions
 */
export function logAction(
  action: string,
  userId?: string,
  metadata?: Record<string, unknown>
): void {
  console.log(`[ACTION] ${action}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }),
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
  }),
};

/**
 * Simple wrapper for actions that don't need complex schema validation
 * This provides a simplified interface for quick action implementation
 */
export async function baseAction<T>(
  handler: () => Promise<T>,
  errorMessage: string = 'Action failed'
): Promise<ActionResult<T>> {
  try {
    const data = await handler();
    return createSuccessResult(data);
  } catch (error) {
    console.error('BaseAction error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return createErrorResult(error.message);
    }

    return createErrorResult(errorMessage);
  }
}
