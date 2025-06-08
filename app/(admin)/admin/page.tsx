import { Suspense } from 'react';

import { Users, Key, BarChart3, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Admin stats overview (these would normally come from your data layer)
async function getAdminStats() {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    totalUsers: 1247,
    activeApiKeys: 342,
    totalRequests: 15678,
    alertsCount: 3,
  };
}

function AdminStatsSkeleton() {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-4 w-4' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-8 w-16 mb-1' />
            <Skeleton className='h-3 w-24' />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function AdminStats() {
  const stats = await getAdminStats();

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      description: '+12% from last month',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Active API Keys',
      value: stats.activeApiKeys.toLocaleString(),
      description: '+5% from last month',
      icon: Key,
      color: 'text-green-600',
    },
    {
      title: 'API Requests',
      value: stats.totalRequests.toLocaleString(),
      description: '+24% from last month',
      icon: BarChart3,
      color: 'text-purple-600',
    },
    {
      title: 'Active Alerts',
      value: stats.alertsCount.toString(),
      description: '2 require attention',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {statCards.map(card => (
        <Card key={card.title}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{card.value}</div>
            <p className='text-xs text-muted-foreground'>{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Admin Dashboard</h1>
        <p className='text-muted-foreground'>Overview of system statistics and management tools.</p>
      </div>

      {/* Stats Overview */}
      <Suspense fallback={<AdminStatsSkeleton />}>
        <AdminStats />
      </Suspense>

      {/* Quick Actions */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card className='hover:shadow-md transition-shadow cursor-pointer'>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Users className='h-5 w-5 text-blue-600' />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>
              View and manage user accounts, permissions, and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>1,247 total users • 89 new this month</p>
          </CardContent>
        </Card>

        <Card className='hover:shadow-md transition-shadow cursor-pointer'>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <BarChart3 className='h-5 w-5 text-purple-600' />
              <span>Analytics</span>
            </CardTitle>
            <CardDescription>
              Detailed analytics and usage patterns across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>15,678 API calls today • +24% growth</p>
          </CardContent>
        </Card>

        <Card className='hover:shadow-md transition-shadow cursor-pointer'>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <AlertTriangle className='h-5 w-5 text-red-600' />
              <span>System Alerts</span>
            </CardTitle>
            <CardDescription>Monitor system health and respond to critical issues</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              3 active alerts • 2 require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system events and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[
              {
                action: 'New user registration',
                user: 'john.doe@example.com',
                time: '2 minutes ago',
                type: 'success',
              },
              {
                action: 'API key created',
                user: 'jane.smith@company.com',
                time: '15 minutes ago',
                type: 'info',
              },
              {
                action: 'Rate limit exceeded',
                user: 'api-user@startup.io',
                time: '32 minutes ago',
                type: 'warning',
              },
              {
                action: 'User account suspended',
                user: 'suspicious@domain.com',
                time: '1 hour ago',
                type: 'error',
              },
            ].map((activity, index) => (
              <div key={index} className='flex items-center justify-between py-2'>
                <div className='flex items-center space-x-3'>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'warning'
                          ? 'bg-yellow-500'
                          : activity.type === 'error'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <p className='text-sm font-medium'>{activity.action}</p>
                    <p className='text-xs text-muted-foreground'>{activity.user}</p>
                  </div>
                </div>
                <p className='text-xs text-muted-foreground'>{activity.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
