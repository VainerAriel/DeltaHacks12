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

    const biometricData = await db.collection(collections.biometricData).findOne({
      recordingId: id,
    });

    if (!biometricData) {
      return NextResponse.json(
        { error: 'Biometric data not found' },
        { status: 404 }
      );
    }

    const { _id, ...rest } = biometricData;
    return NextResponse.json(
      {
        id: _id.toString(),
        ...rest,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes (biometric data doesn't change)
        },
      }
    );
  } catch (error) {
    console.error('Error fetching biometric data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch biometric data' },
      { status: 500 }
    );
  }
}
