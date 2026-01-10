import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

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

    // Simple password check for development (hash in production)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });

    // Set cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
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
