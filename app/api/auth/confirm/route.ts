import { NextRequest, NextResponse } from 'next/server';

import { ApiSubscriptionService } from '@company-z/api-management-library';
import { z } from 'zod';

import { getService } from '@/di/container';
import { SYMBOLS } from '@/di/symbols';

/**
 * Schema for Cognito post-confirmation webhook payload
 */
const postConfirmationSchema = z.object({
  version: z.string(),
  region: z.string(),
  userPoolId: z.string(),
  userName: z.string(),
  callerContext: z.object({
    awsSdkVersion: z.string(),
    clientId: z.string(),
  }),
  triggerSource: z.string(),
  request: z.object({
    userAttributes: z.record(z.string()),
    clientMetadata: z.record(z.string()).optional(),
  }),
  response: z.object({}).optional(),
});

type PostConfirmationPayload = z.infer<typeof postConfirmationSchema>;

/**
 * Handle post-confirmation logic (migrated from HandleCognitoEvent)
 * This runs after a user confirms their email address
 */
async function handlePostConfirmation(payload: PostConfirmationPayload): Promise<void> {
  const { userName, request } = payload;
  const { userAttributes } = request;

  console.log('Processing post-confirmation for user:', {
    userName,
    email: userAttributes.email,
    timestamp: new Date().toISOString(),
  });

  try {
    // Create Stripe customer (migrated from HandleCognitoEvent)
    const apiSubscriptionService = getService<ApiSubscriptionService>(
      SYMBOLS.ApiSubscriptionService
    );

    await apiSubscriptionService.createCustomer(userName, userAttributes);

    console.log('Stripe customer created successfully for user:', userName);
  } catch (error) {
    console.error('Failed to create Stripe customer for user:', userName, error);
    // Don't fail the confirmation process if Stripe customer creation fails
    // The user can still use the platform, and we can retry customer creation later
  }

  // Additional post-confirmation logic can be added here
  // Examples:
  // - Send welcome email
  // - Set up default user preferences
  // - Initialize user workspace
  // - Log user activation analytics
}

/**
 * POST /api/auth/confirm
 *
 * This endpoint handles Cognito post-confirmation webhooks.
 * It should be configured as a Cognito Lambda trigger in AWS Console.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the webhook payload
    const validationResult = postConfirmationSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Invalid post-confirmation payload:', validationResult.error);
      return NextResponse.json(
        {
          error: 'INVALID_PAYLOAD',
          message: 'Invalid webhook payload',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const payload = validationResult.data;

    // Only process PostConfirmation_ConfirmSignUp events
    if (payload.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
      console.log('Ignoring non-confirmation trigger:', payload.triggerSource);
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // Verify this is for our user pool
    const expectedUserPoolId = process.env.COGNITO_USER_POOL_ID;
    if (payload.userPoolId !== expectedUserPoolId) {
      console.error('Invalid user pool ID:', payload.userPoolId);
      return NextResponse.json(
        {
          error: 'INVALID_USER_POOL',
          message: 'Invalid user pool ID',
        },
        { status: 400 }
      );
    }

    // Process the post-confirmation logic
    await handlePostConfirmation(payload);

    // Return success response (required for Cognito webhooks)
    return NextResponse.json({
      success: true,
      message: 'Post-confirmation processing completed',
      response: payload.response || {},
    });
  } catch (error) {
    console.error('Post-confirmation webhook error:', error);

    // Return error response but don't fail the user confirmation
    // Cognito will mark the user as confirmed regardless
    return NextResponse.json(
      {
        error: 'PROCESSING_ERROR',
        message: 'Post-confirmation processing failed',
        // Still return success to not block user confirmation
        success: true,
      },
      { status: 200 } // Return 200 to not block Cognito confirmation
    );
  }
}

/**
 * Alternative endpoint for manual confirmation processing
 * This can be used to retry failed post-confirmation logic
 *
 * POST /api/auth/confirm with { userId: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'USER_ID_REQUIRED', message: 'User ID is required' },
        { status: 400 }
      );
    }

    // This would require additional logic to fetch user data from Cognito
    // and then process the post-confirmation logic manually
    console.log('Manual post-confirmation processing requested for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Manual processing endpoint - not yet implemented',
    });
  } catch (error) {
    console.error('Manual confirmation processing error:', error);
    return NextResponse.json(
      {
        error: 'PROCESSING_ERROR',
        message: 'Manual processing failed',
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

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method is not supported for this endpoint.',
    },
    { status: 405 }
  );
}
