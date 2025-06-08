import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

import { UsagePageClient } from './usage-client';
import { UsagePageSkeleton } from './usage-skeleton';

export default async function UsagePage() {
  // Server-side authentication check
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/usage');
  }

  return (
    <div className='container mx-auto py-8 space-y-6'>
      {/* Server-rendered static content */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Usage Analytics</h1>
          <p className='text-muted-foreground'>
            Monitor your API usage, performance metrics, and trends
          </p>
        </div>
      </div>

      {/* Client component for interactive functionality */}
      <Suspense fallback={<UsagePageSkeleton />}>
        <UsagePageClient user={session.user} />
      </Suspense>
    </div>
  );
}
