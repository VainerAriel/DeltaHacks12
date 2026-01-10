import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { Recording, RecordingStatus } from '@/types/recording';
import { ObjectId } from 'mongodb';

// For local storage (fallback if S3 is not configured)
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  console.log('[Upload] Upload route called');
  try {
    console.log('[Upload] Parsing form data...');
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    console.log('[Upload] Video file received:', videoFile ? `Size: ${videoFile.size} bytes, Type: ${videoFile.type}` : 'null');

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload MP4, WebM, or MOV files.' },
        { status: 400 }
      );
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit.' },
        { status: 400 }
      );
    }

    // Get user ID from auth token or use demo user for development
    const userId = 'demo-user'; // TODO: Extract from JWT token

    let videoUrl: string;
    const recordingId = new ObjectId().toString();

    // Determine file extension based on MIME type
    const getFileExtension = (mimeType: string): string => {
      const mimeToExt: Record<string, string> = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi',
      };
      return mimeToExt[mimeType] || 'webm'; // Default to webm
    };

    const fileExtension = getFileExtension(videoFile.type);
    const fileName = `${recordingId}.${fileExtension}`;

    // Upload to S3 or local storage
    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
      // TODO: Implement S3 upload
      // const s3Url = await uploadToS3(videoFile, recordingId);
      // videoUrl = s3Url;
      videoUrl = `/uploads/${fileName}`;
    } else {
      // Local storage fallback
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      const bytes = await videoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filePath = join(uploadsDir, fileName);
      
      // Ensure directory exists
      await mkdir(uploadsDir, { recursive: true });
      
      // Write file
      await writeFile(filePath, buffer);
      
      // Verify file was written
      const { existsSync } = await import('fs');
      if (!existsSync(filePath)) {
        throw new Error('Failed to save file to disk');
      }
      
      console.log(`Video saved to: ${filePath}`);
      console.log(`File size: ${buffer.length} bytes`);
      
      // Use /uploads/ path - will be served by app/uploads/[...path]/route.ts
      videoUrl = `/uploads/${fileName}`;
    }

    // Get video duration (simplified - in production, use ffmpeg or similar)
    const duration = 0; // TODO: Extract actual duration

    // Create recording document
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
    const recording: Omit<Recording, 'id'> = {
      userId,
      videoUrl,
      duration,
      status: RecordingStatus.UPLOADING,
      createdAt: new Date(),
    };

    await db.collection(collections.recordings).insertOne({
      _id: new ObjectId(recordingId),
      ...recording,
    });

    // Update status to processing
    await db.collection(collections.recordings).updateOne(
      { _id: new ObjectId(recordingId) },
      { $set: { status: RecordingStatus.PROCESSING } }
    );

    console.log('[Upload] Successfully uploaded:', fileName);
    console.log('[Upload] Video URL:', videoUrl);
    console.log('[Upload] Recording ID:', recordingId);

    return NextResponse.json({
      recordingId,
      videoUrl,
      status: RecordingStatus.PROCESSING,
    });
  } catch (error) {
    console.error('[Upload] Upload error:', error);
    console.error('[Upload] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
