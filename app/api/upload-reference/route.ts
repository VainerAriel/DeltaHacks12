import { NextRequest, NextResponse } from 'next/server';
import { getDb, collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { getUserIdFromRequest } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3/upload';
import { isS3Configured } from '@/lib/s3/client';

// For local storage (fallback if S3 is not configured - dev only)
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Polyfill DOMMatrix for pdf-parse compatibility (must be before require)
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor(init?: string | number[]) {
      // Minimal polyfill - pdf-parse doesn't actually use DOMMatrix methods
    }
  };
}

interface ReferenceDocument {
  id: string;
  userId: string;
  type: 'slides' | 'script';
  fileName: string;
  fileUrl: string;
  extractedContent: string;
  createdAt: Date;
}

/**
 * Extract text content from a file
 */
async function extractTextContent(file: File, fileType: string): Promise<string> {
  if (fileType === 'application/pdf') {
    // Use require for pdf-parse (server-side only, works better with Next.js)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdfParse(buffer);
    return data.text || '';
  } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
    // Plain text file
    return await file.text();
  } else {
    // For other types, try to read as text
    return await file.text();
  }
}

export async function POST(request: NextRequest) {
  console.log('[UploadReference] Upload reference route called');
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'slides' or 'script'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'slides' && type !== 'script')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "slides" or "script"' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt'];
    const fileExtensionLower = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtensionLower)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PDF or TXT files.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max for reference documents)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // Get user ID from JWT token
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Extract text content
    let extractedContent = '';
    try {
      extractedContent = await extractTextContent(file, file.type);
      if (!extractedContent || extractedContent.trim().length === 0) {
        return NextResponse.json(
          { error: 'Could not extract text content from file. Please ensure the file contains readable text.' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('[UploadReference] Error extracting content:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to extract content from file' },
        { status: 400 }
      );
    }

    const documentId = new ObjectId().toString();
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const fileName = `${documentId}${fileExtension}`;
    let fileUrl: string;

    // Upload to S3 (required on Vercel)
    if (isS3Configured) {
      try {
        console.log('[UploadReference] Uploading to S3...');
        fileUrl = await uploadToS3(file, fileName, file.type, 'references');
        console.log('[UploadReference] Successfully uploaded to S3:', fileUrl);
      } catch (error) {
        console.error('[UploadReference] S3 upload failed:', error);
        // On Vercel, S3 is required - don't fallback
        if (process.env.VERCEL) {
          throw new Error('S3 upload failed. S3 storage is required on Vercel. Please check your AWS credentials.');
        }
        // Fallback to local storage only in development
        console.log('[UploadReference] Falling back to local storage (dev mode only)...');
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'references');
        await mkdir(uploadsDir, { recursive: true });
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        fileUrl = `/uploads/references/${fileName}`;
      }
    } else {
      // On Vercel, S3 is required
      if (process.env.VERCEL) {
        return NextResponse.json(
          { error: 'S3 storage is required on Vercel. Please configure AWS S3 credentials.' },
          { status: 500 }
        );
      }
      // Local storage (dev only)
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'references');
      await mkdir(uploadsDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      fileUrl = `/uploads/references/${fileName}`;
    }

    // Store in database
    const db = await getDb();
    const document: Omit<ReferenceDocument, 'id'> = {
      userId,
      type: type as 'slides' | 'script',
      fileName: file.name,
      fileUrl,
      extractedContent,
      createdAt: new Date(),
    };

    await db.collection(collections.referenceDocuments).insertOne({
      _id: new ObjectId(documentId),
      ...document,
    });

    console.log('[UploadReference] Successfully uploaded reference document:', fileName);

    return NextResponse.json({
      documentId,
      fileUrl,
      extractedContent: extractedContent.substring(0, 500), // Return first 500 chars as preview
      type: type as 'slides' | 'script',
    });
  } catch (error) {
    console.error('[UploadReference] Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload reference document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
