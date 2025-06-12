import { Suspense } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ArrowLeft,
  Mail,
  Calendar,
  Key,
  Activity,
  Shield,
  User,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

// Mock user data (this would come from your data layer)
async function getUser(id: string) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Mock data - in real app, fetch from database
  const users = {
    '1': {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'user',
      status: 'active',
      emailVerified: true,
      joinedAt: '2024-01-15T10:30:00Z',
      lastActivity: '2024-01-25T14:22:00Z',
      apiKeys: [
        { id: 'key1', name: 'Production API', createdAt: '2024-01-20', lastUsed: '2 hours ago' },
        { id: 'key2', name: 'Development API', createdAt: '2024-01-22', lastUsed: '1 day ago' },
        { id: 'key3', name: 'Testing API', createdAt: '2024-01-24', lastUsed: '3 days ago' },
      ],
      usage: {
        totalRequests: 15420,
        monthlyRequests: 3210,
        averageDaily: 107,
      },
      activity: [
        {
          action: 'API key created',
          timestamp: '2024-01-24T16:30:00Z',
          details: 'Testing API key',
        },
        { action: 'Login', timestamp: '2024-01-24T09:15:00Z', details: 'Web dashboard' },
        { action: 'API request', timestamp: '2024-01-24T08:45:00Z', details: '1,247 requests' },
        {
          action: 'Profile updated',
          timestamp: '2024-01-23T14:20:00Z',
          details: 'Changed email preferences',
        },
      ],
    },
    '2': {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      joinedAt: '2024-01-10T08:00:00Z',
      lastActivity: '2024-01-24T11:30:00Z',
      apiKeys: [
        { id: 'key4', name: 'Admin API', createdAt: '2024-01-12', lastUsed: '1 day ago' },
        { id: 'key5', name: 'Monitoring API', createdAt: '2024-01-15', lastUsed: '5 hours ago' },
      ],
      usage: {
        totalRequests: 28950,
        monthlyRequests: 5430,
        averageDaily: 181,
      },
      activity: [
        {
          action: 'User suspended',
          timestamp: '2024-01-24T10:15:00Z',
          details: 'Suspended user bob.johnson@startup.io',
        },
        { action: 'Login', timestamp: '2024-01-24T08:30:00Z', details: 'Admin panel' },
        { action: 'API request', timestamp: '2024-01-23T16:20:00Z', details: '892 requests' },
      ],
    },
  };

  return users[id as keyof typeof users] || null;
}

function UserDetailSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-6 w-6' />
        <Skeleton className='h-8 w-48' />
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-16' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge variant='default' className='bg-green-100 text-green-800'>
          Active
        </Badge>
      );
    case 'inactive':
      return <Badge variant='secondary'>Inactive</Badge>;
    case 'suspended':
      return <Badge variant='destructive'>Suspended</Badge>;
    default:
      return <Badge variant='outline'>{status}</Badge>;
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'admin':
      return (
        <Badge variant='default' className='bg-purple-100 text-purple-800'>
          Admin
        </Badge>
      );
    case 'user':
      return <Badge variant='outline'>User</Badge>;
    default:
      return <Badge variant='outline'>{role}</Badge>;
  }
}

async function UserDetail({ userId }: { userId: string }) {
  const user = await getUser(userId);

  if (!user) {
    notFound();
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <Link href='/admin/users'>
            <Button variant='ghost' size='sm'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>{user.name}</h1>
            <p className='text-muted-foreground'>{user.email}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline'>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit User</DropdownMenuItem>
            <DropdownMenuItem>Reset Password</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Suspend User</DropdownMenuItem>
            <DropdownMenuItem className='text-red-600'>Delete User</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* User Info Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Status</CardTitle>
            <User className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {getStatusBadge(user.status)}
              {getRoleBadge(user.role)}
              {user.emailVerified && (
                <div className='flex items-center space-x-1 text-sm text-green-600'>
                  <Mail className='h-3 w-3' />
                  <span>Email Verified</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Account Info</CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='space-y-1'>
              <p className='text-sm'>
                <span className='text-muted-foreground'>Joined:</span> {formatDate(user.joinedAt)}
              </p>
              <p className='text-sm'>
                <span className='text-muted-foreground'>Last Active:</span>{' '}
                {formatDate(user.lastActivity)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>API Usage</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='space-y-1'>
              <p className='text-2xl font-bold'>{user.usage.totalRequests.toLocaleString()}</p>
              <p className='text-xs text-muted-foreground'>Total requests</p>
              <p className='text-sm text-muted-foreground'>
                {user.usage.monthlyRequests.toLocaleString()} this month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Key className='h-5 w-5' />
            <span>API Keys ({user.apiKeys.length})</span>
          </CardTitle>
          <CardDescription>Active API keys for this user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {user.apiKeys.map(apiKey => (
              <div
                key={apiKey.id}
                className='flex items-center justify-between p-3 border rounded-lg'
              >
                <div>
                  <p className='font-medium'>{apiKey.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    Created {apiKey.createdAt} • Last used {apiKey.lastUsed}
                  </p>
                </div>
                <Button variant='ghost' size='sm'>
                  Manage
                </Button>
              </div>
            ))}
            {user.apiKeys.length === 0 && (
              <p className='text-center text-muted-foreground py-6'>No API keys found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Activity className='h-5 w-5' />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>Latest actions performed by this user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {user.activity.map((activity, index) => (
              <div key={index} className='flex items-start space-x-3'>
                <div className='w-2 h-2 rounded-full bg-blue-500 mt-2' />
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium'>{activity.action}</p>
                  <p className='text-sm text-muted-foreground'>{activity.details}</p>
                  <p className='text-xs text-muted-foreground'>{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      <UserDetail userId={params.id} />
    </Suspense>
  );
}
