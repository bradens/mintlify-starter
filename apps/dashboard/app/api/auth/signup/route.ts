import { NextRequest, NextResponse } from 'next/server';

import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  SignUpCommandInput,
  SignUpCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  BlockedDomainService,
  VerifyMailService,
  isHuman,
} from '@company-z/api-management-library';
import { z } from 'zod';

import { getService, isServiceBound } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';

// Validation schema for sign-up
const signUpSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character'),
  captchaToken: z.string().min(1, 'Turnstile verification required'),
});

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Enhanced email validation from HandleCognitoEvent
 */
function hasThreeOrMoreDots(email: string): boolean {
  return email.split('@')[0].split('.').length - 1 >= 3;
}

function validateEmailBusinessRules(email: string): void {
  // Check for email aliases
  if (email.includes('+')) {
    throw new Error('Email aliases are not allowed');
  }

  // Block specific patterns (from original HandleCognitoEvent)
  if (email.startsWith('mehdi') || email.startsWith('mmllkk')) {
    throw new Error(`Unable to sign up with ${email}. Please contact support.`);
  }

  // Check for excessive dots in local part
  if (hasThreeOrMoreDots(email)) {
    throw new Error(`Unable to sign up with ${email}. Please contact support.`);
  }
}

/**
 * Verify captcha token
 */
async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('Turnstile secret key not configured');
    return false;
  }

  try {
    const verificationResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const result = await verificationResponse.json();
    console.log('Turnstile verification result:', result);

    if (!result.success) {
      console.log('Error verifying Turnstile:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

/**
 * Enhanced pre-signup validation (migrated from HandleCognitoEvent)
 */
async function performPreSignupValidation(email: string, captchaToken: string): Promise<void> {
  try {
    // 1. Basic email business rules validation
    validateEmailBusinessRules(email);

    // 2. Verify human (captcha validation)
    const isValidCaptcha = await verifyTurnstile(captchaToken);
    if (!isValidCaptcha) {
      throw new Error('Captcha verification failed. Please try again.');
    }

    // 3. Check blocked domains using DI container
    if (isServiceBound(SYMBOLS.BlockedDomainService)) {
      try {
        const blockedDomainService = getService<BlockedDomainService>(SYMBOLS.BlockedDomainService);
        const domain = email.split('@')[1];
        const isBlocked = await blockedDomainService.isBlocked(domain);

        if (isBlocked) {
          throw new Error(`Unable to sign up with ${email}. Please contact support.`);
        }
      } catch (serviceError) {
        console.warn('Error checking blocked domains:', serviceError);
        // Don't block signup if service fails
      }
    } else {
      console.warn('BlockedDomainService not available, skipping blocked domain check');
    }

    // 4. Verify email with external service
    if (isServiceBound(SYMBOLS.VerifyMailService)) {
      try {
        const verifyMailService = getService<VerifyMailService>(SYMBOLS.VerifyMailService);
        const verificationResponse = await verifyMailService.verify(email);

        if (verificationResponse?.block && verificationResponse?.domain) {
          // Add domain to block list if it's flagged as problematic
          if (isServiceBound(SYMBOLS.BlockedDomainService)) {
            try {
              const blockedDomainService = getService<BlockedDomainService>(
                SYMBOLS.BlockedDomainService
              );
              await blockedDomainService.addDomain(verificationResponse.domain);
            } catch (addDomainError) {
              console.warn('Could not add domain to block list:', addDomainError);
            }
          }

          throw new Error(`Unable to sign up with ${email}. Please contact support.`);
        }
      } catch (verifyError) {
        console.warn('Email verification service error:', verifyError);
        // Don't block signup if external service is unavailable
      }
    } else {
      console.warn('VerifyMailService not available, skipping email verification');
    }
  } catch (error) {
    // Re-throw validation errors
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = signUpSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, email, password, captchaToken } = validationResult.data;

    // Perform comprehensive pre-signup validation (migrated from HandleCognitoEvent)
    try {
      await performPreSignupValidation(email, captchaToken);
    } catch (validationError) {
      console.error('Pre-signup validation failed:', validationError);
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: validationError instanceof Error ? validationError.message : 'Validation failed',
        },
        { status: 400 }
      );
    }

    // Prepare user attributes for Cognito
    const userAttributes = [
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'name',
        Value: name,
      },
    ];

    // Prepare sign-up parameters
    const signUpParams: SignUpCommandInput = {
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
      ClientMetadata: {
        captcha: captchaToken,
        signupSource: 'dashboard-client',
        signupTimestamp: new Date().toISOString(),
      },
    };

    // Create user in Cognito
    const command = new SignUpCommand(signUpParams);
    console.log('command ', command);
    const result: SignUpCommandOutput = await cognitoClient.send(command);

    // Log successful registration
    console.log('User registered successfully:', {
      userSub: result.UserSub,
      email: email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! Please check your email for verification.',
        userSub: result.UserSub,
        type: 'SIGNUP_SUCCESS',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Sign up error:', error);

    // Handle Cognito-specific errors with standardized responses
    if (error && typeof error === 'object' && 'name' in error) {
      const cognitoError = error as { name: string; message?: string };

      switch (cognitoError.name) {
        case 'UsernameExistsException':
          return NextResponse.json(
            {
              success: false,
              error: 'USERNAME_EXISTS',
              type: 'UsernameExistsException',
              message: 'An account with this email already exists.',
            },
            { status: 409 }
          );

        case 'InvalidPasswordException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_PASSWORD',
              type: 'InvalidPasswordException',
              message: 'Password does not meet security requirements.',
            },
            { status: 400 }
          );

        case 'InvalidParameterException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_EMAIL',
              type: 'InvalidParameterException',
              message: 'Please enter a valid email address.',
            },
            { status: 400 }
          );

        case 'LimitExceededException':
          return NextResponse.json(
            {
              success: false,
              error: 'RATE_LIMIT',
              type: 'LimitExceededException',
              message: 'Too many registration attempts. Please try again later.',
            },
            { status: 429 }
          );

        case 'NotAuthorizedException':
          return NextResponse.json(
            {
              success: false,
              error: 'NOT_AUTHORIZED',
              type: 'NotAuthorizedException',
              message: 'Registration is not permitted at this time.',
            },
            { status: 403 }
          );

        case 'CodeDeliveryFailureException':
          return NextResponse.json(
            {
              success: false,
              error: 'EMAIL_DELIVERY_FAILED',
              type: 'CodeDeliveryFailureException',
              message: 'Failed to send verification email. Please try again.',
            },
            { status: 500 }
          );

        case 'TooManyRequestsException':
          return NextResponse.json(
            {
              success: false,
              error: 'TOO_MANY_REQUESTS',
              type: 'TooManyRequestsException',
              message: 'Too many requests. Please wait and try again.',
            },
            { status: 429 }
          );

        case 'UserLambdaValidationException':
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_FAILED',
              type: 'UserLambdaValidationException',
              message: 'User validation failed. Please check your information.',
            },
            { status: 400 }
          );

        case 'InvalidLambdaResponseException':
          return NextResponse.json(
            {
              success: false,
              error: 'SYSTEM_ERROR',
              type: 'InvalidLambdaResponseException',
              message: 'System configuration error. Please contact support.',
            },
            { status: 500 }
          );

        case 'ResourceNotFoundException':
          return NextResponse.json(
            {
              success: false,
              error: 'CONFIGURATION_ERROR',
              type: 'ResourceNotFoundException',
              message: 'Service configuration error. Please contact support.',
            },
            { status: 500 }
          );

        default:
          return NextResponse.json(
            {
              success: false,
              error: 'COGNITO_ERROR',
              type: cognitoError.name,
              message:
                cognitoError.message || 'Registration failed due to authentication service error.',
            },
            { status: 500 }
          );
      }
    }

    // Handle network or other unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        type: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET method is not supported for this endpoint.',
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'PUT method is not supported for this endpoint.',
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method is not supported for this endpoint.',
    },
    { status: 405 }
  );
}
