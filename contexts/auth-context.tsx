'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from 'next-auth';
import { SessionProvider, useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { notify, authNotify } from '@/lib/notifications';

// Extended user type with additional properties
export interface ExtendedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
  emailVerified?: Date | null;
  username?: string | null;
}

// Extended session type
export interface ExtendedSession extends Omit<Session, 'user'> {
  user: ExtendedUser;
  accessToken?: string;
}

// Authentication context state
interface AuthContextState {
  // Session data
  session: ExtendedSession | null;
  user: ExtendedUser | null;

  // Loading states
  isLoading: boolean;
  isInitializing: boolean;

  // Authentication status
  isAuthenticated: boolean;
  isEmailVerified: boolean;

  // Role-based access
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;

  // User utilities
  getUserDisplayName: () => string;
  getUserInitials: () => string;

  // Authentication actions
  signOut: (options?: { callbackUrl?: string; redirect?: boolean }) => Promise<void>;
  refreshSession: () => Promise<void>;

  // Navigation helpers
  redirectToSignIn: (callbackUrl?: string) => void;
  redirectToSignUp: (callbackUrl?: string) => void;
  redirectToAdmin: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextState | undefined>(undefined);

// Authentication provider props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Internal auth provider that uses NextAuth session
function InternalAuthProvider({ children }: AuthProviderProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  // Handle initialization
  useEffect(() => {
    if (status !== 'loading') {
      setIsInitializing(false);
    }
  }, [status]);

  // Cast session to our extended type
  const extendedSession = session as ExtendedSession | null;
  const user = extendedSession?.user || null;

  // Loading states
  const isLoading = status === 'loading';
  const isAuthenticated = !!user;
  const isEmailVerified = !!user?.emailVerified;
  const isAdmin = user?.role === 'admin';

  // Role checking functions
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated) return false;

    // Admin users have all permissions
    if (isAdmin) return true;

    // Define permission logic
    switch (permission) {
      case 'view_dashboard':
        return isEmailVerified;
      case 'manage_api_keys':
        return isEmailVerified;
      case 'view_usage':
        return isEmailVerified;
      case 'manage_billing':
        return isEmailVerified;
      case 'manage_profile':
        return isAuthenticated;
      case 'admin_access':
        return isAdmin;
      case 'manage_users':
        return isAdmin;
      case 'view_analytics':
        return isAdmin;
      default:
        return false;
    }
  };

  // User utility functions
  const getUserDisplayName = (): string => {
    if (!user) return 'Guest';
    return user.name || user.email || 'User';
  };

  const getUserInitials = (): string => {
    if (!user) return 'G';

    const name = user.name || user.email || 'User';

    if (name.includes(' ')) {
      const parts = name.split(' ');
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  };

  // Authentication actions
  const signOut = async (options?: { callbackUrl?: string; redirect?: boolean }): Promise<void> => {
    const toastId = authNotify.loading('Signing out');

    try {
      const { callbackUrl = '/signin', redirect = true } = options || {};

      // Call our custom sign-out endpoint for additional cleanup
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Use NextAuth's signOut with proper typing
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

      // Show success notification
      notify.dismiss(toastId);
      authNotify.signOutSuccess();
    } catch (error) {
      console.error('Sign out error:', error);
      notify.dismiss(toastId);
      authNotify.authError(error, 'Sign out failed');

      // Fallback to NextAuth signOut with proper typing
      try {
        if (options?.redirect !== false) {
          await nextAuthSignOut({
            callbackUrl: options?.callbackUrl || '/signin',
            redirect: true,
          });
        } else {
          await nextAuthSignOut({
            callbackUrl: options?.callbackUrl || '/signin',
            redirect: false,
          });
        }
      } catch (fallbackError) {
        console.error('Fallback sign out error:', fallbackError);
        authNotify.authError(fallbackError, 'Sign out fallback failed');

        // Last resort: manual redirect
        if (options?.redirect !== false) {
          window.location.href = options?.callbackUrl || '/signin';
        }
      }
    }
  };

  const refreshSession = async (): Promise<void> => {
    try {
      await update();
      authNotify.sessionRefreshed();
    } catch (error) {
      console.error('Session refresh error:', error);
      authNotify.authError(error, 'Session refresh failed');
    }
  };

  // Navigation helpers
  const redirectToSignIn = (callbackUrl?: string): void => {
    const url = new URL('/signin', window.location.origin);
    if (callbackUrl) {
      url.searchParams.set('callbackUrl', callbackUrl);
    }
    router.push(url.toString());
  };

  const redirectToSignUp = (callbackUrl?: string): void => {
    const url = new URL('/signup', window.location.origin);
    if (callbackUrl) {
      url.searchParams.set('callbackUrl', callbackUrl);
    }
    router.push(url.toString());
  };

  const redirectToAdmin = (): void => {
    if (isAdmin) {
      router.push('/admin');
    } else {
      router.push('/dashboard?error=access-denied');
    }
  };

  // Context value
  const contextValue: AuthContextState = {
    // Session data
    session: extendedSession,
    user,

    // Loading states
    isLoading,
    isInitializing,

    // Authentication status
    isAuthenticated,
    isEmailVerified,

    // Role-based access
    isAdmin,
    hasRole,
    hasAnyRole,
    hasPermission,

    // User utilities
    getUserDisplayName,
    getUserInitials,

    // Authentication actions
    signOut,
    refreshSession,

    // Navigation helpers
    redirectToSignIn,
    redirectToSignUp,
    redirectToAdmin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Main auth provider that wraps NextAuth SessionProvider
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <InternalAuthProvider>
        {children}
      </InternalAuthProvider>
    </SessionProvider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}

export function useIsAdmin() {
  const { isAdmin, isLoading } = useAuth();
  return { isAdmin, isLoading };
}

export function usePermissions() {
  const { hasPermission, hasRole, hasAnyRole, isLoading } = useAuth();
  return { hasPermission, hasRole, hasAnyRole, isLoading };
}

// Higher-order component for authentication
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    requireAdmin?: boolean;
    requiredRoles?: string[];
    requiredPermissions?: string[];
  }
) {
  const AuthenticatedComponent = (props: P) => {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!auth.isLoading && !auth.isInitializing) {
        // Check authentication
        if (!auth.isAuthenticated) {
          const redirectUrl = options?.redirectTo || '/signin';
          const callbackUrl = encodeURIComponent(window.location.pathname);
          router.push(`${redirectUrl}?callbackUrl=${callbackUrl}`);
          return;
        }

        // Check admin requirement
        if (options?.requireAdmin && !auth.isAdmin) {
          router.push('/dashboard?error=admin-required');
          return;
        }

        // Check role requirements
        if (options?.requiredRoles && !auth.hasAnyRole(options.requiredRoles)) {
          router.push('/dashboard?error=insufficient-role');
          return;
        }

        // Check permission requirements
        if (options?.requiredPermissions) {
          const hasAllPermissions = options.requiredPermissions.every(permission =>
            auth.hasPermission(permission)
          );
          if (!hasAllPermissions) {
            router.push('/dashboard?error=insufficient-permissions');
            return;
          }
        }
      }
    }, [auth, router]);

    // Show loading state
    if (auth.isLoading || auth.isInitializing) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Show component if all checks pass
    return <Component {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return AuthenticatedComponent;
}