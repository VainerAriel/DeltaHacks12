import ffmpeg from 'fluent-ffmpeg';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { isVmServiceConfigured, extractAudioFromVideo as vmExtractAudio } from './vm-ffmpeg/client';

// Lazy load ffmpeg path to handle Next.js bundling issues
let ffmpegPath: string | null = null;

function getFfmpegPath(): string {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:10',message:'getFfmpegPath entry',data:{cachedPath:ffmpegPath,processCwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  if (ffmpegPath) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:15',message:'getFfmpegPath cached return',data:{path:ffmpegPath},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return ffmpegPath;
  }

  try {
    // Use dynamic require to avoid Next.js bundling issues
    const ffmpegStatic = require('ffmpeg-static');
    
    // Debug logging
    console.log('[AudioExtract] ffmpeg-static require result:', {
      type: typeof ffmpegStatic,
      value: typeof ffmpegStatic === 'string' ? ffmpegStatic : '[object]',
      isString: typeof ffmpegStatic === 'string',
      isNull: ffmpegStatic === null,
      isUndefined: ffmpegStatic === undefined
    });
    
    // Handle different export formats
    let path: string | null = null;
    if (typeof ffmpegStatic === 'string' && ffmpegStatic) {
      path = ffmpegStatic;
    } else if (ffmpegStatic?.default && typeof ffmpegStatic.default === 'string') {
      path = ffmpegStatic.default;
    } else if (ffmpegStatic?.path && typeof ffmpegStatic.path === 'string') {
      path = ffmpegStatic.path;
    }
    
    // Fallback: if module returns null (e.g., on Windows ARM64), manually construct the path
    if (!path) {
      const fallbackPath = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
      console.log('[AudioExtract] Module returned null/undefined, trying fallback path:', fallbackPath);
      if (existsSync(fallbackPath)) {
        path = fallbackPath;
      } else {
        // Try resolving from node_modules using require.resolve
        try {
          const ffmpegStaticPath = require.resolve('ffmpeg-static');
          const ffmpegStaticDir = dirname(ffmpegStaticPath);
          const fallbackPath2 = join(ffmpegStaticDir, 'ffmpeg.exe');
          console.log('[AudioExtract] Trying fallback path 2:', fallbackPath2);
          if (existsSync(fallbackPath2)) {
            path = fallbackPath2;
          }
        } catch (resolveError) {
          console.warn('[AudioExtract] Could not resolve ffmpeg-static module path:', resolveError);
        }
      }
    }

    if (!path) {
      console.error('[AudioExtract] FFmpeg path resolution failed. Type:', typeof ffmpegStatic);
      console.error('[AudioExtract] Value:', ffmpegStatic);
      throw new Error('FFmpeg path not found in ffmpeg-static module');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:52',message:'Before existsSync check',data:{path:path},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Verify the path exists
    const pathExists = existsSync(path);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:56',message:'After existsSync check',data:{path:path,exists:pathExists},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!pathExists) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:59',message:'Path does not exist - throwing error',data:{path:path},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw new Error(`FFmpeg binary not found at: ${path}`);
    }

    ffmpegPath = path;
    ffmpeg.setFfmpegPath(path);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:66',message:'getFfmpegPath success',data:{path:path},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('[AudioExtract] FFmpeg path resolved:', path);
    return path;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f071bc-f187-40b1-aece-e023fc21cb07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/audio-extract.ts:70',message:'getFfmpegPath error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack?.substring(0,500):undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
 * @param videoUrl - Optional video URL for VM service (if video is already uploaded)
 * @returns Buffer containing audio data (WAV format)
 */
export async function extractAudioFromBuffer(
  videoBuffer: Buffer,
  videoExtension: string,
  videoUrl?: string
): Promise<Buffer> {
  // On Vercel, VM service is required (FFmpeg binaries don't work on Vercel)
  if (process.env.VERCEL) {
    if (!isVmServiceConfigured() || !videoUrl) {
      throw new Error('VM service is required on Vercel. Please configure FFMPEG_VM_URL and FFMPEG_API_KEY, and ensure videoUrl is provided.');
    }
    console.log('[AudioExtract] Using VM service for audio extraction (Vercel)');
    return await vmExtractAudio(videoUrl);
  }

  // Try VM service first if configured and videoUrl is provided
  if (isVmServiceConfigured() && videoUrl) {
    try {
      console.log('[AudioExtract] Using VM service for audio extraction');
      return await vmExtractAudio(videoUrl);
    } catch (error) {
      console.warn('[AudioExtract] VM service failed, falling back to local FFmpeg:', error);
      // Fall through to local processing (dev only)
    }
  }

  // Fall back to local FFmpeg processing (dev/local only, not on Vercel)
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
