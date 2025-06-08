import { NextRequest, NextResponse } from 'next/server';

import { toggleApiKeyStatus } from '@/lib/actions/api-keys';
import { auth } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { isActive } = body;

    // Call the server action
    const result = await toggleApiKeyStatus({ id, isActive });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Key TOGGLE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle API key status' },
      { status: 500 }
    );
  }
}
