import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/s3/presigned-url';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    // Generate presigned URL on the server
    const presignedUrl = await getPresignedUrl(videoUrl);

    return NextResponse.json({ presignedUrl });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
