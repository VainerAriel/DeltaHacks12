import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { isVmServiceConfigured, getVideoDurationFromUrl as vmGetVideoDuration } from './vm-ffmpeg/client';

// Lazy load ffprobe path to handle Next.js bundling issues
let ffprobePath: string | null = null;

function getFfprobePath(): string {
  if (ffprobePath) {
    return ffprobePath;
  }

  try {
    // Use dynamic require to avoid Next.js bundling issues
    const ffprobeStatic = require('ffprobe-static');
    
    // Handle different export formats
    let path: string | null = null;
    if (ffprobeStatic?.path && typeof ffprobeStatic.path === 'string') {
      path = ffprobeStatic.path;
    } else if (typeof ffprobeStatic === 'string') {
      path = ffprobeStatic;
    } else if (ffprobeStatic?.default && typeof ffprobeStatic.default === 'string') {
      path = ffprobeStatic.default;
    }

    if (!path) {
      throw new Error('FFprobe path not found in ffprobe-static module');
    }

    // Verify the path exists
    if (!existsSync(path)) {
      throw new Error(`FFprobe binary not found at: ${path}`);
    }

    ffprobePath = path;
    ffmpeg.setFfprobePath(path);
    console.log('[VideoDuration] FFprobe path resolved:', path);
    return path;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to initialize FFprobe: ${errorMessage}. Please ensure ffprobe-static is installed: npm install ffprobe-static`);
  }
}

/**
 * Extracts video duration from a file path
 * @param filePath - Path to the video file
 * @returns Duration in seconds
 */
export async function getVideoDurationFromPath(filePath: string): Promise<number> {
  // Ensure ffprobe path is set before using it
  getFfprobePath();
  
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration;
      if (duration === undefined) {
        reject(new Error('Could not extract video duration'));
        return;
      }

      resolve(Math.round(duration));
    });
  });
}

/**
 * Extracts video duration from a File or Buffer
 * @param file - The video file (File or Buffer)
 * @param mimeType - The MIME type of the video
 * @param videoUrl - Optional video URL for VM service (if video is already uploaded)
 * @returns Duration in seconds
 */
export async function getVideoDuration(
  file: File | Buffer,
  mimeType: string,
  videoUrl?: string
): Promise<number> {
  // Try VM service first if configured and videoUrl is provided
  if (isVmServiceConfigured() && videoUrl) {
    try {
      console.log('[VideoDuration] Using VM service for duration extraction');
      return await vmGetVideoDuration(videoUrl);
    } catch (error) {
      console.warn('[VideoDuration] VM service failed, falling back to local ffprobe:', error);
      // Fall through to local processing
    }
  }

  // Fall back to local ffprobe processing
  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = file;
  }

  // Determine file extension from MIME type
  const getFileExtension = (mimeType: string): string => {
    const mimeToExt: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
    };
    return mimeToExt[mimeType] || 'mp4';
  };

  const extension = getFileExtension(mimeType);
  const tempFilePath = join(tmpdir(), `video-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`);

  try {
    // Write buffer to temporary file
    try {
      await writeFile(tempFilePath, buffer);
    } catch (writeError: any) {
      if (writeError.code === 'ENOSPC') {
        throw new Error('Disk space is full. Please free up space on your system and try again. Temporary files are stored in: ' + tmpdir());
      }
      throw writeError;
    }

    // Extract duration
    const duration = await getVideoDurationFromPath(tempFilePath);

    // Clean up temporary file immediately
    await unlink(tempFilePath);

    return duration;
  } catch (error: any) {
    // Clean up temporary file on error
    try {
      await unlink(tempFilePath);
    } catch (unlinkError) {
      // Ignore cleanup errors
    }
    
    // Provide helpful error message for disk space issues
    if (error.code === 'ENOSPC' || error.message?.includes('no space')) {
      throw new Error('Disk space is full. Please free up space on your system and try again. Temporary files location: ' + tmpdir());
    }
    throw error;
  }
}
