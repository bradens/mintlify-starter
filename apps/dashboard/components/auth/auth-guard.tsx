'use client';

import React from 'react';

import { useCurrentUser, useIsAdmin, hasAnyRole } from '@/lib/auth-utils';

/**
 * Admin role checker component
 * Renders children only if user is admin
 */
interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Role-based access control component
 */
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !hasAnyRole(user, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Authentication guard component
 * Renders children only if user is authenticated
 */
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
