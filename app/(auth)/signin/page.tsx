import { Suspense } from 'react';

import { SignInForm } from '@/components/auth/signin-form';

export default function SignInPage() {
  return (
    <div className='container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-zinc-900' />
        <div className='relative z-20 flex items-center text-lg font-medium'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-6 w-6'
          >
            <path d='m6 9 6 6 6-6' />
          </svg>
          Crypto API Dashboard
        </div>
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;This dashboard has streamlined our crypto API management. The interface is
              intuitive and the analytics are incredibly detailed.&rdquo;
            </p>
            <footer className='text-sm'>Sofia Chen, Lead Developer</footer>
          </blockquote>
        </div>
      </div>
      <div className='lg:p-8'>
        <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>Sign in to your account</h1>
            <p className='text-sm text-muted-foreground'>
              Enter your email and password to access your dashboard
            </p>
          </div>
          <Suspense fallback={<div>Loading...</div>}>
            <SignInForm />
          </Suspense>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            By clicking sign in, you agree to our{' '}
            <a href='/terms' className='underline underline-offset-4 hover:text-primary'>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href='/privacy' className='underline underline-offset-4 hover:text-primary'>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
