import { NextRequest, NextResponse } from 'next/server';

import { getRealTimeMetrics } from '@/lib/actions/usage';

export async function GET(request: NextRequest) {
  try {
    const result = await getRealTimeMetrics({});

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch real-time metrics' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
