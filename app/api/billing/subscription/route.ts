import { NextResponse } from 'next/server';

import { getSubscription } from '@/lib/actions/billing';

export async function GET() {
  try {
    const result = await getSubscription();

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET /api/billing/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



