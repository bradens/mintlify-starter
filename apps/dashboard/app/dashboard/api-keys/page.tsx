import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

import { ApiKeysPageClient } from './api-keys-client';
import { ApiKeysPageSkeleton } from './api-keys-skeleton';

export default async function ApiKeysPage() {
  // Server-side authentication check
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/api-keys');
  }

  return (
    <div className='container mx-auto py-8 space-y-6'>
      {/* Server-rendered static content */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>API Keys</h1>
          <p className='text-muted-foreground'>
            Manage your API keys to access our crypto data services
          </p>
        </div>
      </div>

      {/* Client component for interactive functionality */}
      <Suspense fallback={<ApiKeysPageSkeleton />}>
        <ApiKeysPageClient user={session.user} />
      </Suspense>
    </div>
  );
}
