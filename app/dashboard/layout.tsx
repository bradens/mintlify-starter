import { redirect } from 'next/navigation';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { auth } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Server-side authentication check
  const session = await auth();

  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  return (
    <div className='min-h-screen bg-background'>
      <DashboardNavigation />
      <main>{children}</main>
    </div>
  );
}