'use client';

import { useState, useEffect, useCallback } from 'react';

import Link from 'next/link';

import {
  Plus,
  Activity,
  MessageSquare,
  Webhook,
  Search,
  Copy,
  Check,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';

import { CreateApiKeyModal } from '@/components/modals/create-api-key-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NotificationService } from '@/lib/notifications';
import type { ApiKey } from '@/types/actions';

interface DashboardPageClientProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
  loading?: boolean;
}

function MetricCard({ title, value, description, trend, icon, loading }: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between'>
            <div className='space-y-2'>
              <Skeleton className='h-4 w-[100px]' />
              <Skeleton className='h-8 w-[80px]' />
              <Skeleton className='h-3 w-[120px]' />
            </div>
            <Skeleton className='h-8 w-8 rounded' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className='p-6'>
        <div className='flex items-center justify-between'>
          <div className='space-y-2'>
            <p className='text-sm font-medium text-muted-foreground'>{title}</p>
            <div className='flex items-center space-x-2'>
              <p className='text-2xl font-bold'>{value}</p>
              {trend && (
                <div
                  className={`flex items-center space-x-1 text-sm ${
                    trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <span>{trend.value}</span>
                </div>
              )}
            </div>
            {description && <p className='text-xs text-muted-foreground'>{description}</p>}
          </div>
          {icon && (
            <div className='h-8 w-8 flex items-center justify-center rounded-md bg-muted'>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const chartConfig = {
  requests: { label: 'Requests', color: 'hsl(var(--chart-1))' },
  subscriptions: { label: 'Subscriptions', color: 'hsl(var(--chart-2))' },
  webhooks: { label: 'Webhooks', color: 'hsl(var(--chart-3))' },
};

interface ApiKeysOverviewProps {
  apiKeys: ApiKey[];
  loading: boolean;
  onApiKeyCreated?: () => void;
}

function ApiKeysOverview({ apiKeys, loading, onApiKeyCreated }: ApiKeysOverviewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyKey = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      NotificationService.success('API key copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      NotificationService.error('Failed to copy API key');
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  };

  const getUsagePercentage = (used: number, quota: number) => {
    return Math.round((used / quota) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys Overview</CardTitle>
          <CardDescription>Your recent API keys and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className='h-[200px] w-full' />
        </CardContent>
      </Card>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys Overview</CardTitle>
          <CardDescription>Your recent API keys and usage</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col items-center justify-center py-8'>
          <div className='text-center space-y-4'>
            <div className='mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center'>
              <Plus className='h-6 w-6 text-muted-foreground' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-lg font-semibold'>No API keys found</h3>
              <p className='text-muted-foreground'>Get started by creating your first API key.</p>
            </div>
            <CreateApiKeyModal onApiKeyCreated={onApiKeyCreated} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show only the first 5 API keys for dashboard overview
  const displayKeys = apiKeys.slice(0, 5);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>API Keys Overview</CardTitle>
          <CardDescription>Your recent API keys and usage</CardDescription>
        </div>
        <Link href='/api-keys'>
          <Button variant='outline' size='sm'>
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayKeys.map(apiKey => {
              const usagePercentage = getUsagePercentage(apiKey.usedThisMonth, apiKey.monthlyQuota);
              const isOverQuota = usagePercentage >= 100;
              const isNearQuota = usagePercentage >= 80;

              return (
                <TableRow key={apiKey.id}>
                  <TableCell className='font-medium'>{apiKey.name}</TableCell>
                  <TableCell>
                    <div className='flex items-center space-x-2'>
                      <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                        {apiKey.keyPreview}
                      </code>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleCopyKey(apiKey.key, apiKey.id)}
                        className='h-6 w-6 p-0'
                      >
                        {copiedId === apiKey.id ? (
                          <Check className='h-3 w-3' />
                        ) : (
                          <Copy className='h-3 w-3' />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1'>
                      <div className='text-sm'>
                        {apiKey.usedThisMonth.toLocaleString()} /{' '}
                        {apiKey.monthlyQuota.toLocaleString()}
                      </div>
                      <div className='w-full bg-muted rounded-full h-1.5'>
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isOverQuota
                              ? 'bg-destructive'
                              : isNearQuota
                                ? 'bg-warning'
                                : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                      </div>
                      <div className='text-xs text-muted-foreground'>{usagePercentage}% used</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>{formatDate(new Date(apiKey.createdAt))}</div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {apiKeys.length > 5 && (
          <div className='p-4 border-t text-center'>
            <Link href='/api-keys'>
              <Button variant='outline' size='sm'>
                View {apiKeys.length - 5} more
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UsageChartProps {
  data: any[];
  loading: boolean;
}

function UsageChart({ data, loading }: UsageChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Your recent API activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className='h-[300px] w-full' />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Your recent API activity</CardDescription>
          </div>
          <Link href='/usage'>
            <Button variant='outline' size='sm'>
              View Details
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
            No usage data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Your recent API activity</CardDescription>
        </div>
        <Link href='/usage'>
          <Button variant='outline' size='sm'>
            View Details
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className='h-[300px]'>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='timestamp'
              tickFormatter={value => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey='requests' stackId='total' fill='var(--color-requests)' />
            <Bar dataKey='subscriptions' stackId='total' fill='var(--color-subscriptions)' />
            <Bar dataKey='webhooks' stackId='total' fill='var(--color-webhooks)' />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardPageClient({ user }: DashboardPageClientProps) {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!session?.user) {
      return;
    }

    setLoading(true);
    try {
      // Load API keys and usage data in parallel
      const [apiKeysResponse, usageResponse] = await Promise.all([
        fetch('/api/api-keys?limit=10'),
        fetch('/api/usage/analytics?timeframe=7d'),
      ]);

      const [apiKeysResult, usageResult] = await Promise.all([
        apiKeysResponse.json(),
        usageResponse.json(),
      ]);

      if (apiKeysResult.success && apiKeysResult.data) {
        setApiKeys(apiKeysResult.data.data);
      }

      if (!usageResult.error) {
        setUsageData(usageResult);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      NotificationService.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApiKeyCreated = () => {
    loadDashboardData();
  };

  if (!session?.user) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-16'>
          <p className='text-muted-foreground'>Please sign in to view your dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <div className='space-y-2'>
        <h2 className='text-2xl font-bold'>Welcome back{user.name ? `, ${user.name}` : ''}!</h2>
        <p className='text-muted-foreground'>
          Here{"'"}s an overview of your API keys and usage statistics.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <MetricCard
          title='Total API Keys'
          value={apiKeys.length}
          description={`${apiKeys.filter(k => k.isActive).length} active`}
          icon={<Search className='h-4 w-4' />}
          loading={loading}
        />
        <MetricCard
          title='Total Requests'
          value={usageData?.summary?.totalRequests?.toLocaleString() || '0'}
          description='Last 7 days'
          icon={<Activity className='h-4 w-4' />}
          loading={loading}
        />
        <MetricCard
          title='Subscription Messages'
          value={usageData?.summary?.totalSubscriptions?.toLocaleString() || '0'}
          description='Last 7 days'
          icon={<MessageSquare className='h-4 w-4' />}
          loading={loading}
        />
        <MetricCard
          title='Webhook Deliveries'
          value={usageData?.summary?.totalWebhooks?.toLocaleString() || '0'}
          description='Last 7 days'
          icon={<Webhook className='h-4 w-4' />}
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* API Keys Overview */}
        <div className='lg:col-span-2'>
          <ApiKeysOverview
            apiKeys={apiKeys}
            loading={loading}
            onApiKeyCreated={handleApiKeyCreated}
          />
        </div>

        {/* Usage Chart */}
        <div className='lg:col-span-2'>
          <UsageChart data={usageData?.charts?.combinedOverTime || []} loading={loading} />
        </div>
      </div>
    </div>
  );
}
