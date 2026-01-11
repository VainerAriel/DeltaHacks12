import { NextRequest, NextResponse } from 'next/server';
import { uploadVideoToS3 } from '@/lib/s3/upload';
import { getDb } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { getUserIdFromRequest } from '@/lib/auth';
import { RecordingStatus } from '@/types/recording';

export async function POST(req: NextRequest) {
  try {
    // Get user ID from JWT token
    const userId = getUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('video') as File;
    const sessionId = formData.get('sessionId') as string | null;
    const questionText = formData.get('questionText') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only MP4, WebM, and MOV are supported.' },
        { status: 400 }
      );
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Generate MongoDB ObjectId for the recording
    const recordingObjectId = new ObjectId();
    const recordingId = recordingObjectId.toString();
    const extension = file.name.split('.').pop();
    const fileName = `${recordingId}.${extension}`;

    // Upload to S3 (or local if S3 not configured)
    const videoUrl = await uploadVideoToS3(file, fileName);

    // Save to database
    const db = await getDb();
    const recordingData: any = {
      _id: recordingObjectId,
      id: recordingId,
      userId,
      videoUrl,
      fileName,
      duration: 0, // Will be updated after FFmpeg processing
      status: RecordingStatus.UPLOADING,
      createdAt: new Date(),
    };
    
    // Add sessionId and questionText if provided (for interview sessions)
    if (sessionId) {
      recordingData.sessionId = sessionId;
    }
    if (questionText) {
      recordingData.questionText = questionText;
    }
    
    await db.collection('recordings').insertOne(recordingData);

    return NextResponse.json({
      success: true,
      recordingId,
      videoUrl,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}