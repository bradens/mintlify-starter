import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

import { DashboardPageClient } from './dashboard-client';
import { DashboardPageSkeleton } from './dashboard-skeleton';

export default async function DashboardPage() {
  // Server-side authentication check
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  return (
    <div className='container mx-auto py-8 space-y-6'>
      {/* Server-rendered static content */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Dashboard</h1>
          <p className='text-muted-foreground'>
            Overview of your API keys, usage statistics, and account activity
          </p>
        </div>
      </div>

      {/* Client component for interactive functionality */}
      <Suspense fallback={<DashboardPageSkeleton />}>
        <DashboardPageClient user={session.user} />
      </Suspense>
    </div>
  );
}