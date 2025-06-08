import { NextRequest, NextResponse } from 'next/server';

import {
  CognitoIdentityProviderClient,
  ResendConfirmationCodeCommand,
  ResendConfirmationCodeCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';

// Validation schema for resending confirmation
const resendConfirmationSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
});

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resendConfirmationSchema.safeParse(body);

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

    const { username } = validationResult.data;

    // Prepare resend parameters
    const resendParams: ResendConfirmationCodeCommandInput = {
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: username,
    };

    // Resend confirmation code
    const command = new ResendConfirmationCodeCommand(resendParams);
    const result = await cognitoClient.send(command);

    // Log successful resend (but don't expose details)
    console.log('Confirmation email resent for user:', username);

    return NextResponse.json({
      success: true,
      message: 'Confirmation email has been resent. Please check your inbox.',
      deliveryDetails: {
        destination: result.CodeDeliveryDetails?.Destination,
        deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium,
      },
    });
  } catch (error: unknown) {
    console.error('Resend confirmation error:', error);

    // Handle Cognito-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const cognitoError = error as { name: string; message?: string };

      switch (cognitoError.name) {
        case 'UserNotFoundException':
          return NextResponse.json(
            {
              success: false,
              error: 'USER_NOT_FOUND',
              message: 'User not found. Please check the email address.',
            },
            { status: 404 }
          );

        case 'InvalidParameterException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_PARAMETER',
              message: 'Invalid email address format.',
            },
            { status: 400 }
          );

        case 'NotAuthorizedException':
          return NextResponse.json(
            {
              success: false,
              error: 'ALREADY_CONFIRMED',
              message: 'User is already confirmed. You can sign in now.',
            },
            { status: 400 }
          );

        case 'LimitExceededException':
          return NextResponse.json(
            {
              success: false,
              error: 'RATE_LIMIT',
              message: 'Too many resend attempts. Please try again later.',
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

        case 'CodeDeliveryFailureException':
          return NextResponse.json(
            {
              success: false,
              error: 'EMAIL_DELIVERY_FAILED',
              message: 'Failed to send confirmation email. Please try again.',
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
                'Failed to resend confirmation email due to authentication service error.',
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
