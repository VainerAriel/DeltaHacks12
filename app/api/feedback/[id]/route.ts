import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDb();

    const feedback = await db.collection(collections.feedbackReports).findOne({
      recordingId: id,
    });

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback report not found' },
        { status: 404 }
      );
    }

    const { _id, ...rest } = feedback;
    return NextResponse.json(
      {
        id: _id.toString(),
        ...rest,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes (feedback doesn't change)
        },
      }
    );
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
