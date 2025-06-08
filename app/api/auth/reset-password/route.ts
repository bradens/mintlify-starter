import { NextRequest, NextResponse } from 'next/server';

import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmForgotPasswordCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';

// Validation schema for password reset
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z\d]/, 'Password must contain at least one special character'),
});

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { token, email, password } = validationResult.data;

    // Prepare password reset parameters
    const resetParams: ConfirmForgotPasswordCommandInput = {
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: email,
      ConfirmationCode: token,
      Password: password,
    };

    // Reset password in Cognito
    const command = new ConfirmForgotPasswordCommand(resetParams);
    await cognitoClient.send(command);

    // Log successful password reset (without sensitive data)
    console.log('Password reset successfully for user:', email);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error: unknown) {
    console.error('Password reset error:', error);

    // Handle Cognito-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const cognitoError = error as { name: string; message?: string };

      switch (cognitoError.name) {
        case 'CodeMismatchException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_TOKEN',
              message: 'Invalid reset code. Please check the code and try again.',
            },
            { status: 400 }
          );

        case 'ExpiredCodeException':
          return NextResponse.json(
            {
              success: false,
              error: 'EXPIRED_TOKEN',
              message: 'Reset code has expired. Please request a new password reset.',
            },
            { status: 400 }
          );

        case 'UserNotFoundException':
          return NextResponse.json(
            {
              success: false,
              error: 'USER_NOT_FOUND',
              message: 'User not found.',
            },
            { status: 404 }
          );

        case 'UserNotConfirmedException':
          return NextResponse.json(
            {
              success: false,
              error: 'USER_NOT_CONFIRMED',
              message: 'User account is not confirmed. Please verify your email first.',
            },
            { status: 400 }
          );

        case 'InvalidPasswordException':
          return NextResponse.json(
            {
              success: false,
              error: 'WEAK_PASSWORD',
              message: 'Password does not meet security requirements.',
            },
            { status: 400 }
          );

        case 'LimitExceededException':
          return NextResponse.json(
            {
              success: false,
              error: 'RATE_LIMIT',
              message: 'Too many password reset attempts. Please try again later.',
            },
            { status: 429 }
          );

        case 'TooManyRequestsException':
          return NextResponse.json(
            {
              success: false,
              error: 'TOO_MANY_REQUESTS',
              message: 'Too many requests. Please wait and try again.',
            },
            { status: 429 }
          );

        case 'TooManyFailedAttemptsException':
          return NextResponse.json(
            {
              success: false,
              error: 'TOO_MANY_ATTEMPTS',
              message: 'Too many failed attempts. Please request a new password reset.',
            },
            { status: 429 }
          );

        case 'InvalidParameterException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_PARAMETER',
              message: 'Invalid parameters. Please check your input.',
            },
            { status: 400 }
          );

        default:
          return NextResponse.json(
            {
              success: false,
              error: 'COGNITO_ERROR',
              message:
                cognitoError.message ||
                'Password reset failed due to authentication service error.',
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
