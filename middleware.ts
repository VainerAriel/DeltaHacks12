import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Check if auth token cookie exists (lightweight check for Edge Runtime)
  // Full JWT verification happens in API routes and client-side
  const authToken = request.cookies.get('auth-token');
  const hasAuthToken = !!authToken?.value;

  // If user has auth token and trying to access login/register, redirect to dashboard
  if (hasAuthToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user doesn't have auth token and trying to access a protected route, redirect to login
  if (!hasAuthToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (handled by route handler)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
