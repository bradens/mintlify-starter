import { redirect } from 'next/navigation';

import { AdminNavigation } from '@/components/admin/admin-navigation';
import { requireAdmin } from '@/lib/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  try {
    // This will throw an error if user is not authenticated or not admin
    await requireAdmin();
  } catch (error) {
    // Redirect to signin with callback URL for admin access
    redirect('/signin?callbackUrl=/admin&error=admin-required');
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <AdminNavigation />
      <main className='py-6'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>{children}</div>
      </main>
    </div>
  );
}
