'use client';

import { useState, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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

// Password validation schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type ResetState = 'validating' | 'valid' | 'invalid' | 'success' | 'error';

interface TokenValidationResult {
  valid: boolean;
  message: string;
  email?: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetState, setResetState] = useState<ResetState>('validating');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<TokenValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get parameters from URL
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Validate token on page load
  useEffect(() => {
    if (!token || !email) {
      setResetState('invalid');
      setTokenValidation({
        valid: false,
        message: 'Invalid reset link. Please request a new password reset.',
      });
      return;
    }

    validateToken();
  }, [token, email]);

  const validateToken = async () => {
    try {
      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
        }),
      });

      const result = await response.json();

      if (result.valid) {
        setResetState('valid');
        setTokenValidation({
          valid: true,
          message: 'Token is valid. Please enter your new password.',
          email: result.email,
        });
      } else {
        setResetState('invalid');
        setTokenValidation({
          valid: false,
          message: result.message || 'Invalid or expired reset token.',
        });
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setResetState('invalid');
      setTokenValidation({
        valid: false,
        message: 'Unable to validate reset token. Please try again.',
      });
    }
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setError(null);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResetState('success');
      } else {
        setError(result.message || 'Password reset failed. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const getIcon = () => {
    switch (resetState) {
      case 'validating':
        return <Loader2 className='h-8 w-8 animate-spin text-blue-600' />;
      case 'valid':
        return <Lock className='h-8 w-8 text-blue-600' />;
      case 'success':
        return <CheckCircle2 className='h-8 w-8 text-green-600' />;
      case 'invalid':
      case 'error':
      default:
        return <AlertCircle className='h-8 w-8 text-red-600' />;
    }
  };

  const getTitle = () => {
    switch (resetState) {
      case 'validating':
        return 'Validating Reset Token...';
      case 'valid':
        return 'Reset Your Password';
      case 'success':
        return 'Password Reset Successful!';
      case 'invalid':
        return 'Invalid Reset Link';
      case 'error':
      default:
        return 'Password Reset Failed';
    }
  };

  const getDescription = () => {
    switch (resetState) {
      case 'validating':
        return 'Please wait while we validate your reset token.';
      case 'valid':
        return 'Enter your new password below.';
      case 'success':
        return 'Your password has been successfully reset. You can now sign in with your new password.';
      case 'invalid':
        return 'This reset link is invalid or has expired.';
      case 'error':
      default:
        return 'There was an error resetting your password.';
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <Card>
          <CardHeader className='text-center'>
            <div className='flex justify-center mb-4'>{getIcon()}</div>
            <CardTitle className='text-2xl'>{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
            {tokenValidation?.email && (
              <p className='text-sm text-gray-600 mt-2'>{tokenValidation.email}</p>
            )}
          </CardHeader>

          <CardContent className='space-y-4'>
            {tokenValidation && (
              <Alert variant={tokenValidation.valid ? 'default' : 'destructive'}>
                <AlertDescription>{tokenValidation.message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {resetState === 'valid' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder='Enter your new password'
                              autoComplete='new-password'
                              disabled={form.formState.isSubmitting}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={form.formState.isSubmitting}
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

                  <FormField
                    control={form.control}
                    name='confirmPassword'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder='Confirm your new password'
                              autoComplete='new-password'
                              disabled={form.formState.isSubmitting}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={form.formState.isSubmitting}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className='h-4 w-4' aria-hidden='true' />
                              ) : (
                                <Eye className='h-4 w-4' aria-hidden='true' />
                              )}
                              <span className='sr-only'>
                                {showConfirmPassword ? 'Hide password' : 'Show password'}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type='submit' className='w-full' disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className='space-y-3'>
              {resetState === 'success' && (
                <Button onClick={() => router.push('/signin')} className='w-full'>
                  Continue to Sign In
                </Button>
              )}

              {(resetState === 'invalid' || resetState === 'error') && (
                <Button
                  variant='outline'
                  onClick={() => router.push('/forgot-password')}
                  className='w-full'
                >
                  Request New Password Reset
                </Button>
              )}

              <Button variant='ghost' onClick={() => router.push('/signin')} className='w-full'>
                Back to Sign In
              </Button>
            </div>

            {resetState === 'valid' && (
              <div className='text-center text-sm text-gray-600 mt-4'>
                <p className='font-medium mb-2'>Password Requirements:</p>
                <ul className='text-left space-y-1'>
                  <li>• At least 8 characters long</li>
                  <li>• One uppercase letter (A-Z)</li>
                  <li>• One lowercase letter (a-z)</li>
                  <li>• One number (0-9)</li>
                  <li>• One special character (!@#$%^&*)</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
