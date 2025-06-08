import { NextRequest, NextResponse } from 'next/server';

import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  ForgotPasswordCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';

// Validation schema for forgot password
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);

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

    const { email } = validationResult.data;

    // Prepare forgot password parameters
    const forgotPasswordParams: ForgotPasswordCommandInput = {
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: email,
    };

    // Send forgot password request
    const command = new ForgotPasswordCommand(forgotPasswordParams);
    const result = await cognitoClient.send(command);

    // Log successful request (but don't expose details)
    console.log('Password reset email requested for user:', email);

    return NextResponse.json({
      success: true,
      message:
        'If an account with that email exists, you will receive password reset instructions.',
      deliveryDetails: {
        destination: result.CodeDeliveryDetails?.Destination,
        deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium,
      },
    });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);

    // Handle Cognito-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const cognitoError = error as { name: string; message?: string };

      switch (cognitoError.name) {
        case 'UserNotFoundException':
          // Don't reveal that user doesn't exist for security reasons
          return NextResponse.json({
            success: true,
            message:
              'If an account with that email exists, you will receive password reset instructions.',
          });

        case 'InvalidParameterException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_PARAMETER',
              message: 'Invalid email address format.',
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

        case 'NotAuthorizedException':
          return NextResponse.json(
            {
              success: false,
              error: 'NOT_AUTHORIZED',
              message: 'Password reset is not allowed for this account.',
            },
            { status: 403 }
          );

        case 'CodeDeliveryFailureException':
          return NextResponse.json(
            {
              success: false,
              error: 'EMAIL_DELIVERY_FAILED',
              message: 'Failed to send password reset email. Please try again.',
            },
            { status: 500 }
          );

        case 'InternalErrorException':
          return NextResponse.json(
            {
              success: false,
              error: 'INTERNAL_ERROR',
              message: 'Internal server error. Please try again.',
            },
            { status: 500 }
          );

        default:
          return NextResponse.json(
            {
              success: false,
              error: 'COGNITO_ERROR',
              message:
                cognitoError.message ||
                'Failed to send password reset email due to authentication service error.',
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
