import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filePath = path.join(
      process.cwd(),
      'uploads',
      'recordings',
      params.filename
    );

    const file = await readFile(filePath);

    // Determine content type based on extension
    const ext = params.filename.split('.').pop()?.toLowerCase();
    const contentType = 
      ext === 'mp4' ? 'video/mp4' :
      ext === 'webm' ? 'video/webm' :
      ext === 'mov' ? 'video/quicktime' :
      'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json(
      { error: 'Video not found' },
      { status: 404 }
    );
  }
}