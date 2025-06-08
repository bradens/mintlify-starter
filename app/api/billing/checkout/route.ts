import { NextRequest, NextResponse } from 'next/server';

import { createCheckoutSession } from '@/lib/actions/billing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createCheckoutSession(body);

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/billing/checkout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
