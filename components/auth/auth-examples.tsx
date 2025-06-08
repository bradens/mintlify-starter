'use client';

import React from 'react';

import { Shield, Key, BarChart3, Users, AlertTriangle } from 'lucide-react';

import { AuthGuard, AdminOnly } from '@/components/auth/auth-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, withAuth } from '@/contexts/auth-context';

/**
 * Example: Basic auth context usage
 */
export function UserInfoCard() {
  const {
    user,
    isAuthenticated,
    isLoading,
    getUserDisplayName,
    getUserInitials,
    isAdmin,
    isEmailVerified,
  } = useAuth();

  if (isLoading) {
    return <div>Loading user info...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please sign in to view your information.</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
            <span className='text-sm font-medium text-blue-600'>{getUserInitials()}</span>
          </div>
          <span>{getUserDisplayName()}</span>
        </CardTitle>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <div className='flex items-center space-x-2'>
            <strong>Role:</strong>
            {isAdmin ? (
              <Badge variant='default' className='bg-purple-100 text-purple-800'>
                <Shield className='w-3 h-3 mr-1' />
                Administrator
              </Badge>
            ) : (
              <Badge variant='outline'>User</Badge>
            )}
          </div>
          <div className='flex items-center space-x-2'>
            <strong>Status:</strong>
            {isEmailVerified ? (
              <Badge variant='default' className='bg-green-100 text-green-800'>
                Verified
              </Badge>
            ) : (
              <Badge variant='destructive'>Not Verified</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example: Permission-based component visibility
 */
export function PermissionBasedActions() {
  const { hasPermission, redirectToAdmin } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Actions</CardTitle>
        <CardDescription>Actions based on your permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-3'>
          {hasPermission('manage_api_keys') && (
            <Button variant='outline' className='justify-start'>
              <Key className='w-4 h-4 mr-2' />
              Manage API Keys
            </Button>
          )}

          {hasPermission('view_usage') && (
            <Button variant='outline' className='justify-start'>
              <BarChart3 className='w-4 h-4 mr-2' />
              View Usage Analytics
            </Button>
          )}

          {hasPermission('admin_access') && (
            <Button variant='outline' className='justify-start' onClick={redirectToAdmin}>
              <Shield className='w-4 h-4 mr-2' />
              Admin Panel
            </Button>
          )}

          {hasPermission('manage_users') && (
            <Button variant='outline' className='justify-start'>
              <Users className='w-4 h-4 mr-2' />
              Manage Users
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
