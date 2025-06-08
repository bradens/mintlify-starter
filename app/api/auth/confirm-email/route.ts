import { NextRequest, NextResponse } from 'next/server';

import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  ConfirmSignUpCommandInput,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';

// Validation schema for email confirmation
const confirmEmailSchema = z.object({
  token: z.string().min(1, 'Confirmation token is required'),
  username: z.string().min(1, 'Username is required'),
});

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = confirmEmailSchema.safeParse(body);

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

    const { token, username } = validationResult.data;

    // Prepare confirmation parameters
    const confirmParams: ConfirmSignUpCommandInput = {
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Username: username,
      ConfirmationCode: token,
    };

    // Confirm the user in Cognito
    const command = new ConfirmSignUpCommand(confirmParams);
    await cognitoClient.send(command);

    // Log successful confirmation
    console.log('Email confirmed successfully for user:', username);

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully',
    });
  } catch (error: unknown) {
    console.error('Email confirmation error:', error);

    // Handle Cognito-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const cognitoError = error as { name: string; message?: string };

      switch (cognitoError.name) {
        case 'CodeMismatchException':
          return NextResponse.json(
            {
              success: false,
              error: 'INVALID_TOKEN',
              message: 'Invalid confirmation code. Please check the code and try again.',
            },
            { status: 400 }
          );

        case 'ExpiredCodeException':
          return NextResponse.json(
            {
              success: false,
              error: 'EXPIRED_TOKEN',
              message: 'Confirmation code has expired. Please request a new confirmation email.',
            },
            { status: 400 }
          );

        case 'NotAuthorizedException':
          return NextResponse.json(
            {
              success: false,
              error: 'ALREADY_CONFIRMED',
              message: 'User is already confirmed.',
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

        case 'LimitExceededException':
          return NextResponse.json(
            {
              success: false,
              error: 'RATE_LIMIT',
              message: 'Too many confirmation attempts. Please try again later.',
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
              message:
                'Too many failed confirmation attempts. Please request a new confirmation email.',
            },
            { status: 429 }
          );

        default:
          return NextResponse.json(
            {
              success: false,
              error: 'COGNITO_ERROR',
              message:
                cognitoError.message ||
                'Email confirmation failed due to authentication service error.',
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
