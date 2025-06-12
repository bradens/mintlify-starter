'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2 } from 'lucide-react';

import { useCurrentUser } from '@/lib/auth-utils';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Redirect authenticated users to dashboard
        router.replace('/dashboard');
      } else {
        // Redirect unauthenticated users to signin
        router.replace('/signin');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  return (
    <div className='min-h-screen flex items-center justify-center bg-background'>
      <div className='flex flex-col items-center space-y-4'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    </div>
  );
}
