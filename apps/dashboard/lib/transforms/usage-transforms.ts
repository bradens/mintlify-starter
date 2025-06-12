import {
  MetricsModel,
  WebhookMetricType,
  getDurationBucketTimestamp,
} from '@company-z/crypto-data';

import { OperationType } from '../services/api-usage-service';

export interface DetailedMetric {
  operation: string;
  timestamp: number;
  value: number;
}

export interface CombinedMetric {
  timestamp: number;
  value: number;
}

export interface TopUsageItem {
  operation: string;
  value: number;
  percentage: number;
}

export interface UsageResponse {
  available?: number | null;
  availablePercent?: number | null;
  total: number;
  monthlyLimit?: number | null;
  resolution: string;
  lowerBound: number;
  upperBound: number;
  combinedUsage: CombinedMetric[];
  topUsage: TopUsageItem[];
  otherUsage: TopUsageItem[];
}

/**
 * Transform raw metrics into detailed metrics with operation breakdown
 */
export function transformDetailedMetrics(metrics: MetricsModel[]): DetailedMetric[] {
  return metrics.map(metric => ({
    operation: metric.operation,
    timestamp: metric.timestamp,
    value: metric.value || 0,
  }));
}

/**
 * Transform metrics into combined usage by timestamp
 */
export function transformCombinedMetrics(metrics: MetricsModel[]): CombinedMetric[] {
  const combined = new Map<number, number>();

  metrics.forEach(metric => {
    const existing = combined.get(metric.timestamp) || 0;
    combined.set(metric.timestamp, existing + (metric.value || 0));
  });

  return Array.from(combined.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get top usage operations and remaining "other" usage
 */
export function getTopUsage(
  detailedMetrics: DetailedMetric[],
  topCount: number = 9
): [TopUsageItem[], TopUsageItem[]] {
  // Aggregate by operation
  const operationTotals = new Map<string, number>();

  detailedMetrics.forEach(metric => {
    const existing = operationTotals.get(metric.operation) || 0;
    operationTotals.set(metric.operation, existing + metric.value);
  });

  // Calculate total for percentages
  const total = Array.from(operationTotals.values()).reduce((sum, value) => sum + value, 0);

  // Sort operations by usage
  const sortedOperations = Array.from(operationTotals.entries())
    .map(([operation, value]) => ({
      operation,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Split into top and other
  const topUsage = sortedOperations.slice(0, topCount);
  const otherUsage = sortedOperations.slice(topCount);

  return [topUsage, otherUsage];
}

/**
 * Transform metrics for API operation type (matches GetUsage.ts handleApiOperationType)
 */
export function transformApiOperationUsage(
  metrics: MetricsModel[],
  input: {
    resolution: string;
    lowerBound: number;
    upperBound: number;
  },
  monthlyLimit?: number | null
): UsageResponse {
  const [topUsage, otherUsage] = getTopUsage(transformDetailedMetrics(metrics), 9);

  const total = metrics.reduce((acc, metric) => acc + (metric.value || 0), 0);
  const available = monthlyLimit ? Math.max(0, monthlyLimit - total) : null;
  const availablePercent =
    monthlyLimit && available !== null ? Math.max(0, (available / monthlyLimit) * 100) : null;

  return {
    available,
    availablePercent,
    total,
    monthlyLimit,
    resolution: input.resolution,
    lowerBound: getDurationBucketTimestamp(input.resolution as any, input.lowerBound),
    upperBound: getDurationBucketTimestamp(input.resolution as any, input.upperBound),
    combinedUsage: transformCombinedMetrics(metrics),
    topUsage,
    otherUsage,
  };
}

/**
 * Transform metrics for webhook operation type (matches GetUsage.ts handleWebhookRequest)
 */
export function transformWebhookOperationUsage(
  metrics: MetricsModel[],
  input: {
    resolution: string;
    lowerBound: number;
    upperBound: number;
  },
  monthlyLimit?: number | null
): UsageResponse {
  const [topUsage, otherUsage] = getTopUsage(transformDetailedMetrics(metrics), 9);

  const total = metrics.reduce((acc, metric) => {
    return metric.operation.startsWith(WebhookMetricType.PublishingSuccess)
      ? acc + (metric.value || 0)
      : acc;
  }, 0);

  const available = monthlyLimit ? Math.max(0, monthlyLimit - total) : null;
  const availablePercent =
    monthlyLimit && available !== null ? Math.max(0, (available / monthlyLimit) * 100) : null;

  return {
    available,
    availablePercent,
    total,
    monthlyLimit,
    resolution: input.resolution,
    lowerBound: getDurationBucketTimestamp(input.resolution as any, input.lowerBound),
    upperBound: getDurationBucketTimestamp(input.resolution as any, input.upperBound),
    combinedUsage: transformCombinedMetrics(metrics),
    topUsage,
    otherUsage,
  };
}

/**
 * Transform metrics for the dashboard analytics format (adapted from GetUsage.ts)
 */
export function transformForAnalytics(
  metrics: MetricsModel[],
  timeframe: string,
  _selectedApiKeys: string[],
  input: {
    resolution: string;
    lowerBound: number;
    upperBound: number;
    operationType?: OperationType;
  },
  monthlyLimit?: number | null
) {
  // Use the appropriate transform based on operation type
  const usageResponse =
    input.operationType === OperationType.Webhook
      ? transformWebhookOperationUsage(metrics, input, monthlyLimit)
      : transformApiOperationUsage(metrics, input, monthlyLimit);

  // Create enhanced response for dashboard analytics
  const detailedMetrics = transformDetailedMetrics(metrics);

  // Group by operation type for stacked charts
  const operationGroups = {
    getBars: ['getBars', 'getCandles', 'getOHLC'],
    getEvents: ['getEvents', 'getTransactions', 'getActivity'],
    getTokens: ['getTokens', 'getAssets', 'getCurrencies'],
    getPrices: ['getPrices', 'getQuotes', 'getRates'],
    getMetadata: ['getMetadata', 'getInfo', 'getDetails'],
  };

  // Create time series data for charts
  const timeSeriesData = createTimeSeriesData(detailedMetrics, operationGroups, timeframe);

  return {
    // Core usage data from server format
    usage: usageResponse,

    // Dashboard-specific format
    summary: {
      totalRequests: usageResponse.total,
      totalSubscriptions: 0,
      totalQueries: 0,
      totalWebhooks: 0,
    },
    trends: {
      requestsChange: '0%',
      subscriptionsChange: '0%',
      queriesChange: '0%',
      webhooksChange: '0%',
    },
    charts: {
      requestsOverTime: timeSeriesData,
      subscriptionsOverTime: [],
      webhooksOverTime: [],
      combinedOverTime: [],
    },
  };
}

/**
 * Create time series data grouped by operation categories
 */
function createTimeSeriesData(
  detailedMetrics: DetailedMetric[],
  operationGroups: Record<string, string[]>,
  _timeframe: string
) {
  const timestampGroups = new Map<number, Record<string, number>>();

  // Initialize with zero values
  detailedMetrics.forEach(metric => {
    if (!timestampGroups.has(metric.timestamp)) {
      timestampGroups.set(metric.timestamp, {
        getBars: 0,
        getEvents: 0,
        getTokens: 0,
        getPrices: 0,
        getMetadata: 0,
      });
    }
  });

  // Aggregate metrics by operation groups
  detailedMetrics.forEach(metric => {
    const group = timestampGroups.get(metric.timestamp);
    if (!group) {
      return;
    }

    // Find which operation group this metric belongs to
    for (const [groupName, operations] of Object.entries(operationGroups)) {
      if (operations.some(op => metric.operation.includes(op))) {
        group[groupName] += metric.value;
        break;
      }
    }
  });

  // Convert to array and sort by timestamp
  return Array.from(timestampGroups.entries())
    .map(([timestamp, values]) => ({
      timestamp: new Date(timestamp * 1000).toISOString(),
      ...values,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
