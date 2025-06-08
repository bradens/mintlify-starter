import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

/**
 * NextAuth middleware for route protection and session management
 * Handles authentication-based routing and access control
 */
export default auth(req => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Define route categories
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isSignInRoute = nextUrl.pathname === '/signin';
  const isSignUpRoute = nextUrl.pathname === '/signup';
  const isAuthRoute = isSignInRoute || isSignUpRoute;
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAdminRoute = checkIsAdminRoute(nextUrl.pathname);
  const isProtectedRoute = protectedRoutes.some(route => nextUrl.pathname.startsWith(route));

  // Always allow API auth routes (NextAuth endpoints)
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Handle authentication routes
  if (isAuthRoute) {
    if (isLoggedIn) {
      // Redirect authenticated users away from auth pages
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Handle API routes (except auth)
  if (isApiRoute) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Handle admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/signin?callbackUrl=${callbackUrl}`, nextUrl));
    }

    // Check admin role
    const userRole = req.auth?.user?.role;
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=access-denied', nextUrl));
    }

    return NextResponse.next();
  }

  // Handle protected routes
  if (isProtectedRoute || !isPublicRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/signin?callbackUrl=${callbackUrl}`, nextUrl));
    }
    return NextResponse.next();
  }

  // Default: allow access
  return NextResponse.next();
});

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/support',
  '/signin',
  '/signup',
  '/confirm',
  '/forgot-password',
  '/reset-password',
];

/**
 * Protected routes that require authentication
 */
const protectedRoutes = ['/dashboard', '/api-keys', '/usage', '/billing', '/profile', '/settings'];

/**
 * Admin routes that require admin role
 */
const adminRoutes = ['/admin'];

/**
 * Enhanced admin route checking
 * Supports nested admin routes and specific admin paths
 */
function checkIsAdminRoute(pathname: string): boolean {
  return adminRoutes.some(route => {
    if (route === '/admin') {
      // Match /admin and all its sub-routes
      return pathname === '/admin' || pathname.startsWith('/admin/');
    }
    return pathname.startsWith(route);
  });
}

/**
 * Middleware configuration
 * Defines which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g., robots.txt, sitemap.xml)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
