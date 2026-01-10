import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

// Lazy load ffmpeg path to handle Next.js bundling issues
let ffmpegPath: string | null = null;

function getFfmpegPath(): string {
  if (ffmpegPath) {
    return ffmpegPath;
  }

  try {
    // Use dynamic require to avoid Next.js bundling issues
    const ffmpegStatic = require('ffmpeg-static');
    
    // Handle different export formats
    let path: string | null = null;
    if (typeof ffmpegStatic === 'string') {
      path = ffmpegStatic;
    } else if (ffmpegStatic?.default && typeof ffmpegStatic.default === 'string') {
      path = ffmpegStatic.default;
    } else if (ffmpegStatic?.path && typeof ffmpegStatic.path === 'string') {
      path = ffmpegStatic.path;
    }

    if (!path) {
      throw new Error('FFmpeg path not found in ffmpeg-static module');
    }

    // Verify the path exists
    if (!existsSync(path)) {
      throw new Error(`FFmpeg binary not found at: ${path}`);
    }

    ffmpegPath = path;
    ffmpeg.setFfmpegPath(path);
    console.log('[AudioExtract] FFmpeg path resolved:', path);
    return path;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to initialize FFmpeg: ${errorMessage}. Please ensure ffmpeg-static is installed: npm install ffmpeg-static`);
  }
}

/**
 * Extracts audio from a video file and converts it to WAV format
 * @param videoPath - Path to the video file
 * @returns Path to the extracted audio file (WAV format)
 */
export async function extractAudioFromVideo(videoPath: string): Promise<string> {
  // Ensure ffmpeg path is set before using it
  getFfmpegPath();
  
  const audioPath = join(tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('pcm_s16le') // WAV format
      .audioFrequency(16000) // 16kHz sample rate (good for speech)
      .audioChannels(1) // Mono
      .on('end', () => {
        resolve(audioPath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Extracts audio from a video buffer and returns audio buffer
 * @param videoBuffer - Buffer containing video data
 * @param videoExtension - Extension of the video file (e.g., 'mp4', 'webm')
 * @returns Buffer containing audio data (WAV format)
 */
export async function extractAudioFromBuffer(
  videoBuffer: Buffer,
  videoExtension: string
): Promise<Buffer> {
  // Ensure ffmpeg path is set before using it
  getFfmpegPath();
  
  const videoPath = join(tmpdir(), `video-${Date.now()}-${Math.random().toString(36).substring(7)}.${videoExtension}`);
  const audioPath = join(tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`);

  try {
    // Write video buffer to temporary file
    try {
      await writeFile(videoPath, videoBuffer);
    } catch (writeError: any) {
      if (writeError.code === 'ENOSPC') {
        throw new Error('Disk space is full. Please free up space on your system and try again. Temporary files are stored in: ' + tmpdir());
      }
      throw writeError;
    }

    // Extract audio
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });

    // Read audio file
    const audioBuffer = await readFile(audioPath);

    // Clean up temporary files immediately after reading
    await unlink(videoPath).catch(() => {});
    await unlink(audioPath).catch(() => {});

    return audioBuffer;
  } catch (error: any) {
    // Clean up on error
    await unlink(videoPath).catch(() => {});
    await unlink(audioPath).catch(() => {});
    
    // Provide helpful error message for disk space issues
    if (error.code === 'ENOSPC' || error.message?.includes('no space')) {
      throw new Error('Disk space is full. Please free up space on your system and try again. Temporary files location: ' + tmpdir());
    }
    throw error;
  }
}
