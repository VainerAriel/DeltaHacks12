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

    const recording = await db.collection(collections.recordings).findOne({
      _id: new ObjectId(id),
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Convert MongoDB document to our Recording type
    const { _id, ...rest } = recording;
    return NextResponse.json({
      id: _id.toString(),
      ...rest,
    });
  } catch (error) {
    console.error('Error fetching recording:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recording' },
      { status: 500 }
    );
  }
}
