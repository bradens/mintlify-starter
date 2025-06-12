'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authNotify, parseAuthError, getErrorMessage } from '@/lib/notifications';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary specifically designed for authentication flows
 * Provides proper error handling, logging, and recovery options
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Show error notification
    const errorType = parseAuthError(error);
    const message = getErrorMessage(errorType);

    authNotify.authError(error, 'Authentication Error');

    // Log to external service (Sentry, etc.) if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: 'AuthErrorBoundary',
        },
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoToSignIn = () => {
    window.location.href = '/signin';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
          <div className='max-w-md w-full'>
            <Card>
              <CardHeader className='text-center'>
                <div className='flex justify-center mb-4'>
                  <AlertTriangle className='h-12 w-12 text-red-500' />
                </div>
                <CardTitle className='text-2xl'>Authentication Error</CardTitle>
                <CardDescription>
                  Something went wrong with the authentication system
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                <Alert variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    {this.state.error?.message || 'An unexpected authentication error occurred'}
                  </AlertDescription>
                </Alert>

                {/* Error details for development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className='text-sm'>
                    <summary className='cursor-pointer text-gray-600 hover:text-gray-900'>
                      Error Details (Development Only)
                    </summary>
                    <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32'>
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32'>
                        Component Stack:
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}

                {/* Recovery Actions */}
                <div className='space-y-3'>
                  <Button
                    onClick={this.handleRetry}
                    className='w-full'
                    disabled={this.state.retryCount >= 3}
                  >
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {this.state.retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
                  </Button>

                  <div className='grid grid-cols-2 gap-2'>
                    <Button variant='outline' onClick={this.handleGoToSignIn} className='w-full'>
                      <LogIn className='mr-2 h-4 w-4' />
                      Sign In
                    </Button>

                    <Button variant='outline' onClick={this.handleGoHome} className='w-full'>
                      <Home className='mr-2 h-4 w-4' />
                      Home
                    </Button>
                  </div>
                </div>

                {/* Help Text */}
                <div className='text-center text-sm text-gray-600'>
                  <p>If this problem persists, please contact support.</p>
                  {this.state.retryCount > 0 && (
                    <p className='mt-1 text-xs'>Retry attempts: {this.state.retryCount}/3</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary component for functional components
 */
interface AuthErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retryCount?: number;
}

export function AuthErrorFallback({ error, resetError, retryCount = 0 }: AuthErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoToSignIn = () => {
    window.location.href = '/signin';
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <Card>
          <CardHeader className='text-center'>
            <div className='flex justify-center mb-4'>
              <AlertTriangle className='h-12 w-12 text-red-500' />
            </div>
            <CardTitle className='text-2xl'>Authentication Error</CardTitle>
            <CardDescription>Something went wrong during authentication</CardDescription>
          </CardHeader>

          <CardContent className='space-y-4'>
            <Alert variant='destructive'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                {error?.message || 'An unexpected authentication error occurred'}
              </AlertDescription>
            </Alert>

            <div className='space-y-3'>
              <Button onClick={resetError} className='w-full' disabled={retryCount >= 3}>
                <RefreshCw className='mr-2 h-4 w-4' />
                {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
              </Button>

              <div className='grid grid-cols-2 gap-2'>
                <Button variant='outline' onClick={handleGoToSignIn} className='w-full'>
                  <LogIn className='mr-2 h-4 w-4' />
                  Sign In
                </Button>

                <Button variant='outline' onClick={handleGoHome} className='w-full'>
                  <Home className='mr-2 h-4 w-4' />
                  Home
                </Button>
              </div>
            </div>

            <div className='text-center text-sm text-gray-600'>
              <p>If this problem persists, please contact support.</p>
              {retryCount > 0 && <p className='mt-1 text-xs'>Retry attempts: {retryCount}/3</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap components with auth error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: ReactNode
) {
  const WrappedComponent = (props: P) => {
    return (
      <AuthErrorBoundary fallback={errorFallback}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
