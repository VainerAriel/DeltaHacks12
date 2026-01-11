import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getContentType } from '@/lib/utils';

/**
 * Route handler for /uploads/ paths (backward compatibility)
 * Serves video files with proper Content-Type headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/');
    
    // Security: prevent path traversal
    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    // Build full path: public/uploads/{folder}/{filename}
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath);
    
    console.log(`[Uploads Route] Requested file: ${filePath}`);
    console.log(`[Uploads Route] Full file path: ${fullPath}`);
    console.log(`[Uploads Route] File exists: ${existsSync(fullPath)}`);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      console.error(`[Uploads Route] File not found: ${fullPath}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Extract filename for content type detection
    const actualFilename = filePath.split('/').pop() || filePath;

    const fileBuffer = await readFile(fullPath);
    const contentType = getContentType(actualFilename);

    // Return video with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving video from uploads:', error);
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    );
  }
}
