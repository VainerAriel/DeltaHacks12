import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from session/auth
    const userId = 'demo-user'; // TODO: Extract from JWT token

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

    // Fetch recordings for user
    const recordings = await db
      .collection(collections.recordings)
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch feedback for each recording
    const recordingsWithFeedback = await Promise.all(
      recordings.map(async (recording) => {
        const feedback = await db.collection(collections.feedbackReports).findOne({
          recordingId: recording._id.toString(),
        });

        return {
          id: recording._id.toString(),
          ...recording,
          feedback: feedback
            ? {
                id: feedback._id.toString(),
                ...feedback,
              }
            : undefined,
        };
      })
    );

    return NextResponse.json(recordingsWithFeedback);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}
