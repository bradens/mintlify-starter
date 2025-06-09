'use client';

import { useEffect, useState, Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
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

type ConfirmationState = 'pending' | 'success' | 'error' | 'expired' | 'already_confirmed';

interface ConfirmationResult {
  success: boolean;
  state: ConfirmationState;
  message: string;
  email?: string;
}

// Form validation schema for manual code entry
const codeSchema = z.object({
  code: z
    .string()
    .length(6, 'Confirmation code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only numbers'),
});

type CodeFormData = z.infer<typeof codeSchema>;

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);

  // Get parameters from URL
  const email = searchParams.get('email');
  const token = searchParams.get('token');
  const username = searchParams.get('username');

  // Form for manual code entry
  const form = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    // If we have a token, attempt to confirm automatically
    if (token) {
      confirmEmail(token);
    } else if (email) {
      // Show manual code entry form if we only have email
      setShowCodeForm(true);
      setConfirmationResult({
        success: false,
        state: 'pending',
        message: 'Enter the 6-digit confirmation code from your email.',
        email,
      });
    }
  }, [token, email]);

  const confirmEmail = async (confirmationToken: string) => {
    try {
      // Call Cognito to confirm the email
      const response = await fetch('/api/auth/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: confirmationToken,
          username: username || email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConfirmationResult({
          success: true,
          state: 'success',
          message: 'Your email has been successfully confirmed! You can now sign in.',
          email: email || undefined,
        });
        setShowCodeForm(false);
      } else {
        // Handle different error states
        let state: ConfirmationState = 'error';
        let message = result.message || 'Email confirmation failed.';

        if (result.error === 'EXPIRED_TOKEN') {
          state = 'expired';
          message = 'The confirmation code has expired. Please request a new one.';
        } else if (result.error === 'ALREADY_CONFIRMED') {
          state = 'already_confirmed';
          message = 'This email has already been confirmed. You can sign in now.';
          setShowCodeForm(false);
        } else if (result.error === 'INVALID_TOKEN') {
          message = 'Invalid confirmation code. Please check the code and try again.';
        }

        setConfirmationResult({
          success: false,
          state,
          message,
          email: email || undefined,
        });
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      setConfirmationResult({
        success: false,
        state: 'error',
        message: 'An unexpected error occurred. Please try again.',
        email: email || undefined,
      });
    }
  };

  const onSubmitCode = async (data: CodeFormData) => {
    await confirmEmail(data.code);
  };

  const resendConfirmationEmail = async () => {
    if (!email && !username) {
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username || email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConfirmationResult({
          success: false,
          state: 'pending',
          message: 'A new confirmation email has been sent. Please check your inbox.',
          email: email || undefined,
        });
        // Reset the form
        form.reset();
      } else {
        setConfirmationResult({
          success: false,
          state: 'error',
          message: result.message || 'Failed to resend confirmation email.',
          email: email || undefined,
        });
      }
    } catch (error) {
      console.error('Resend error:', error);
      setConfirmationResult({
        success: false,
        state: 'error',
        message: 'Failed to resend confirmation email. Please try again.',
        email: email || undefined,
      });
    } finally {
      setIsResending(false);
    }
  };

  const getIcon = () => {
    if (!confirmationResult) {
      return <Loader2 className='h-8 w-8 animate-spin text-blue-600' />;
    }

    switch (confirmationResult.state) {
      case 'success':
      case 'already_confirmed':
        return <CheckCircle2 className='h-8 w-8 text-green-600' />;
      case 'pending':
        return <Mail className='h-8 w-8 text-blue-600' />;
      case 'error':
      case 'expired':
      default:
        return <AlertCircle className='h-8 w-8 text-red-600' />;
    }
  };

  const getTitle = () => {
    if (!confirmationResult) {
      return 'Confirming your email...';
    }

    switch (confirmationResult.state) {
      case 'success':
        return 'Email Confirmed!';
      case 'already_confirmed':
        return 'Already Confirmed';
      case 'pending':
        return 'Confirm Your Email';
      case 'expired':
        return 'Code Expired';
      case 'error':
      default:
        return 'Confirmation Failed';
    }
  };

  const showResendButton = () => {
    return (
      confirmationResult &&
      ['error', 'expired', 'pending'].includes(confirmationResult.state) &&
      (email || username)
    );
  };

  const showSignInButton = () => {
    return (
      confirmationResult && ['success', 'already_confirmed'].includes(confirmationResult.state)
    );
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <Card>
          <CardHeader className='text-center'>
            <div className='flex justify-center mb-4'>{getIcon()}</div>
            <CardTitle className='text-2xl'>{getTitle()}</CardTitle>
            <CardDescription>
              {confirmationResult?.email && (
                <span className='block text-sm text-gray-600 mt-2'>{confirmationResult.email}</span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-4'>
            {confirmationResult && (
              <Alert variant={confirmationResult.success ? 'default' : 'destructive'}>
                <AlertDescription>{confirmationResult.message}</AlertDescription>
              </Alert>
            )}

            {!confirmationResult && (
              <div className='text-center'>
                <p className='text-gray-600'>Please wait while we confirm your email address...</p>
              </div>
            )}

            {/* Manual Code Entry Form */}
            {showCodeForm && confirmationResult?.state === 'pending' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCode)} className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='code'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmation Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder='123456'
                            maxLength={6}
                            className='text-center text-lg tracking-widest'
                            autoComplete='one-time-code'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type='submit' className='w-full' disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Email'
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className='space-y-3'>
              {showSignInButton() && (
                <Button onClick={() => router.push('/signin')} className='w-full'>
                  Continue to Sign In
                </Button>
              )}

              {showResendButton() && (
                <Button
                  variant='outline'
                  onClick={resendConfirmationEmail}
                  disabled={isResending}
                  className='w-full'
                >
                  {isResending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className='mr-2 h-4 w-4' />
                      Resend Confirmation Email
                    </>
                  )}
                </Button>
              )}

              <Button variant='ghost' onClick={() => router.push('/signin')} className='w-full'>
                Back to Sign In
              </Button>
            </div>

            {confirmationResult?.state === 'pending' && (
              <div className='text-center text-sm text-gray-600 mt-4'>
                <p>Didn't receive the email?</p>
                <ul className='mt-2 space-y-1'>
                  <li>• Check your spam or junk folder</li>
                  <li>• Make sure you entered the correct email address</li>
                  <li>• Wait a few minutes for the email to arrive</li>
                  <li>• Click "Resend Confirmation Email" to get a new code</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <Card>
          <CardHeader className='text-center'>
            <div className='flex justify-center mb-4'>
              <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
            </div>
            <CardTitle className='text-2xl'>Loading...</CardTitle>
            <CardDescription>Please wait while we load the page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmContent />
    </Suspense>
  );
}
