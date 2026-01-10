import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { transcribeAudio } from '@/lib/whisper/transcribe';
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

    // Transcribe audio
    const videoUrl = recording.videoUrl;
    const transcription = await transcribeAudio(videoUrl);
    transcription.recordingId = recordingId;

    // Store transcription
    await db.collection(collections.transcriptions).insertOne({
      _id: new ObjectId(transcription.id),
      ...transcription,
    });

    return NextResponse.json(transcription);
  } catch (error) {
    console.error('Whisper transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
