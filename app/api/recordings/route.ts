import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

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

    // Optimize: Fetch all feedback reports in a single query instead of N queries
    const recordingIds = recordings.map(r => r._id.toString());
    const feedbackReports = await db
      .collection(collections.feedbackReports)
      .find({ recordingId: { $in: recordingIds } })
      .toArray();

    // Create a map for O(1) lookup
    const feedbackMap = new Map(
      feedbackReports.map(fb => [fb.recordingId, fb])
    );

    // Combine recordings with their feedback
    const recordingsWithFeedback = recordings.map((recording) => {
      const feedback = feedbackMap.get(recording._id.toString());
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
    });

    return NextResponse.json(recordingsWithFeedback);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}
