'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
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

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [result, setResult] = useState<ForgotPasswordResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setResult({
          success: true,
          message: 'Password reset email sent! Please check your inbox for instructions.',
        });
        // Don't clear the form so user can see which email was used
      } else {
        setResult({
          success: false,
          message: result.message || 'Failed to send password reset email.',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setResult({
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full'>
        <Card>
          <CardHeader className='text-center'>
            <div className='flex justify-center mb-4'>
              <Mail className='h-8 w-8 text-blue-600' />
            </div>
            <CardTitle className='text-2xl'>Forgot Password</CardTitle>
            <CardDescription>
              Enter your email address and we{"'"}ll send you instructions to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent className='space-y-4'>
            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            {!result?.success && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type='email'
                            placeholder='Enter your email address'
                            disabled={isSubmitting}
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type='submit' className='w-full' disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Sending Reset Email...
                      </>
                    ) : (
                      'Send Reset Email'
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {result?.success && (
              <div className='space-y-4'>
                <div className='text-center text-sm text-gray-600'>
                  <p>Didn{"'"}t receive the email?</p>
                  <ul className='mt-2 space-y-1'>
                    <li>• Check your spam or junk folder</li>
                    <li>• Make sure you entered the correct email address</li>
                    <li>• Wait a few minutes for the email to arrive</li>
                  </ul>
                </div>

                <Button
                  variant='outline'
                  onClick={() => {
                    setResult(null);
                    form.reset();
                  }}
                  className='w-full'
                >
                  Try Different Email
                </Button>
              </div>
            )}

            <div className='space-y-3 pt-4 border-t'>
              <Button variant='ghost' onClick={() => router.push('/signin')} className='w-full'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Sign In
              </Button>

              <div className='text-center text-sm text-gray-600'>
                Don{"'"}t have an account?{' '}
                <Button
                  variant='link'
                  onClick={() => router.push('/signup')}
                  className='p-0 h-auto font-normal'
                >
                  Sign up
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
