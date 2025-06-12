import { z } from 'zod';

/**
 * Common Types
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * API Key Types
 */
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  keyPreview: string; // First 8 chars + "..."
  userId: string;
  isActive: boolean;
  usageCount: number;
  rateLimitPerMinute: number;
  monthlyQuota: number;
  usedThisMonth: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  allowedDomains: string[];
}

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(50, 'Name must be less than 50 characters'),
  rateLimitPerMinute: z.number().min(1).max(1000).default(100),
  monthlyQuota: z.number().min(1).max(1000000).default(10000),
  expiresAt: z.date().optional(),
});

export const updateApiKeySchema = z.object({
  id: z.string().min(1, 'API key ID is required'),
  name: z.string().min(1, 'API key name is required').max(50, 'Name must be less than 50 characters').optional(),
  isActive: z.boolean().optional(),
  rateLimitPerMinute: z.number().min(1).max(1000).optional(),
  monthlyQuota: z.number().min(1).max(1000000).optional(),
  expiresAt: z.date().optional(),
});

export const deleteApiKeySchema = z.object({
  id: z.string().min(1, 'API key ID is required'),
});

export const getApiKeysSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type DeleteApiKeyInput = z.infer<typeof deleteApiKeySchema>;
export type GetApiKeysInput = z.infer<typeof getApiKeysSchema>;

/**
 * Usage & Analytics Types
 */
export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  dataTransferred: number; // bytes
  uniqueEndpoints: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    percentage: number;
  }>;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  requests: number;
  successRate: number;
  averageResponseTime: number;
  errors: number;
}

export interface UsageReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: UsageMetrics;
  dailyUsage: DailyUsage[];
  apiKeyBreakdown: Array<{
    apiKeyId: string;
    apiKeyName: string;
    requests: number;
    percentage: number;
  }>;
}

export const getUsageSchema = z.object({
  apiKeyId: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

export const getAccountUsageSchema = z.object({
  period: z.enum(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth']).default('last30days'),
});

export type GetUsageInput = z.infer<typeof getUsageSchema>;
export type GetAccountUsageInput = z.infer<typeof getAccountUsageSchema>;

/**
 * Billing & Subscription Types
 */
export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  price: number; // cents
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    monthlyRequests: number;
    rateLimitPerMinute: number;
    apiKeysLimit: number;
    dataRetentionDays: number;
  };
  isPopular?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: BillingPlan;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  dueDate: Date;
  paidAt?: Date;
  invoiceUrl?: string;
  createdAt: Date;
}

export const createCheckoutSessionSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  returnUrl: z.string().url('Valid URL is required'),
});

export const createBillingSessionSchema = z.object({
  returnUrl: z.string().url('Valid URL is required'),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CreateBillingSessionInput = z.infer<typeof createBillingSessionSchema>;

/**
 * User Management Types
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      browser: boolean;
      security: boolean;
      billing: boolean;
    };
  };
}

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters').optional(),
  avatar: z.string().url('Valid avatar URL is required').optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      browser: z.boolean().optional(),
      security: z.boolean().optional(),
      billing: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Admin Types
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  subscription?: {
    planName: string;
    status: string;
    currentPeriodEnd: Date;
  };
  usage: {
    totalRequests: number;
    thisMonthRequests: number;
    apiKeysCount: number;
  };
}

export const getAdminUsersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateUserStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  isActive: z.boolean(),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['user', 'admin']),
});

export const getUserDetailsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type GetAdminUsersInput = z.infer<typeof getAdminUsersSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type GetUserDetailsInput = z.infer<typeof getUserDetailsSchema>;

/**
 * System & Configuration Types
 */
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalApiKeys: number;
  totalRequestsToday: number;
  totalRequestsThisMonth: number;
  averageResponseTime: number;
  errorRate: number;
  topUsers: Array<{
    userId: string;
    email: string;
    requestsToday: number;
  }>;
}

export interface UsageLimit {
  id: string;
  userId: string;
  type: 'requests_per_minute' | 'requests_per_month' | 'data_transfer_per_month';
  limit: number;
  used: number;
  resetDate?: Date;
  isExceeded: boolean;
}

export const updateUsageLimitSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limits: z.array(z.object({
    type: z.enum(['requests_per_minute', 'requests_per_month', 'data_transfer_per_month']),
    limit: z.number().min(0),
  })),
});

export type UpdateUsageLimitInput = z.infer<typeof updateUsageLimitSchema>;

/**
 * Webhook & Event Types
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
}

export const handleWebhookSchema = z.object({
  type: z.string().min(1, 'Event type is required'),
  data: z.record(z.unknown()),
});

export type HandleWebhookInput = z.infer<typeof handleWebhookSchema>;