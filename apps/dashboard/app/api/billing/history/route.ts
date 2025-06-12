import { NextRequest, NextResponse } from 'next/server';

import { getBillingHistory } from '@/lib/actions/billing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await getBillingHistory(limit);

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET /api/billing/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
