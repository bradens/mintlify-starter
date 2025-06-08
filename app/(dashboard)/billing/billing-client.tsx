'use client';

import { useState, useEffect } from 'react';

import {
  CreditCard,
  Download,
  ExternalLink,
  Check,
  X,
  Loader2,
  Crown,
  Zap,
  Building,
  Minus,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NotificationService } from '@/lib/notifications';
import type { BillingPlan, Subscription, Invoice } from '@/types/actions';

interface BillingPageClientProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
}

interface CurrentUsage {
  requests: { used: number; limit: number; percentage: number };
  apiKeys: { used: number; limit: number; percentage: number };
  period: { start: Date; end: Date };
}

interface PlanFeature {
  text: string;
  included: boolean;
  neutral?: boolean;
}

// Plan configurations with features
const planConfigs = {
  free: {
    icon: <Zap className='h-8 w-8' />,
    name: 'Free Plan',
    tagline: 'For personal & hobby projects',
    features: [
      { text: '1 API key', included: true },
      { text: '10,000 requests per month', included: true },
      { text: '5 requests per second', included: true },
      { text: 'Community support', included: true },
    ] as PlanFeature[],
  },
  growth: {
    icon: <Crown className='h-8 w-8' />,
    name: 'Growth 5M Plan',
    tagline: 'For teams & startups',
    features: [
      { text: '5 API keys', included: true },
      { text: '5,000,000 requests per month', included: true },
      { text: '300 requests per second', included: true },
      { text: 'Priority support', included: true },
      { text: 'Websockets', included: true },
      { text: 'Webhooks', included: true },
    ] as PlanFeature[],
  },
  enterprise: {
    icon: <Building className='h-8 w-8' />,
    name: 'Enterprise Plan',
    tagline: 'Tailored solutions & support',
    features: [
      { text: '10 API keys', included: true },
      { text: '1,000,000,000 requests per month', included: true },
      { text: 'Unlimited* requests per second', included: true },
      { text: '50,000 concurrent requests', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'Websockets', included: true },
      { text: 'Webhooks', included: true },
    ] as PlanFeature[],
  },
};

const FeatureIcon: React.FC<{ included: boolean; neutral?: boolean }> = ({ included, neutral }) => {
  if (neutral) {
    return (
      <div className='w-6 h-6 rounded-md bg-muted flex items-center justify-center'>
        <Minus className='h-4 w-4 text-muted-foreground' />
      </div>
    );
  }

  if (included) {
    return (
      <div className='w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/20 flex items-center justify-center'>
        <Check className='h-4 w-4 text-green-600 dark:text-green-400' />
      </div>
    );
  }

  return (
    <div className='w-6 h-6 rounded-md bg-red-100 dark:bg-red-900/20 flex items-center justify-center'>
      <X className='h-4 w-4 text-red-600 dark:text-red-400' />
    </div>
  );
};

const PlanCard: React.FC<{
  plan: BillingPlan;
  isCurrentPlan: boolean;
  onUpgrade: (planId: string) => void;
  onManage: () => void;
  loadingAction: string | null;
}> = ({ plan, isCurrentPlan, onUpgrade, onManage, loadingAction }) => {
  const config =
    planConfigs[plan.name.toLowerCase() as keyof typeof planConfigs] || planConfigs.growth;
  const isLoading = loadingAction === `upgrade-${plan.id}`;
  const isManageLoading = loadingAction === 'manage-billing';

  // Calculate display price - handle free plans
  const displayPrice = plan.price === 0 ? '0' : (plan.price / 100).toLocaleString();
  const dollarSign = plan.price === 0 ? '$' : '$';

  return (
    <Card
      className={`relative transition-all duration-200 ${
        isCurrentPlan ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:shadow-lg'
      } ${plan.isPopular ? 'ring-2 ring-primary border-primary' : ''}`}
    >
      {plan.isPopular && (
        <div className='absolute -top-3 left-1/2 transform -translate-x-1/2 z-10'>
          <Badge className='bg-primary text-primary-foreground'>Most Popular</Badge>
        </div>
      )}

      {/* Current plan indicator */}
      {isCurrentPlan && (
        <div className='absolute top-4 right-4'>
          <div className='w-6 h-6 rounded-full bg-green-500 flex items-center justify-center'>
            <Check className='h-4 w-4 text-white' />
          </div>
        </div>
      )}

      <CardHeader className='text-center pb-4'>
        {/* Plan Icon and Title */}
        <div className='flex items-center justify-center gap-3 mb-4'>
          <div className='text-muted-foreground opacity-60'>{config.icon}</div>
          <CardTitle className='text-2xl'>{config.name}</CardTitle>
        </div>

        {/* Price Display */}
        <div className='flex items-baseline justify-center gap-1 mb-4'>
          <span className='text-4xl font-mono opacity-80 text-green-500'>{dollarSign}</span>
          <span className='text-6xl font-mono font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent'>
            {displayPrice}
          </span>
          {plan.interval && (
            <span className='text-xl font-mono opacity-80 text-green-500 ml-2 mt-2'>
              / {plan.interval}
            </span>
          )}
        </div>

        {/* Tagline */}
        <p className='text-muted-foreground font-medium italic opacity-70 mb-4'>{config.tagline}</p>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Features List */}
        <div className='min-h-[280px] space-y-3'>
          {config.features.map((feature, index) => (
            <div key={index} className='flex items-center gap-3'>
              <FeatureIcon included={feature.included} neutral={feature.neutral} />
              <span className='text-sm'>{feature.text}</span>
            </div>
          ))}

          {/* Growth plan specific content */}
          {plan.name.toLowerCase().includes('growth') && (
            <div className='mt-6 space-y-4'>
              <div className='text-right text-lg font-semibold'>$300 per million</div>

              {/* Usage Slider */}
              <div className='space-y-2'>
                <Slider defaultValue={[5]} max={10} min={1} step={1} className='w-full' />
                <div className='flex justify-between text-xs text-muted-foreground'>
                  <span>1M</span>
                  <span>2M</span>
                  <span>3M</span>
                  <span>5M</span>
                  <span>7M</span>
                  <span>10M</span>
                </div>
              </div>

              <p className='text-xs text-center text-muted-foreground'>
                Overages will be billed at $300 USD per 1 million requests
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Plan Limits Display */}
        <div className='space-y-1 text-xs text-muted-foreground'>
          <p>{plan.limits.monthlyRequests.toLocaleString()} requests/month</p>
          <p>{plan.limits.apiKeysLimit} API keys</p>
          <p>{plan.limits.rateLimitPerMinute} requests/minute</p>
          <p>{plan.limits.dataRetentionDays} days data retention</p>
        </div>

        {/* Action Button */}
        <div className='space-y-2'>
          {isCurrentPlan ? (
            <Button
              className='w-full h-[92px]'
              variant='secondary'
              disabled={isManageLoading}
              onClick={onManage}
            >
              {isManageLoading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              <div className='flex items-center gap-2'>
                <CreditCard className='h-4 w-4' />
                <span>Manage</span>
              </div>
            </Button>
          ) : plan.name.toLowerCase().includes('growth') ? (
            <Button
              className='w-full h-[92px] bg-muted text-muted-foreground'
              disabled={isLoading}
              onClick={() => onUpgrade(plan.id)}
            >
              {isLoading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              <div className='flex items-center gap-2'>
                <CreditCard className='h-4 w-4' />
                <span>Subscribe</span>
              </div>
            </Button>
          ) : (
            <Button
              className='w-full h-[92px]'
              disabled={isLoading}
              onClick={() => onUpgrade(plan.id)}
            >
              {isLoading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
              Get Started →
            </Button>
          )}
        </div>

        {/* Additional Info */}
        {isCurrentPlan && (
          <p className='text-xs text-center text-muted-foreground'>This is your current plan</p>
        )}

        {plan.name.toLowerCase().includes('enterprise') && (
          <p className='text-xs text-center text-muted-foreground'>
            * will be throttled if the usage begins to affect other users.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export function BillingPageClient({ user }: BillingPageClientProps) {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentUsage, setCurrentUsage] = useState<CurrentUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const [plansRes, subscriptionRes, invoicesRes] = await Promise.all([
        fetch('/api/billing/plans'),
        fetch('/api/billing/subscription'),
        fetch('/api/billing/history?limit=5'),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        setSubscription(subData);
        console.log('Subscription data:', subData); // Debug log
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData);
      }

      // Mock current usage for now - this would come from the usage API
      setCurrentUsage({
        requests: { used: 7350, limit: 10000, percentage: 73.5 },
        apiKeys: { used: 3, limit: 5, percentage: 60 },
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (error) {
      console.error('Error loading billing data:', error);
      NotificationService.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    setLoadingAction(`upgrade-${planId}`);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const result = await response.json();

      if (response.ok && result.url) {
        window.location.href = result.url;
      } else {
        NotificationService.error(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      NotificationService.error('Failed to start upgrade process');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleManageBilling = async () => {
    setLoadingAction('manage-billing');
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      const result = await response.json();

      if (response.ok && result.url) {
        window.location.href = result.url;
      } else {
        NotificationService.error(result.error || 'Failed to create billing session');
      }
    } catch (error) {
      console.error('Error creating billing session:', error);
      NotificationService.error('Failed to open billing portal');
    } finally {
      setLoadingAction(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  };

  const getInvoiceStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'open':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'uncollectible':
      case 'void':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Determine current plan - first check subscription, then fallback to free plan
  const getCurrentPlanId = () => {
    if (subscription?.planId) {
      return subscription.planId;
    }
    // If no subscription, assume they're on the free plan
    return 'plan_free';
  };

  const currentPlanId = getCurrentPlanId();

  if (loading) {
    return (
      <div className='space-y-6'>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className='h-6 bg-muted rounded animate-pulse' />
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <div className='h-4 bg-muted rounded animate-pulse' />
                <div className='h-4 bg-muted rounded animate-pulse w-3/4' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Plans Section */}
      <div>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center'>
            <Crown className='h-5 w-5 text-primary' />
          </div>
          <h2 className='text-3xl font-bold'>Plans</h2>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto'>
          {plans.map(plan => {
            const isCurrentPlan = currentPlanId === plan.id;
            console.log(`Plan ${plan.id} vs Current ${currentPlanId} = ${isCurrentPlan}`); // Debug log

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={isCurrentPlan}
                onUpgrade={handleUpgradePlan}
                onManage={handleManageBilling}
                loadingAction={loadingAction}
              />
            );
          })}
        </div>
      </div>

      {/* Current Usage Section */}
      {currentUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Current Usage</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-4'>
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-sm font-medium'>API Requests</span>
                  <span className='text-sm text-muted-foreground'>
                    {currentUsage.requests.used.toLocaleString()} /{' '}
                    {currentUsage.requests.limit.toLocaleString()}
                  </span>
                </div>
                <Progress value={currentUsage.requests.percentage} className='h-2' />
              </div>
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-sm font-medium'>API Keys</span>
                  <span className='text-sm text-muted-foreground'>
                    {currentUsage.apiKeys.used} / {currentUsage.apiKeys.limit}
                  </span>
                </div>
                <Progress value={currentUsage.apiKeys.percentage} className='h-2' />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              Billing History
              <Button variant='outline' size='sm'>
                <Download className='h-4 w-4 mr-2' />
                Download All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell className='font-medium'>
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInvoiceStatusBadgeVariant(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.invoiceUrl ? (
                        <Button variant='ghost' size='sm' asChild>
                          <a href={invoice.invoiceUrl} target='_blank' rel='noopener noreferrer'>
                            <ExternalLink className='h-4 w-4 mr-2' />
                            View
                          </a>
                        </Button>
                      ) : (
                        <span className='text-muted-foreground'>Not available</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
