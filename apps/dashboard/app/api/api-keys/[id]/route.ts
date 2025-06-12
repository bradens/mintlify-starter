import { NextRequest, NextResponse } from 'next/server';

import { deleteApiKey } from '@/lib/actions/api-keys';
import { auth } from '@/lib/auth';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    const result = await deleteApiKey({ id });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Key DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
