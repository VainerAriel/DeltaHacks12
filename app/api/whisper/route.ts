import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { transcribeAudio } from '@/lib/elevenlabs/transcribe';
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

    // Update status to transcribing
    await db.collection(collections.recordings).updateOne(
      { _id: new ObjectId(recordingId) },
      { $set: { status: RecordingStatus.TRANSCRIBING } }
    );

    try {
      // Transcribe audio using ElevenLabs
      const videoUrl = recording.videoUrl;
      const transcription = await transcribeAudio(videoUrl);
      transcription.recordingId = recordingId;

      // Store transcription
      // Generate a new ObjectId for the transcription document
      const transcriptionId = new ObjectId();
      await db.collection(collections.transcriptions).insertOne({
        _id: transcriptionId,
        ...transcription,
        id: transcriptionId.toString(),
      });

      // Update status to complete
      await db.collection(collections.recordings).updateOne(
        { _id: new ObjectId(recordingId) },
        { $set: { status: RecordingStatus.COMPLETE } }
      );

      return NextResponse.json(transcription);
    } catch (transcriptionError) {
      // Update status to failed on failure
      await db.collection(collections.recordings).updateOne(
        { _id: new ObjectId(recordingId) },
        { $set: { status: RecordingStatus.FAILED } }
      ).catch(() => {
        // Ignore error if status update fails
      });
      throw transcriptionError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('ElevenLabs transcription error:', errorMessage);
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
