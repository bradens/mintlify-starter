import { NextRequest, NextResponse } from 'next/server';

import { getApiKeys, createApiKey } from '@/lib/actions/api-keys';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || undefined;

    // Call the server action
    const result = await getApiKeys({
      page,
      limit,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Keys GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, allowedDomains } = body;

    // Call the server action
    const result = await createApiKey({
      name,
      allowedDomains,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Keys POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
