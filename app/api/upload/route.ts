import { NextRequest, NextResponse } from 'next/server';
import { uploadVideoToS3 } from '@/lib/s3/upload';
import { getDb, collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { getUserIdFromRequest } from '@/lib/auth';
import { RecordingStatus, Recording } from '@/types/recording';
import { getVideoDuration } from '@/lib/video-duration';
import { isS3Configured } from '@/lib/s3/client';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';

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
    const referenceDocumentId = formData.get('referenceDocumentId') as string | null;
    const minDurationStr = formData.get('minDuration') as string | null;
    const maxDurationStr = formData.get('maxDuration') as string | null;
    const scenario = formData.get('scenario') as string | null;
    console.log('[Upload] Video file received:', file ? `Size: ${file.size} bytes, Type: ${file.type}` : 'null');
    console.log('[Upload] Session ID:', sessionId || 'none');
    console.log('[Upload] Question text:', questionText || 'none');
    console.log('[Upload] Reference document ID:', referenceDocumentId || 'none');
    console.log('[Upload] Duration constraints:', minDurationStr || 'none', '-', maxDurationStr || 'none');
    console.log('[Upload] Scenario:', scenario || 'none');

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

    // Upload to S3 first (required on Vercel) - we need videoUrl for VM service
    let videoUrl: string;
    if (isS3Configured) {
      try {
        console.log('[Upload] Uploading to S3...');
        videoUrl = await uploadVideoToS3(file, fileName);
        console.log('[Upload] Successfully uploaded to S3:', videoUrl);
      } catch (error) {
        console.error('[Upload] S3 upload failed:', error);
        // On Vercel, S3 is required - don't fallback
        if (process.env.VERCEL) {
          throw new Error('S3 upload failed. S3 storage is required on Vercel. Please check your AWS credentials.');
        }
        // Fallback to local storage only in development
        console.log('[Upload] Falling back to local storage (dev mode only)...');
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        videoUrl = `/uploads/${fileName}`;
      }
    } else {
      // On Vercel, S3 is required
      if (process.env.VERCEL) {
        return NextResponse.json(
          { error: 'S3 storage is required on Vercel. Please configure AWS S3 credentials.' },
          { status: 500 }
        );
      }
      // Local storage fallback (dev only)
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      const bytes = await file.arrayBuffer();
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

    // Extract video duration after upload (so we can use VM service with videoUrl)
    let duration = 0;
    try {
      console.log('[Upload] Extracting video duration...');
      // On Vercel, videoUrl must be an HTTP URL (S3) for VM service
      // In dev, can use local file path
      const durationUrl = process.env.VERCEL || videoUrl.startsWith('http') 
        ? videoUrl 
        : undefined;
      duration = await getVideoDuration(file, file.type, durationUrl);
      console.log('[Upload] Video duration:', duration, 'seconds');
    } catch (error) {
      console.error('[Upload] Failed to extract video duration:', error);
      // Continue with duration = 0 if extraction fails
      // On Vercel, this might fail if VM service is not configured, but we'll continue
      if (process.env.VERCEL) {
        console.warn('[Upload] Duration extraction failed on Vercel. Ensure VM service is configured.');
      }
    }

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
    // Parse duration constraints
    const minDuration = minDurationStr ? parseInt(minDurationStr, 10) : undefined;
    const maxDuration = maxDurationStr ? parseInt(maxDurationStr, 10) : undefined;

    const recording: Omit<Recording, 'id'> = {
      userId,
      videoUrl,
      fileName,
      duration: duration || 0, // Use extracted duration or 0
      status: RecordingStatus.UPLOADING,
      createdAt: new Date(),
      ...(sessionId && { sessionId }),
      ...(questionText && { questionText }),
      ...(referenceDocumentId && { referenceDocumentId }),
      ...(minDuration !== undefined && { minDuration }),
      ...(maxDuration !== undefined && { maxDuration }),
      ...(scenario && { scenario }),
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