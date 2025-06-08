import { NextRequest, NextResponse } from 'next/server';

import { regenerateApiKey } from '@/lib/actions/api-keys';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Call the server action
    const result = await regenerateApiKey({ id });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Key REGENERATE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate API key' },
      { status: 500 }
    );
  }
}
