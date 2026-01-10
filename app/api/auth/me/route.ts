import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getDb, collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Get user info from JWT token
    const auth = getAuthFromRequest(request);
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    let db;
    try {
      db = await getDb();
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json(
        { error: 'Database not configured. Please set MONGODB_URI in your .env.local file.' },
        { status: 503 }
      );
    }

    // Fetch user from database
    const user = await db.collection(collections.users).findOne({
      _id: new ObjectId(auth.userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user info (excluding password)
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      preferences: user.preferences || {
        language: 'en',
        notifications: true,
        theme: 'system',
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 500 }
    );
  }
}
