/**
 * Client-side authentication utilities
 */

'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { signOut as nextAuthSignOut, useSession } from 'next-auth/react';

/**
 * Sign out the current user with proper cleanup
 */
export async function signOut(options?: {
  callbackUrl?: string;
  redirect?: boolean;
}): Promise<void> {
  try {
    const { callbackUrl = '/signin', redirect = true } = options || {};

    // Use NextAuth's signOut for proper session cleanup
    if (redirect) {
      await nextAuthSignOut({
        callbackUrl,
        redirect: true,
      });
    } else {
      await nextAuthSignOut({
        callbackUrl,
        redirect: false,
      });
    }
  } catch (error) {
    console.error('Sign out error:', error);

    // Last resort: manually redirect to sign-in page
    if (options?.redirect !== false) {
      window.location.href = options?.callbackUrl || '/signin';
    }
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(session: any): boolean {
  return !!session?.user?.id;
}

/**
 * Check if user is admin
 */
export function isAdmin(session: any): boolean {
  return session?.user?.role === 'admin';
}

/**
 * Check if user's email is verified
 */
export function isEmailVerified(session: any): boolean {
  return !!session?.user?.emailVerified;
}

/**
 * Get user display name
 */
export function getUserDisplayName(session: any): string {
  if (!session?.user) {
    return 'Guest';
  }

  return session.user.name || session.user.email || 'User';
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(session: any): string {
  if (!session?.user) {
    return 'G';
  }

  const name = session.user.name || session.user.email || 'User';

  if (name.includes(' ')) {
    const parts = name.split(' ');
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

/**
 * Format user role for display
 */
export function formatUserRole(session: any): string {
  const role = session?.user?.role || 'user';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Check if user has specific permission
 * This can be extended as needed for fine-grained permissions
 */
export function hasPermission(session: any, permission: string): boolean {
  if (!isAuthenticated(session)) {
    return false;
  }

  // Admin users have all permissions
  if (isAdmin(session)) {
    return true;
  }

  // Add specific permission logic here
  switch (permission) {
    case 'view_dashboard':
      return isEmailVerified(session);
    case 'manage_api_keys':
      return isEmailVerified(session);
    case 'view_usage':
      return isEmailVerified(session);
    case 'manage_billing':
      return isEmailVerified(session);
    case 'admin_access':
      return isAdmin(session);
    default:
      return false;
  }
}

/**
 * Redirect to sign-in with callback URL
 */
export function redirectToSignIn(callbackUrl?: string): void {
  const url = new URL('/signin', window.location.origin);
  if (callbackUrl) {
    url.searchParams.set('callbackUrl', callbackUrl);
  }
  window.location.href = url.toString();
}

/**
 * Redirect to sign-up with callback URL
 */
export function redirectToSignUp(callbackUrl?: string): void {
  const url = new URL('/signup', window.location.origin);
  if (callbackUrl) {
    url.searchParams.set('callbackUrl', callbackUrl);
  }
  window.location.href = url.toString();
}

/**
 * Hook to get the current user session
 */
export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
  };
}

/**
 * Hook to check if current user is admin
 */
export function useIsAdmin() {
  const { user, isLoading } = useCurrentUser();
  return {
    isAdmin: user?.role === 'admin',
    isLoading,
  };
}

/**
 * Hook to require authentication and redirect if not authenticated
 */
export function useRequireAuth(redirectTo = '/signin') {
  const { isAuthenticated, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook to require admin role and redirect if not admin
 */
export function useRequireAdmin(redirectTo = '/dashboard?error=access-denied') {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated, redirect to signin with admin callback
        router.push('/signin?callbackUrl=/admin&error=admin-required');
      } else if (user.role !== 'admin') {
        // Authenticated but not admin
        router.push(redirectTo);
      }
    }
  }, [user, isLoading, router, redirectTo]);

  return {
    isAdmin: user?.role === 'admin',
    isLoading,
    user,
  };
}

/**
 * Check if user has specific role
 */
export function hasRole(user: any, role: string): boolean {
  return user?.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: any, roles: string[]): boolean {
  return roles.some(role => hasRole(user, role));
}

/**
 * Get display name for user role
 */
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'user':
      return 'User';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

/**
 * Get role color for UI elements
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'purple';
    case 'user':
      return 'blue';
    default:
      return 'gray';
  }
}
