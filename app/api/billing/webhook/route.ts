import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { StripeEventService } from '@company-z/api-management-library';

import { getService } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Get StripeEventService from DI container
    const stripeEventService = getService<StripeEventService>(SYMBOLS.StripeEventService);

    // Construct and verify the event
    const event = stripeEventService.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle the event
    await stripeEventService.handle(event);

    // Return success response to Stripe
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);

    // Return error response - Stripe will retry the webhook
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
