import { unstable_cache as cache, revalidateTag } from 'next/cache';

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for selective invalidation
  revalidate?: number; // Next.js revalidation time
  staleWhileRevalidate?: boolean; // Enable stale-while-revalidate pattern
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_PREFIXES = {
  USER: 'user',
  API_KEY: 'api-key',
  API_KEYS: 'api-keys',
  USAGE: 'usage',
  SUBSCRIPTION: 'subscription',
  BILLING: 'billing',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

/**
 * Cache tags for selective invalidation
 */
export const CACHE_TAGS = {
  // User-related
  USER_PROFILE: (userId: string) => `user-profile-${userId}`,
  USER_PREFERENCES: (userId: string) => `user-preferences-${userId}`,

  // API Keys
  API_KEYS: (userId: string) => `api-keys-${userId}`,
  API_KEY: (keyId: string) => `api-key-${keyId}`,

  // Usage and metrics
  USAGE_METRICS: (userId: string, period: string) => `usage-metrics-${userId}-${period}`,
  ACCOUNT_USAGE: (userId: string) => `account-usage-${userId}`,
  USAGE_LIMITS: (userId: string) => `usage-limits-${userId}`,

  // Billing and subscriptions
  SUBSCRIPTION: (userId: string) => `subscription-${userId}`,
  BILLING_PLANS: 'billing-plans',
  PAYMENT_METHODS: (userId: string) => `payment-methods-${userId}`,
  INVOICES: (userId: string) => `invoices-${userId}`,

  // Admin
  ADMIN_USERS: 'admin-users',
  ADMIN_STATS: 'admin-stats',
  SYSTEM_STATS: 'system-stats',

  // Core entities
  USAGE: (userId: string) => `usage-${userId}`,
  BILLING: 'billing',
} as const;

/**
 * Default cache configurations for different data types
 */
export const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Frequently changing data - short TTL
  usage: {
    ttl: 300, // 5 minutes
    revalidate: 300,
  },

  // User data - medium TTL
  user: {
    ttl: 1800, // 30 minutes
    revalidate: 1800,
  },

  // API keys - medium TTL (security-sensitive)
  apiKeys: {
    ttl: 900, // 15 minutes
    revalidate: 900,
  },

  // Billing data - longer TTL
  billing: {
    ttl: 3600, // 1 hour
    revalidate: 3600,
  },

  // System config - very long TTL
  system: {
    ttl: 86400, // 24 hours
    revalidate: 86400,
  },
};

/**
 * Create a cached function with automatic key generation
 */
export function createCachedFunction<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyGenerator: (...args: TArgs) => string,
  config: CacheConfig = {}
) {
  return cache(
    fn,
    undefined, // Let Next.js generate the key
    {
      revalidate: config.revalidate || 3600,
      tags: config.tags || [],
    }
  );
}

/**
 * Cache utility class for server actions
 */
export class ActionCache {
  /**
   * Cache user profile data
   */
  static async cacheUserProfile<T>(
    userId: string,
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.user, ...customConfig };
    const cacheKey = `${CACHE_PREFIXES.USER}-profile-${userId}`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.USER_PROFILE(userId), ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache API keys for a user
   */
  static async cacheApiKeys<T>(
    userId: string,
    filters: Record<string, unknown>,
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.apiKeys, ...customConfig };
    const filterKey = JSON.stringify(filters);
    const cacheKey = `${CACHE_PREFIXES.API_KEYS}-${userId}-${Buffer.from(filterKey).toString('base64')}`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.API_KEYS(userId), ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache individual API key
   */
  static async cacheApiKey<T>(
    keyId: string,
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.apiKeys, ...customConfig };
    const cacheKey = `${CACHE_PREFIXES.API_KEY}-${keyId}`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.API_KEY(keyId), ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache usage metrics
   */
  static async cacheUsageMetrics<T>(
    userId: string,
    period: string,
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.usage, ...customConfig };
    const cacheKey = `${CACHE_PREFIXES.USAGE}-metrics-${userId}-${period}`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.USAGE_METRICS(userId, period), ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache subscription data
   */
  static async cacheSubscription<T>(
    userId: string,
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.billing, ...customConfig };
    const cacheKey = `${CACHE_PREFIXES.SUBSCRIPTION}-${userId}`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.SUBSCRIPTION(userId), ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache billing plans (shared across users)
   */
  static async cacheBillingPlans<T>(
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.billing, ...customConfig };
    const cacheKey = `${CACHE_PREFIXES.BILLING}-plans`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.BILLING_PLANS, ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache admin users list
   */
  static async cacheAdminUsers<T>(
    filters: Record<string, unknown>,
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.user, ...customConfig };
    const filterKey = JSON.stringify(filters);
    const cacheKey = `${CACHE_PREFIXES.ADMIN}-users-${Buffer.from(filterKey).toString('base64')}`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.ADMIN_USERS, ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache system statistics
   */
  static async cacheSystemStats<T>(
    fetcher: () => Promise<T>,
    customConfig?: Partial<CacheConfig>
  ): Promise<T> {
    const config = { ...CACHE_CONFIGS.system, ...customConfig };
    const cacheKey = `${CACHE_PREFIXES.SYSTEM}-stats`;

    const cachedFetcher = cache(fetcher, [cacheKey], {
      revalidate: config.revalidate,
      tags: [CACHE_TAGS.SYSTEM_STATS, ...(config.tags || [])],
    });

    return await cachedFetcher();
  }

  /**
   * Cache billing plans data
   */
  static async cachePlans<T>(fetcher: () => Promise<T>, config: CacheConfig = {}): Promise<T> {
    const cacheKey = `${CACHE_PREFIXES.BILLING}-plans`;

    return cache(fetcher, [cacheKey], {
      revalidate: config.revalidate || 3600,
      tags: [CACHE_TAGS.BILLING, ...(config.tags || [])],
    })();
  }

  /**
   * Cache billing history data
   */
  static async cacheBillingHistory<T>(
    userId: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const cacheKey = `${CACHE_PREFIXES.BILLING}-history-${userId}`;

    return cache(fetcher, [cacheKey], {
      revalidate: config.revalidate || 300,
      tags: [CACHE_TAGS.BILLING, CACHE_TAGS.SUBSCRIPTION(userId), ...(config.tags || [])],
    })();
  }

  /**
   * Cache payment methods data
   */
  static async cachePaymentMethods<T>(
    userId: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const cacheKey = `${CACHE_PREFIXES.BILLING}-payment-methods-${userId}`;

    return cache(fetcher, [cacheKey], {
      revalidate: config.revalidate || 600,
      tags: [CACHE_TAGS.BILLING, CACHE_TAGS.SUBSCRIPTION(userId), ...(config.tags || [])],
    })();
  }

  /**
   * Cache billing usage data
   */
  static async cacheBillingUsage<T>(
    userId: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const cacheKey = `${CACHE_PREFIXES.BILLING}-usage-${userId}`;

    return cache(fetcher, [cacheKey], {
      revalidate: config.revalidate || 300,
      tags: [
        CACHE_TAGS.BILLING,
        CACHE_TAGS.SUBSCRIPTION(userId),
        CACHE_TAGS.USAGE(userId),
        ...(config.tags || []),
      ],
    })();
  }
}

/**
 * Cache invalidation utility
 */
export class CacheInvalidator {
  /**
   * Invalidate user-related caches
   */
  static async invalidateUser(userId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.USER_PROFILE(userId),
      CACHE_TAGS.USER_PREFERENCES(userId),
      CACHE_TAGS.API_KEYS(userId),
      CACHE_TAGS.ACCOUNT_USAGE(userId),
      CACHE_TAGS.SUBSCRIPTION(userId),
      CACHE_TAGS.PAYMENT_METHODS(userId),
      CACHE_TAGS.INVOICES(userId),
      CACHE_TAGS.USAGE_LIMITS(userId),
    ];

    await Promise.all(tags.map(tag => revalidateTag(tag)));
  }

  /**
   * Invalidate API key related caches
   */
  static async invalidateApiKey(keyId: string, userId?: string): Promise<void> {
    const tags = [CACHE_TAGS.API_KEY(keyId)];

    if (userId) {
      tags.push(CACHE_TAGS.API_KEYS(userId));
    }

    await Promise.all(tags.map(tag => revalidateTag(tag)));
  }

  /**
   * Invalidate usage-related caches
   */
  static async invalidateUsage(userId: string, periods?: string[]): Promise<void> {
    const tags = [CACHE_TAGS.ACCOUNT_USAGE(userId)];

    if (periods) {
      periods.forEach(period => {
        tags.push(CACHE_TAGS.USAGE_METRICS(userId, period));
      });
    }

    await Promise.all(tags.map(tag => revalidateTag(tag)));
  }

  /**
   * Invalidate billing-related caches
   */
  static async invalidateBilling(userId: string): Promise<void> {
    const tags = [
      CACHE_TAGS.SUBSCRIPTION(userId),
      CACHE_TAGS.PAYMENT_METHODS(userId),
      CACHE_TAGS.INVOICES(userId),
    ];

    await Promise.all(tags.map(tag => revalidateTag(tag)));
  }

  /**
   * Invalidate admin caches
   */
  static async invalidateAdmin(): Promise<void> {
    const tags = [CACHE_TAGS.ADMIN_USERS, CACHE_TAGS.ADMIN_STATS, CACHE_TAGS.SYSTEM_STATS];

    await Promise.all(tags.map(tag => revalidateTag(tag)));
  }

  /**
   * Invalidate all billing plans (affects all users)
   */
  static async invalidateBillingPlans(): Promise<void> {
    await revalidateTag(CACHE_TAGS.BILLING_PLANS);
  }

  /**
   * Invalidate system-wide caches
   */
  static async invalidateSystem(): Promise<void> {
    await revalidateTag(CACHE_TAGS.SYSTEM_STATS);
  }

  /**
   * Invalidate payment methods cache
   */
  static invalidatePaymentMethods(userId: string): void {
    revalidateTag(CACHE_TAGS.SUBSCRIPTION(userId));
    revalidateTag(CACHE_TAGS.BILLING);
  }

  /**
   * Invalidate billing history cache
   */
  static invalidateBillingHistory(userId: string): void {
    revalidateTag(CACHE_TAGS.SUBSCRIPTION(userId));
    revalidateTag(CACHE_TAGS.BILLING);
  }
}

/**
 * Cache warming utility for frequently accessed data
 */
export class CacheWarmer {
  /**
   * Warm user caches after login
   */
  static async warmUserCaches(
    userId: string,
    fetchers: {
      profile?: () => Promise<unknown>;
      apiKeys?: () => Promise<unknown>;
      subscription?: () => Promise<unknown>;
      usage?: () => Promise<unknown>;
    }
  ): Promise<void> {
    const promises: Promise<unknown>[] = [];

    if (fetchers.profile) {
      promises.push(ActionCache.cacheUserProfile(userId, fetchers.profile));
    }

    if (fetchers.apiKeys) {
      promises.push(ActionCache.cacheApiKeys(userId, {}, fetchers.apiKeys));
    }

    if (fetchers.subscription) {
      promises.push(ActionCache.cacheSubscription(userId, fetchers.subscription));
    }

    if (fetchers.usage) {
      promises.push(ActionCache.cacheUsageMetrics(userId, 'last30days', fetchers.usage));
    }

    // Fire and forget - don't block on cache warming
    Promise.all(promises).catch(error => {
      console.warn('Cache warming failed:', error);
    });
  }

  /**
   * Warm admin caches
   */
  static async warmAdminCaches(fetchers: {
    users?: () => Promise<unknown>;
    stats?: () => Promise<unknown>;
  }): Promise<void> {
    const promises: Promise<unknown>[] = [];

    if (fetchers.users) {
      promises.push(ActionCache.cacheAdminUsers({}, fetchers.users));
    }

    if (fetchers.stats) {
      promises.push(ActionCache.cacheSystemStats(fetchers.stats));
    }

    // Fire and forget - don't block on cache warming
    Promise.all(promises).catch(error => {
      console.warn('Admin cache warming failed:', error);
    });
  }
}

/**
 * Cache performance monitoring
 */
export class CacheMetrics {
  private static metrics: Map<string, { hits: number; misses: number }> = new Map();

  /**
   * Record cache hit
   */
  static recordHit(cacheKey: string): void {
    const current = this.metrics.get(cacheKey) || { hits: 0, misses: 0 };
    current.hits++;
    this.metrics.set(cacheKey, current);
  }

  /**
   * Record cache miss
   */
  static recordMiss(cacheKey: string): void {
    const current = this.metrics.get(cacheKey) || { hits: 0, misses: 0 };
    current.misses++;
    this.metrics.set(cacheKey, current);
  }

  /**
   * Get cache hit ratio
   */
  static getHitRatio(cacheKey: string): number {
    const metrics = this.metrics.get(cacheKey);
    if (!metrics || metrics.hits + metrics.misses === 0) {
      return 0;
    }
    return metrics.hits / (metrics.hits + metrics.misses);
  }

  /**
   * Get all cache metrics
   */
  static getAllMetrics(): Record<string, { hits: number; misses: number; hitRatio: number }> {
    const result: Record<string, { hits: number; misses: number; hitRatio: number }> = {};

    for (const [key, metrics] of this.metrics.entries()) {
      result[key] = {
        ...metrics,
        hitRatio: this.getHitRatio(key),
      };
    }

    return result;
  }

  /**
   * Clear metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }
}
