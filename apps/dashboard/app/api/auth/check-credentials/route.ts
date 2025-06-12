import { NextRequest, NextResponse } from 'next/server';

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';

// Validation schema for credential check
const credentialSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Initialize AWS Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = credentialSchema.safeParse(body);

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

    const { email, password } = validationResult.data;

    // Authenticate with Cognito
    const authCommand = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoClient.send(authCommand);

    if (authResponse.AuthenticationResult?.AccessToken) {
      return NextResponse.json({
        success: true,
        message: 'Credentials are valid',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed',
      },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Credential check error:', error);

    // Map Cognito errors to specific error types
    switch (error.name) {
      case 'NotAuthorizedException':
        return NextResponse.json(
          {
            success: false,
            error: 'NotAuthorized',
            message: 'Invalid email or password',
          },
          { status: 401 }
        );

      case 'UserNotConfirmedException':
        return NextResponse.json(
          {
            success: false,
            error: 'UserNotConfirmed',
            message: 'Please verify your email address before signing in',
          },
          { status: 401 }
        );

      case 'PasswordResetRequiredException':
        return NextResponse.json(
          {
            success: false,
            error: 'PasswordResetRequired',
            message: 'Password reset required',
          },
          { status: 401 }
        );

      case 'UserNotFoundException':
        return NextResponse.json(
          {
            success: false,
            error: 'UserNotFound',
            message: 'User not found',
          },
          { status: 404 }
        );

      case 'TooManyRequestsException':
        return NextResponse.json(
          {
            success: false,
            error: 'TooManyRequests',
            message: 'Too many requests. Please try again later',
          },
          { status: 429 }
        );

      case 'LimitExceededException':
        return NextResponse.json(
          {
            success: false,
            error: 'RateLimit',
            message: 'Rate limit exceeded. Please try again later',
          },
          { status: 429 }
        );

      case 'InvalidParameterException':
        return NextResponse.json(
          {
            success: false,
            error: 'InvalidParameter',
            message: 'Invalid email or password format',
          },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
          { status: 500 }
        );
    }
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
