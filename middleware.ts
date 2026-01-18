import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow static files (images, fonts, etc.) to pass through
  const staticFileExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot'];
  const isStaticFile = staticFileExtensions.some(ext => pathname.toLowerCase().endsWith(ext));
  
  if (isStaticFile) {
    return NextResponse.next();
  }
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Check if auth token cookie exists and is valid (lightweight check for Edge Runtime)
  // Full JWT verification happens in API routes and client-side
  const authToken = request.cookies.get('auth-token');
  const tokenValue = authToken?.value?.trim();
  
  // Check if token exists and has a valid JWT structure (three parts separated by dots)
  // Empty or invalid tokens are treated as no authentication
  const hasValidAuthToken = tokenValue && 
    tokenValue.length > 0 && 
    tokenValue.split('.').length === 3; // Basic JWT structure check

  // If user has valid auth token and trying to access login/register, redirect to dashboard
  if (hasValidAuthToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user doesn't have valid auth token and trying to access a protected route, redirect to login
  if (!hasValidAuthToken && !isPublicRoute) {
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
