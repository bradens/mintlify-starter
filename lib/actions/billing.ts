'use server';

import { ApiSubscriptionService, ApiProductService } from '@company-z/api-management-library';
import Stripe from 'stripe';

import { getService } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';
import { auth } from '@/lib/auth';
import type {
  CreateCheckoutSessionInput,
  BillingPlan,
  Subscription,
  Invoice,
  PaymentMethod,
  CreateBillingSessionInput,
} from '@/types/actions';
import {
  createBillingSessionSchema,
  createCheckoutSessionSchema,
} from '@/types/actions';

import { baseAction } from './base-action';
import { ActionCache } from './caching';
import { DashboardError } from './error-handling';

// Transform functions (migrated from server)
function transformPrice(price: Stripe.Price): any {
  if (!price) {
    return null;
  }

  return {
    currency: price.currency,
    id: price.id,
    unitAmount: price.unit_amount,
    recurringInterval: price.recurring?.interval,
    recurringIntervalCount: price.recurring?.interval_count,
    productId: price.product as string,
  };
}

function transformInvoice(invoice: Stripe.Invoice): Invoice {
  if (!invoice || !invoice.due_date || !invoice.hosted_invoice_url) {
    throw new DashboardError('Invoice not found', 'INVOICE_NOT_FOUND');
  }

  return {
    id: invoice.id,
    subscriptionId: invoice.subscription as string,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: invoice.status as Invoice['status'],
    dueDate: new Date(invoice.due_date * 1000),
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : undefined,
    invoiceUrl: invoice.hosted_invoice_url,
    createdAt: new Date(invoice.created * 1000),
  };
}

function transformProduct(product: Stripe.Product): BillingPlan {
  if (!product) {
    throw new DashboardError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const price = transformPrice(product.default_price as Stripe.Price);

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: price?.unitAmount || 0,
    currency: price?.currency || 'usd',
    interval: (price?.recurringInterval as 'month' | 'year') || 'month',
    features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
    limits: {
      monthlyRequests: parseInt(product.metadata?.monthlyRequests || '10000'),
      rateLimitPerMinute: parseInt(product.metadata?.rateLimitPerMinute || '100'),
      apiKeysLimit: parseInt(product.metadata?.apiKeysLimit || '5'),
      dataRetentionDays: parseInt(product.metadata?.dataRetentionDays || '30'),
    },
    isPopular: product.metadata?.isPopular === 'true',
  };
}

function transformSubscription(subscription: Stripe.Subscription): Subscription {
  if (!subscription) {
    throw new DashboardError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
  }

  return {
    id: subscription.id,
    userId: subscription.metadata?.userId || '',
    planId: (subscription.items?.data[0]?.price?.product as string) || '',
    // FIXME: @bradens Why null?
    plan: subscription.items.data[0].price.product as unknown as BillingPlan,
    status: subscription.status as Subscription['status'],
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    createdAt: new Date(subscription.created * 1000),
    updatedAt: new Date(), // Stripe doesn't provide updated timestamp
  };
}

/**
 * Get available billing plans/products
 */
export async function getPlans() {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    return ActionCache.cachePlans(
      async () => {
        try {
          const apiProductService = getService<ApiProductService>(SYMBOLS.ApiProductService);

          // Check if getProducts method exists
          if (typeof apiProductService.getProducts === 'function') {
            const { data: products } = await apiProductService.getProducts({
              ids: ['plan_free', 'plan_growth', 'plan_enterprise'],
            });
            return products.map(transformProduct);
          }
        } catch (error) {
          console.warn('ApiProductService.getProducts not available, using mock data:', error);
        }

        // Fallback to mock plans if service is not available
        return [];
      },
      { revalidate: 3600 } // Cache for 1 hour
    );
  }, 'Failed to fetch billing plans');
}


/**
 * Create Stripe checkout session for subscription (migrated from CreateCheckoutSession)
 */
export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    const validatedInput = createCheckoutSessionSchema.parse(input);

    const apiSubscriptionService = getService<ApiSubscriptionService>(
      SYMBOLS.ApiSubscriptionService
    );

    const sessionUrl = await apiSubscriptionService.createCheckoutSession({
      ...validatedInput,
      verifiedId: session.user.id,
    });

    return { url: sessionUrl };
  }, 'Failed to create checkout session');
}

/**
 * Create Stripe billing portal session (migrated from CreateBillingSession)
 */
export async function createBillingSession(input: CreateBillingSessionInput) {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    const validatedInput = createBillingSessionSchema.parse(input);

    const apiSubscriptionService = getService<ApiSubscriptionService>(
      SYMBOLS.ApiSubscriptionService
    );

    const sessionUrl = await apiSubscriptionService.createBillingSession({
      ...validatedInput,
      verifiedId: session.user.id,
    });

    return { url: sessionUrl };
  }, 'Failed to create billing session');
}

/**
 * Get user's current subscription (migrated from GetSubscription)
 */
export async function getSubscription() {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    return ActionCache.cacheSubscription(
      session.user.id,
      async () => {
        try {
          const apiSubscriptionService = getService<ApiSubscriptionService>(
            SYMBOLS.ApiSubscriptionService
          );

          // Only call getSubscription if it exists
          if (typeof apiSubscriptionService.getSubscription === 'function') {
            const subscription = await apiSubscriptionService.getSubscription(session.user.id);

            if (!subscription) {
              return null;
            }

            return transformSubscription(subscription);
          }
        } catch (error) {
          console.warn('ApiSubscriptionService.getSubscription not available:', error);
        }

        // Return null if no subscription service available
        return null;
      },
      { revalidate: 300 } // Cache for 5 minutes
    );
  }, 'Failed to fetch subscription');
}

/**
 * Get billing history/invoices - simplified version
 */
export async function getBillingHistory(limit: number = 10) {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    return ActionCache.cacheBillingHistory(
      session.user.id,
      async () => {
        // Return empty array for now since getInvoices method doesn't exist
        // This would be implemented when the actual method is available
        return [] as Invoice[];
      },
      { revalidate: 300 } // Cache for 5 minutes
    );
  }, 'Failed to fetch billing history');
}

/**
 * Get payment methods - simplified version
 */
export async function getPaymentMethods() {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    return ActionCache.cachePaymentMethods(
      session.user.id,
      async () => {
        // Return empty array for now since getPaymentMethods method doesn't exist
        // This would be implemented when the actual method is available
        return [] as PaymentMethod[];
      },
      { revalidate: 600 } // Cache for 10 minutes
    );
  }, 'Failed to fetch payment methods');
}

/**
 * Get current billing period usage and limits
 */
export async function getBillingUsage() {
  return baseAction(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new DashboardError('Unauthorized', 'AUTHENTICATION_ERROR');
    }

    return ActionCache.cacheBillingUsage(
      session.user.id,
      async () => {
        const [subscription] = await Promise.all([
          getSubscription(),
          // Get current usage from the usage service - would integrate with existing usage API
        ]);

        // Calculate usage against subscription limits
        const usage = {
          requests: {
            used: 0, // Would come from usage analytics
            limit: subscription?.data?.plan?.limits?.monthlyRequests || 0,
            percentage: 0,
          },
          apiKeys: {
            used: 0, // Would come from API key count
            limit: subscription?.data?.plan?.limits?.apiKeysLimit || 0,
            percentage: 0,
          },
          period: {
            start: subscription?.data?.currentPeriodStart || new Date(),
            end: subscription?.data?.currentPeriodEnd || new Date(),
          },
        };

        return usage;
      },
      { revalidate: 300 } // Cache for 5 minutes
    );
  }, 'Failed to fetch billing usage');
}
