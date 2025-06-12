import { Suspense } from 'react';

import Link from 'next/link';

import { Search, Filter, Plus, MoreHorizontal, Mail, Shield, User } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock user data (this would come from your data layer)
async function getUsers() {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));

  return [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'user',
      status: 'active',
      emailVerified: true,
      apiKeys: 3,
      lastActivity: '2 hours ago',
      joinedAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      apiKeys: 5,
      lastActivity: '1 day ago',
      joinedAt: '2024-01-10',
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob.johnson@startup.io',
      role: 'user',
      status: 'suspended',
      emailVerified: false,
      apiKeys: 1,
      lastActivity: '5 days ago',
      joinedAt: '2024-01-20',
    },
    {
      id: '4',
      name: 'Alice Brown',
      email: 'alice.brown@tech.co',
      role: 'user',
      status: 'active',
      emailVerified: true,
      apiKeys: 2,
      lastActivity: '3 hours ago',
      joinedAt: '2024-01-12',
    },
    {
      id: '5',
      name: 'Charlie Wilson',
      email: 'charlie@example.org',
      role: 'user',
      status: 'inactive',
      emailVerified: true,
      apiKeys: 0,
      lastActivity: '2 weeks ago',
      joinedAt: '2024-01-08',
    },
  ];
}

function UsersTableSkeleton() {
  return (
    <div className='space-y-3'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-center space-x-4 py-4'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='space-y-2'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-3 w-48' />
          </div>
          <div className='ml-auto flex items-center space-x-2'>
            <Skeleton className='h-6 w-16' />
            <Skeleton className='h-6 w-20' />
          </div>
        </div>
      ))}
    </div>
  );
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

async function UsersTable() {
  const users = await getUsers();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>API Keys</TableHead>
          <TableHead>Last Activity</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell>
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center'>
                  <User className='w-4 h-4 text-gray-600' />
                </div>
                <div>
                  <p className='font-medium'>{user.name}</p>
                  <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                    <span>{user.email}</span>
                    {user.emailVerified && <Mail className='w-3 h-3 text-green-600' />}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>{getRoleBadge(user.role)}</TableCell>
            <TableCell>{getStatusBadge(user.status)}</TableCell>
            <TableCell>
              <span className='font-medium'>{user.apiKeys}</span>
            </TableCell>
            <TableCell className='text-muted-foreground'>{user.lastActivity}</TableCell>
            <TableCell className='text-right'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className='h-8 w-8 p-0'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Edit User</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Suspend User</DropdownMenuItem>
                  <DropdownMenuItem className='text-red-600'>Delete User</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminUsersPage() {
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>User Management</h1>
          <p className='text-muted-foreground'>Manage user accounts, roles, and permissions.</p>
        </div>
        <Button>
          <Plus className='mr-2 h-4 w-4' />
          Add User
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>A list of all users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center space-x-2 mb-4'>
            <div className='relative flex-1 max-w-sm'>
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input placeholder='Search users...' className='pl-8' />
            </div>
            <Button variant='outline' size='sm'>
              <Filter className='mr-2 h-4 w-4' />
              Filter
            </Button>
          </div>

          {/* Users Table */}
          <Suspense fallback={<UsersTableSkeleton />}>
            <UsersTable />
          </Suspense>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Users</CardTitle>
            <User className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>1,247</div>
            <p className='text-xs text-muted-foreground'>+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Admin Users</CardTitle>
            <Shield className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>12</div>
            <p className='text-xs text-muted-foreground'>No change from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active This Month</CardTitle>
            <User className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>892</div>
            <p className='text-xs text-muted-foreground'>+8% from last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
