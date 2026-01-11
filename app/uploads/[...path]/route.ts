import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Route handler for /uploads/ paths (backward compatibility)
 * Serves video files with proper Content-Type headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filename = params.path.join('/');
    
    // Security: prevent path traversal
    if (filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    // Extract just the filename (in case path has subdirectories)
    const actualFilename = filename.split('/').pop() || filename;

    const filePath = join(process.cwd(), 'public', 'uploads', actualFilename);
    
    console.log(`[Uploads Route] Requested file: ${actualFilename}`);
    console.log(`[Uploads Route] File path: ${filePath}`);
    console.log(`[Uploads Route] File exists: ${existsSync(filePath)}`);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`[Uploads Route] File not found: ${filePath}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Determine Content-Type based on file extension
    const getContentType = (filename: string): string => {
      const ext = filename.toLowerCase().split('.').pop();
      const mimeTypes: Record<string, string> = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
      };
      return mimeTypes[ext || ''] || 'application/octet-stream';
    };

    const fileBuffer = await readFile(filePath);
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
