/**
 * Client for FFmpeg VM service
 * Handles communication with the remote FFmpeg service on Vultr VM
 */

const VM_SERVICE_URL = process.env.FFMPEG_VM_URL;
const VM_API_KEY = process.env.FFMPEG_API_KEY;

/**
 * Check if VM service is configured
 */
export function isVmServiceConfigured(): boolean {
  return Boolean(VM_SERVICE_URL && VM_API_KEY);
}

/**
 * Extract audio from video URL using VM service
 * @param videoUrl - URL of the video file
 * @returns Buffer containing audio data (WAV format)
 */
export async function extractAudioFromVideo(videoUrl: string): Promise<Buffer> {
  if (!VM_SERVICE_URL || !VM_API_KEY) {
    throw new Error('FFMPEG_VM_URL and FFMPEG_API_KEY must be configured');
  }

  try {
    console.log('[VM-FFmpeg] Extracting audio from:', videoUrl);
    
    const response = await fetch(`${VM_SERVICE_URL}/api/extract-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VM_API_KEY,
      },
      body: JSON.stringify({ videoUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`VM service error: ${response.status} - ${error.error || error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    if (!result.audioBase64) {
      throw new Error('Invalid response from VM service: missing audioBase64');
    }

    // Convert base64 to Buffer
    const audioBuffer = Buffer.from(result.audioBase64, 'base64');
    console.log('[VM-FFmpeg] Audio extracted, size:', audioBuffer.length, 'bytes');
    
    return audioBuffer;
  } catch (error) {
    console.error('[VM-FFmpeg] Error extracting audio:', error);
    throw error;
  }
}

/**
 * Get video duration from video URL using VM service
 * @param videoUrl - URL of the video file
 * @returns Duration in seconds
 */
export async function getVideoDurationFromUrl(videoUrl: string): Promise<number> {
  if (!VM_SERVICE_URL || !VM_API_KEY) {
    throw new Error('FFMPEG_VM_URL and FFMPEG_API_KEY must be configured');
  }

  try {
    console.log('[VM-FFmpeg] Getting video duration from:', videoUrl);
    
    const response = await fetch(`${VM_SERVICE_URL}/api/video-duration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VM_API_KEY,
      },
      body: JSON.stringify({ videoUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`VM service error: ${response.status} - ${error.error || error.message || 'Unknown error'}`);
    }

    const result = await response.json();
    
    if (result.duration === undefined || result.duration === null) {
      throw new Error('Invalid response from VM service: missing duration');
    }

    console.log('[VM-FFmpeg] Video duration:', result.duration, 'seconds');
    
    return result.duration;
  } catch (error) {
    console.error('[VM-FFmpeg] Error getting video duration:', error);
    throw error;
  }
}
