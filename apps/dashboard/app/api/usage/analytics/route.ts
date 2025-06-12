import { NextRequest, NextResponse } from 'next/server';

import { getService } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';
import { auth } from '@/lib/auth';
import {
  ApiUsageService,
  OperationType,
  Duration,
  GetUsageInput,
} from '@/lib/services/api-usage-service';
import { transformForAnalytics } from '@/lib/transforms/usage-transforms';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7d';
    const apiKeysParam = searchParams.get('apiKeys') || '';
    const selectedApiKeys = apiKeysParam.split(',').filter(Boolean);

    if (selectedApiKeys.length === 0) {
      return NextResponse.json({ error: 'No API keys selected' }, { status: 400 });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let resolution: string;

    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        resolution = Duration.Minute5;
        break;
      case '4h':
        startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        resolution = Duration.Minute5;
        break;
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        resolution = Duration.Hour1;
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        resolution = Duration.Hour1;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        resolution = Duration.Day1;
        break;
      case 'lastPeriod':
        // Last month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        resolution = Duration.Day1;
        break;
      case 'currentPeriod':
        // Current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        resolution = Duration.Day1;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        resolution = Duration.Hour1;
    }

    // Get ApiUsageService from DI container
    const apiUsageService = getService<ApiUsageService>(SYMBOLS.ApiUsageService);

    // Create input for usage service
    const usageInput: GetUsageInput = {
      lowerBound: Math.floor(startDate.getTime() / 1000),
      upperBound: Math.floor(endDate.getTime() / 1000),
      resolution,
      operationType: OperationType.All,
      apiUserIds: selectedApiKeys, // Use selected API keys to filter
      statuses: ['ACTIVE', 'INACTIVE'], // Only get metrics for active/inactive keys
    };

    try {
      // Get real usage metrics and monthly limit
      const [metrics, usageLimit] = await Promise.all([
        apiUsageService.getUsageMetrics(usageInput, session.user.id),
        apiUsageService.getUsageLimit(session.user.id),
      ]);

      // Transform metrics for the new dashboard format
      const analyticsData = transformForAnalytics(
        metrics,
        timeframe,
        selectedApiKeys,
        {
          resolution,
          lowerBound: usageInput.lowerBound,
          upperBound: usageInput.upperBound,
          operationType: usageInput.operationType,
        },
        usageLimit?.monthlyLimit || null
      );

      return NextResponse.json(analyticsData);
    } catch (serviceError) {
      console.error('Error from ApiUsageService:', serviceError);

      // If the service fails, return a graceful error response
      return NextResponse.json({
        error: 'Unable to fetch usage data at this time',
        usage: {
          available: null,
          availablePercent: null,
          total: 0,
          monthlyLimit: null,
          resolution,
          lowerBound: usageInput.lowerBound,
          upperBound: usageInput.upperBound,
          combinedUsage: [],
          topUsage: [],
          otherUsage: [],
        },
        summary: {
          totalRequests: 0,
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
          requestsOverTime: [],
          subscriptionsOverTime: [],
          webhooksOverTime: [],
          combinedOverTime: [],
        },
      });
    }
  } catch (error) {
    console.error('Error in analytics API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
