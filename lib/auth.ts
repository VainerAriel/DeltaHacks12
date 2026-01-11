import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Extracts and verifies the JWT token from the request cookies
 * @param request - The Next.js request object
 * @returns The user ID if token is valid, null otherwise
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not set. JWT verification will fail.');
      return null;
    }
    const decoded = jwt.verify(token, secret) as JWTPayload;

    return decoded.userId;
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
}

/**
 * Middleware helper to check authentication and return user ID or error response
 * @param request - The Next.js request object
 * @returns Object with userId if authenticated, or null with error response
 */
export function requireAuth(request: NextRequest): { userId: string } | { error: NextResponse } {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    };
  }
  
  return { userId };
}

/**
 * Gets the full JWT payload from the request
 * @param request - The Next.js request object
 * @returns The JWT payload if token is valid, null otherwise
 */
export function getAuthFromRequest(request: NextRequest): JWTPayload | null {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not set. JWT verification will fail.');
      return null;
    }
    const decoded = jwt.verify(token, secret) as JWTPayload;

    return decoded;
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
}
