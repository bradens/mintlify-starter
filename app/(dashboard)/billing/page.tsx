import { redirect } from 'next/navigation';

import { Metadata } from 'next';

import { auth } from '@/lib/auth';

import { BillingPageClient } from './billing-client';

export const metadata: Metadata = {
  title: 'Billing & Subscription | Dashboard',
  description: 'Manage your subscription, billing, and payment methods',
};

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Billing & Subscription</h1>
        <p className='text-muted-foreground'>
          Manage your subscription, view billing history, and update payment methods.
        </p>
      </div>

      <BillingPageClient user={session.user} />
    </div>
  );
}
