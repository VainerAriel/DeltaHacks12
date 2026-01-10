import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { processPresageData } from '@/lib/presage/processor';
import { RecordingStatus } from '@/types/recording';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordingId } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: 'recordingId is required' },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(recordingId)) {
      return NextResponse.json(
        { error: 'Invalid recordingId format' },
        { status: 400 }
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

    // Fetch recording to get video URL
    const recording = await db.collection(collections.recordings).findOne({
      _id: new ObjectId(recordingId),
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Update status to extracting_biometrics
    await db.collection(collections.recordings).updateOne(
      { _id: new ObjectId(recordingId) },
      { $set: { status: RecordingStatus.EXTRACTING_BIOMETRICS } }
    );

    try {
      // Process with Presage
      const videoUrl = recording.videoUrl;
      const biometricData = await processPresageData(videoUrl);
      biometricData.recordingId = recordingId;

      // Store biometric data
      // Generate a new ObjectId for the biometric data document
      const biometricId = new ObjectId();
      await db.collection(collections.biometricData).insertOne({
        _id: biometricId,
        ...biometricData,
        id: biometricId.toString(),
      });

      // Update status back to processing (or completed if transcription is also done)
      await db.collection(collections.recordings).updateOne(
        { _id: new ObjectId(recordingId) },
        { $set: { status: RecordingStatus.PROCESSING } }
      );

      return NextResponse.json(biometricData);
    } catch (processingError) {
      // Update status to failed on failure
      await db.collection(collections.recordings).updateOne(
        { _id: new ObjectId(recordingId) },
        { $set: { status: RecordingStatus.FAILED } }
      ).catch(() => {
        // Ignore error if status update fails
      });
      throw processingError;
    }
  } catch (error) {
    console.error('Presage processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process biometric data' },
      { status: 500 }
    );
  }
}
