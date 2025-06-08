import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the session token from cookies
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get('next-auth.session-token') ||
      cookieStore.get('__Secure-next-auth.session-token');

    if (sessionToken) {
      console.log('Clearing session for user sign-out');
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Successfully signed out',
    });

    // Clear all NextAuth cookies
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.pkce.code_verifier',
    ];

    cookiesToClear.forEach(cookieName => {
      // Clear for both localhost and production domains
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    });

    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Sign out error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'SIGNOUT_ERROR',
        message: 'An error occurred during sign out',
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
      message: 'GET method is not supported for this endpoint. Use POST to sign out.',
    },
    { status: 405 }
  );
}
