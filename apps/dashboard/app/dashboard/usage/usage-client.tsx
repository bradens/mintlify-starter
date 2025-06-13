'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Webhook,
  MessageSquare,
  Search,
  BarChart3,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationService } from '@/lib/notifications';

interface UsagePageClientProps {
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
                  {trend.direction === 'up' ? (
                    <TrendingUp className='h-4 w-4' />
                  ) : (
                    <TrendingDown className='h-4 w-4' />
                  )}
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

// Chart color configuration for different operation types
const chartConfig = {
  getBars: { label: 'Get Bars', color: 'hsl(var(--chart-1))' },
  getEvents: { label: 'Get Events', color: 'hsl(var(--chart-2))' },
  getTokens: { label: 'Get Tokens', color: 'hsl(var(--chart-3))' },
  getPrices: { label: 'Get Prices', color: 'hsl(var(--chart-4))' },
  getMetadata: { label: 'Get Metadata', color: 'hsl(var(--chart-5))' },
  subscriptions: { label: 'Subscriptions', color: 'hsl(var(--chart-1))' },
  webhooks: { label: 'Webhooks', color: 'hsl(var(--chart-2))' },
  requests: { label: 'Requests', color: 'hsl(var(--chart-3))' },
};

interface ApiKeyOption {
  id: string;
  name: string;
  keyPreview: string;
}

interface StackedBarChartProps {
  title: string;
  description: string;
  data: any[];
  loading: boolean;
  dataKeys: string[];
  icon?: React.ReactNode;
}

function StackedBarChart({
  title,
  description,
  data,
  loading,
  dataKeys,
  icon,
}: StackedBarChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
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
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='h-[300px] flex items-center justify-center text-muted-foreground'>
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
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
                  hour: data.length > 24 ? undefined : '2-digit',
                });
              }}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {dataKeys.map(key => (
              <Bar key={key} dataKey={key} stackId='total' fill={`var(--color-${key})`} />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ApiKeyMultiSelect({
  apiKeys,
  selectedKeys,
  onSelectionChange,
  loading,
}: {
  apiKeys: ApiKeyOption[];
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggleApiKey = (keyId: string) => {
    const newSelection = selectedKeys.includes(keyId)
      ? selectedKeys.filter(id => id !== keyId)
      : [...selectedKeys, keyId];
    onSelectionChange(newSelection);
  };

  const toggleAll = () => {
    if (selectedKeys.length === apiKeys.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(apiKeys.map(key => key.id));
    }
  };

  if (loading) {
    return <Skeleton className='h-10 w-[200px]' />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-[200px] justify-between'
        >
          {selectedKeys.length === 0
            ? 'Select API keys...'
            : selectedKeys.length === apiKeys.length
              ? 'All API keys'
              : `${selectedKeys.length} selected`}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] p-0'>
        <Command>
          <CommandInput placeholder='Search API keys...' />
          <CommandList>
            <CommandEmpty>No API keys found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={toggleAll}>
                <Check
                  className={`mr-2 h-4 w-4 ${
                    selectedKeys.length === apiKeys.length ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                All API Keys
              </CommandItem>
              {apiKeys.map(apiKey => (
                <CommandItem key={apiKey.id} onSelect={() => toggleApiKey(apiKey.id)}>
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedKeys.includes(apiKey.id) ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div className='flex flex-col'>
                    <span className='font-medium'>{apiKey.name}</span>
                    <span className='text-xs text-muted-foreground'>{apiKey.keyPreview}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function UsagePageClient({ user }: UsagePageClientProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [availableApiKeys, setAvailableApiKeys] = useState<ApiKeyOption[]>([]);
  const [selectedApiKeys, setSelectedApiKeys] = useState<string[]>([]);
  const [usageData, setUsageData] = useState<any>(null);

  const timeframeOptions = [
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'lastPeriod', label: 'Last Period' },
    { value: 'currentPeriod', label: 'Current Period' },
  ];

  const loadApiKeys = useCallback(async () => {
    if (!session?.user) {
      return;
    }

    try {
      const response = await fetch('/api/api-keys?limit=100');
      const result = await response.json();

      if (result.success && result.data) {
        const keys = result.data.data.map((key: any) => ({
          id: key.id,
          name: key.name,
          keyPreview: key.keyPreview,
        }));
        setAvailableApiKeys(keys);
        // Default to all keys selected
        setSelectedApiKeys(keys.map((k: any) => k.id));
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }, [session?.user]);

  const loadUsageData = useCallback(async () => {
    if (!session?.user || selectedApiKeys.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const apiKeysParam = selectedApiKeys.join(',');
      const response = await fetch(
        `/api/usage/analytics?timeframe=${selectedTimeframe}&apiKeys=${apiKeysParam}`
      );
      const result = await response.json();

      if (result.error) {
        NotificationService.error(result.error);
      } else {
        setUsageData(result);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
      NotificationService.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [session?.user, selectedTimeframe, selectedApiKeys]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  useEffect(() => {
    if (selectedApiKeys.length > 0) {
      loadUsageData();
    }
  }, [loadUsageData, selectedApiKeys.length]);

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
  };

  const handleApiKeySelectionChange = (keys: string[]) => {
    setSelectedApiKeys(keys);
  };

  const handleExportData = async () => {
    try {
      NotificationService.info('Export functionality will be implemented in a future update');
    } catch (error) {
      NotificationService.error('Failed to export data');
    }
  };

  if (!session?.user) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-16'>
          <p className='text-muted-foreground'>Please sign in to view usage statistics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Controls */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
          <div className='flex items-center space-x-2'>
            <Label htmlFor='timeframe'>Timeframe:</Label>
            <select
              id='timeframe'
              value={selectedTimeframe}
              onChange={e => handleTimeframeChange(e.target.value)}
              className='px-3 py-2 border border-border rounded-md text-sm bg-background'
            >
              {timeframeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex items-center space-x-2'>
            <Label>API Keys:</Label>
            <ApiKeyMultiSelect
              apiKeys={availableApiKeys}
              selectedKeys={selectedApiKeys}
              onSelectionChange={handleApiKeySelectionChange}
              loading={loading}
            />
          </div>
        </div>
        <Button variant='outline' onClick={handleExportData}>
          <Download className='mr-2 h-4 w-4' />
          Export
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <MetricCard
          title='Total Requests'
          value={usageData?.summary?.totalRequests?.toLocaleString() || '0'}
          trend={
            usageData?.trends?.requestsChange
              ? {
                  value: usageData.trends.requestsChange,
                  direction: usageData.trends.requestsChange.startsWith('+') ? 'up' : 'down',
                }
              : undefined
          }
          description='API requests made'
          icon={<Activity className='h-4 w-4' />}
          loading={loading}
        />
        <MetricCard
          title='Total Subscription Messages'
          value={usageData?.summary?.totalSubscriptions?.toLocaleString() || '0'}
          trend={
            usageData?.trends?.subscriptionsChange
              ? {
                  value: usageData.trends.subscriptionsChange,
                  direction: usageData.trends.subscriptionsChange.startsWith('+') ? 'up' : 'down',
                }
              : undefined
          }
          description='Subscription events sent'
          icon={<MessageSquare className='h-4 w-4' />}
          loading={loading}
        />
        <MetricCard
          title='Total Queries'
          value={usageData?.summary?.totalQueries?.toLocaleString() || '0'}
          trend={
            usageData?.trends?.queriesChange
              ? {
                  value: usageData.trends.queriesChange,
                  direction: usageData.trends.queriesChange.startsWith('+') ? 'up' : 'down',
                }
              : undefined
          }
          description='Database queries executed'
          icon={<Search className='h-4 w-4' />}
          loading={loading}
        />
        <MetricCard
          title='Total Webhook Deliveries'
          value={usageData?.summary?.totalWebhooks?.toLocaleString() || '0'}
          trend={
            usageData?.trends?.webhooksChange
              ? {
                  value: usageData.trends.webhooksChange,
                  direction: usageData.trends.webhooksChange.startsWith('+') ? 'up' : 'down',
                }
              : undefined
          }
          description='Webhook events delivered'
          icon={<Webhook className='h-4 w-4' />}
          loading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className='space-y-6'>
        {/* Requests Over Time */}
        <StackedBarChart
          title='Requests Over Time'
          description='API requests broken down by operation type'
          data={usageData?.charts?.requestsOverTime || []}
          dataKeys={['getBars', 'getEvents', 'getTokens', 'getPrices', 'getMetadata']}
          icon={<Activity className='h-4 w-4' />}
          loading={loading}
        />

        {/* Subscriptions and Webhooks Row */}
        <div className='grid gap-6 lg:grid-cols-2'>
          <StackedBarChart
            title='Subscriptions Over Time'
            description='Subscription messages sent over time'
            data={usageData?.charts?.subscriptionsOverTime || []}
            dataKeys={['subscriptions']}
            icon={<MessageSquare className='h-4 w-4' />}
            loading={loading}
          />

          <StackedBarChart
            title='Webhooks Over Time'
            description='Webhook deliveries over time'
            data={usageData?.charts?.webhooksOverTime || []}
            dataKeys={['webhooks']}
            icon={<Webhook className='h-4 w-4' />}
            loading={loading}
          />
        </div>

        {/* Combined Chart */}
        <StackedBarChart
          title='Combined Usage Over Time'
          description='All activity types combined over time'
          data={usageData?.charts?.combinedOverTime || []}
          dataKeys={['requests', 'subscriptions', 'webhooks']}
          icon={<BarChart3 className='h-4 w-4' />}
          loading={loading}
        />
      </div>
    </div>
  );
}
