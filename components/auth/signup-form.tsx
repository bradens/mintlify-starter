'use client';

import React, { useState, useTransition } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authNotify, notify } from '@/lib/notifications';

// Enhanced password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character');

const signUpSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be less than 50 characters')
      .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
    email: z.string().email('Please enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(8, 'Please confirm your password'),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: 'red' | 'yellow' | 'green';
}

function SignUpFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = React.useState<string | null>(null);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const watchedPassword = form.watch('password');

  const getPasswordStrength = (password: string): PasswordStrength => {
    const checks = [
      { test: /.{8,}/, message: 'At least 8 characters' },
      { test: /[a-z]/, message: 'One lowercase letter' },
      { test: /[A-Z]/, message: 'One uppercase letter' },
      { test: /\d/, message: 'One number' },
      { test: /[^a-zA-Z\d]/, message: 'One special character' },
    ];

    const passed = checks.filter(check => check.test.test(password));
    const failed = checks.filter(check => !check.test.test(password));

    const score = passed.length;
    let color: 'red' | 'yellow' | 'green' = 'red';

    if (score >= 4) {
      color = 'green';
    } else if (score >= 2) {
      color = 'yellow';
    }

    return {
      score,
      feedback: failed.map(check => check.message),
      color,
    };
  };

  const passwordStrength = getPasswordStrength(watchedPassword || '');

  const onSubmit = async (data: SignUpFormData) => {
    startTransition(async () => {
      const toastId = authNotify.loading('Creating account');

      try {
        const captchaToken = token;

        if (!captchaToken) {
          notify.dismiss(toastId);
          authNotify.authError(
            {
              message: 'Failed to verify security challenge. Please try again.',
            },
            'Sign up failed'
          );
          return;
        }

        // Call our sign-up API route with captcha token
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            captchaToken,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          notify.dismiss(toastId);

          // Map API errors to Cognito error names for consistent handling
          const errorMap: Record<string, string> = {
            USERNAME_EXISTS: 'UsernameExistsException',
            INVALID_PASSWORD: 'InvalidPasswordException',
            INVALID_EMAIL: 'InvalidParameterException',
            RATE_LIMIT: 'LimitExceededException',
            TOO_MANY_REQUESTS: 'TooManyRequestsException',
            EMAIL_DELIVERY_FAILED: 'CodeDeliveryFailureException',
            VALIDATION_FAILED: 'UserLambdaValidationException',
          };

          const errorType = errorMap[result.error] || result.type || 'UNKNOWN_ERROR';
          authNotify.authError(
            {
              name: errorType,
              message: result.message,
            },
            'Sign up failed'
          );
          return;
        }

        // Registration successful
        notify.dismiss(toastId);
        authNotify.signUpSuccess();
        setSuccess(true);
      } catch (error) {
        console.error('Sign up error:', error);
        notify.dismiss(toastId);
        authNotify.authError(error, 'Sign up failed');
      }
    });
  };

  const getCallbackUrl = () => {
    const callbackUrl = searchParams.get('callbackUrl');
    return callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : '';
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle2 className='h-5 w-5 text-green-600' />
            Account Created Successfully!
          </CardTitle>
          <CardDescription>Please check your email to verify your account</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert>
            <Mail className='h-4 w-4' />
            <AlertDescription>
              We&apos;ve sent a verification email to your inbox. Please click the link in the email
              to activate your account before signing in.
            </AlertDescription>
          </Alert>

          <div className='flex flex-col space-y-2'>
            <Button onClick={() => router.push(`/signin${getCallbackUrl()}`)}>
              Continue to Sign In
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                setSuccess(false);
                form.reset();
              }}
            >
              Create Another Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Join thousands of developers using our crypto API</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='John Doe'
                      autoComplete='name'
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        placeholder='Create a strong password'
                        autoComplete='new-password'
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

                  {/* Password Strength Indicator */}
                  {watchedPassword && (
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2'>
                        <div className='flex-1 bg-gray-200 rounded-full h-2'>
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.color === 'green'
                                ? 'bg-green-500'
                                : passwordStrength.color === 'yellow'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className='text-xs text-muted-foreground'>
                          {passwordStrength.score}/5
                        </span>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <FormDescription>
                          Missing: {passwordStrength.feedback.join(', ')}
                        </FormDescription>
                      )}
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        {...field}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder='Confirm your password'
                        autoComplete='new-password'
                        disabled={isPending}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isPending}
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

            <FormField
              control={form.control}
              name='acceptTerms'
              render={({ field }) => (
                <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                  <FormControl>
                    <input
                      type='checkbox'
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                      className='mt-1'
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel className='text-sm font-normal'>
                      I agree to the{' '}
                      <a
                        href='/terms'
                        className='text-primary hover:underline'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href='/privacy'
                        className='text-primary hover:underline'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Privacy Policy
                      </a>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {/* Turnstile Captcha */}
            <div className='flex justify-center'>
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onSuccess={setToken}
                onError={error => {
                  authNotify.authError(
                    {
                      message: `Security verification failed: ${error.toString()}`,
                    },
                    'Captcha error'
                  );
                }}
              />
            </div>

            <Button type='submit' className='w-full' disabled={isPending || !token}>
              {isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Form>

        <div className='mt-4 text-center text-sm'>
          Already have an account?{' '}
          <a href={`/signin${getCallbackUrl()}`} className='text-primary hover:underline'>
            Sign in
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function SignUpForm() {
  return (
    <AuthErrorBoundary>
      <SignUpFormContent />
    </AuthErrorBoundary>
  );
}
