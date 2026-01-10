import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simplified middleware for development
  // In production, add proper authentication checks
  
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth-token');

  // Allow all routes in development - remove auth checks for easier development
  // Uncomment below for production:
  
  // const publicRoutes = ['/', '/login', '/register'];
  // if (!publicRoutes.includes(pathname) && !authToken) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

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
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
