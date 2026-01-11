import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let db;
    try {
      db = await getDb();
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { 
          error: 'Database not configured. Please set MONGODB_URI in your .env.local file.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

    const user = await db.collection(collections.users).findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('NEXTAUTH_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Set token expiration based on rememberMe: 30 days if true, 1 day if false
    const tokenExpiration = rememberMe ? '30d' : '1d';
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      secret,
      { expiresIn: tokenExpiration }
    );

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });

    // Set cookie with expiration based on rememberMe
    // If rememberMe is true: 30 days, if false: 1 day
    const cookieMaxAge = rememberMe 
      ? 60 * 60 * 24 * 30 // 30 days
      : 60 * 60 * 24; // 1 day
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
