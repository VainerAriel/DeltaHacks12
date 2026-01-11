import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { analyzePresentation } from '@/lib/gemini/analyzer';
import { RecordingStatus } from '@/types/recording';
import { Transcription } from '@/types/transcription';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordingId, scenario } = body;

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

    // Fetch recording to get questionText, referenceDocumentId, and duration constraints
    const recording = await db.collection(collections.recordings).findOne({
      _id: new ObjectId(recordingId),
    });

    // Fetch transcription
    const transcription = await db.collection(collections.transcriptions).findOne({
      recordingId,
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found. Please process it first.' },
        { status: 404 }
      );
    }

    // Update status to analyzing
    await db.collection(collections.recordings).updateOne(
      { _id: new ObjectId(recordingId) },
      { $set: { status: RecordingStatus.ANALYZING } }
    );

    // Get questionText and duration from recording if available
    const questionText = recording?.questionText;
    const duration = recording?.duration || 0;
    
    // Fetch reference document if available
    let referenceContent: string | undefined;
    let referenceType: 'slides' | 'script' | undefined;
    if (recording?.referenceDocumentId) {
      const referenceDoc = await db.collection(collections.referenceDocuments).findOne({
        _id: new ObjectId(recording.referenceDocumentId),
      });
      if (referenceDoc) {
        referenceContent = referenceDoc.extractedContent;
        referenceType = referenceDoc.type;
      }
    }

    // Get duration constraints and actual duration from recording
    const minDuration = recording?.minDuration;
    const maxDuration = recording?.maxDuration;
    const actualDuration = recording?.duration || duration;

    // Analyze presentation
    const feedbackReport = await analyzePresentation(
      transcription as unknown as Transcription,
      scenario,
      questionText,
      duration,
      referenceContent,
      referenceType,
      minDuration,
      maxDuration,
      actualDuration
    );
    feedbackReport.recordingId = recordingId;

    // Store feedback report
    // Generate a new ObjectId for the feedback report document
    const feedbackId = new ObjectId();
    await db.collection(collections.feedbackReports).insertOne({
      _id: feedbackId,
      ...feedbackReport,
      id: feedbackId.toString(),
    });

    // Update recording status to complete
    await db.collection(collections.recordings).updateOne(
      { _id: new ObjectId(recordingId) },
      { $set: { status: RecordingStatus.COMPLETE } }
    );

    return NextResponse.json(feedbackReport);
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze presentation' },
      { status: 500 }
    );
  }
}
