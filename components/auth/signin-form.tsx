'use client';

import { useState, useTransition } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authNotify, notify } from '@/lib/notifications';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

function SignInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const authError = searchParams.get('error');

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    startTransition(async () => {
      const toastId = authNotify.loading('Signing in');

      try {
        // First, check authentication status directly with our API
        const authCheck = await fetch('/api/auth/check-credentials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
        });

        const authResult = await authCheck.json();

        if (!authCheck.ok) {
          notify.dismiss(toastId);

          // Handle specific authentication errors with notifications
          switch (authResult.error) {
            case 'UserNotConfirmed':
              authNotify.authError({ name: 'UserNotConfirmedException' }, 'Sign in failed');
              return;
            case 'NotAuthorized':
              authNotify.authError({ name: 'NotAuthorizedException' }, 'Sign in failed');
              return;
            case 'UserNotFound':
              authNotify.authError({ name: 'UserNotFoundException' }, 'Sign in failed');
              return;
            case 'PasswordResetRequired':
              authNotify.authError({ name: 'PasswordResetRequiredException' }, 'Sign in failed');
              return;
            case 'TooManyRequests':
              authNotify.authError({ name: 'TooManyRequestsException' }, 'Sign in failed');
              return;
            default:
              authNotify.authError(
                { message: authResult.message || 'Authentication failed' },
                'Sign in failed'
              );
              return;
          }
        }

        // If pre-check passes, proceed with NextAuth signin
        const result = await signIn('credentials', {
          email: data.email,
          password: data.password,
          callbackUrl,
        });

        console.log('signin result: ', result);

        // NextAuth handles the redirect automatically when successful
        notify.dismiss(toastId);
        const userDisplayName = data.email.split('@')[0];
        authNotify.signInSuccess(userDisplayName);
      } catch (error) {
        console.error('Sign in error:', error);
        notify.dismiss(toastId);
        authNotify.authError(error, 'Sign in failed');
      }
    });
  };

  const getErrorMessage = (authError: string | null) => {
    switch (authError) {
      case 'OAuthSignin':
        return 'Error in constructing an authorization URL.';
      case 'OAuthCallback':
        return 'Error in handling the response from an OAuth provider.';
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account.';
      case 'EmailCreateAccount':
        return 'Could not create email account.';
      case 'Callback':
        return 'Error in the OAuth callback handler route.';
      case 'OAuthAccountNotLinked':
        return 'Email on the account is already linked, but not with this OAuth account.';
      case 'EmailSignin':
        return 'Sending the e-mail with the verification token failed.';
      case 'SessionRequired':
        return 'The content of this page requires you to be signed in at all times.';
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'admin-required':
        return (
          <>
            Administrator privileges required to access this area. Please contact your system
            administrator if you believe you should have access.
          </>
        );
      case 'access-denied':
        return (
          <>
            Access denied. You do not have permission to access the requested resource. If you need
            admin access, please contact your system administrator.
          </>
        );
      case 'insufficient-permissions':
        return 'Your account does not have the required permissions for this action.';
      case 'role-required':
        return 'A specific role is required to access this resource.';
      default:
        return authError ? 'An authentication error occurred.' : null;
    }
  };

  const authErrorMessage = getErrorMessage(authError);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your crypto API dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        {authErrorMessage && (
          <Alert variant='destructive' className='mb-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{authErrorMessage}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='email'
                      placeholder='name@example.com'
                      autoComplete='email'
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder='Enter your password'
                        autoComplete='current-password'
                        disabled={isPending}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isPending}
                      >
                        {showPassword ? (
                          <EyeOff className='h-4 w-4' aria-hidden='true' />
                        ) : (
                          <Eye className='h-4 w-4' aria-hidden='true' />
                        )}
                        <span className='sr-only'>
                          {showPassword ? 'Hide password' : 'Show password'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex items-center justify-between'>
              <a href='/forgot-password' className='text-sm text-primary hover:underline'>
                Forgot your password?
              </a>
            </div>

            <Button type='submit' className='w-full' disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </Form>

        <div className='mt-4 text-center text-sm'>
          Don&apos;t have an account?{' '}
          <a href='/signup' className='text-primary hover:underline'>
            Sign up
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function SignInForm() {
  return (
    <AuthErrorBoundary>
      <SignInFormContent />
    </AuthErrorBoundary>
  );
}
