import { Transcription, SpeechMetrics, Word, WordTimestamp } from '@/types/transcription';
import { extractAudioFromBuffer } from '@/lib/audio-extract';
import { readFile } from 'fs/promises';
import { join } from 'path';

if (!process.env.ELEVENLABS_API_KEY) {
  console.error('ELEVENLABS_API_KEY is required but not set. Please configure it in your .env.local file.');
}

// Type definitions for ElevenLabs API response
type ElevenLabsWord = {
  word?: string;
  text?: string;
  start?: number;
  start_time?: number;
  end?: number;
  end_time?: number;
  confidence?: number;
};

type ElevenLabsSegment = {
  words?: ElevenLabsWord[];
};

/**
 * Transcribe audio from video using ElevenLabs Speech-to-Text API
 * @param videoUrl - URL of the video file to transcribe
 * @returns Transcription with text, words, timestamps, and metrics
 */
export async function transcribeAudio(videoUrl: string): Promise<Transcription> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is required but not set. Please configure it in your .env.local file.');
  }

  try {
    let audioBuffer: Buffer;
    
    // Check if VM service is available - if so, skip downloading video in Next.js
    const { isVmServiceConfigured, extractAudioFromVideo } = await import('@/lib/vm-ffmpeg/client');
    
    if (isVmServiceConfigured() && videoUrl.startsWith('http')) {
      // Use VM service directly - no need to download video in Next.js
      console.log('[Transcribe] Using VM service - skipping video download in Next.js');
      audioBuffer = await extractAudioFromVideo(videoUrl);
      console.log('[Transcribe] Audio extracted via VM, size:', audioBuffer.length, 'bytes');
    } else {
      // Fallback: Download video file for local processing
      let videoBuffer: Buffer;
      let videoExtension = 'webm';
      
      if (videoUrl.startsWith('http')) {
        // Remote URL - fetch the file
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch video from URL: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        videoBuffer = Buffer.from(arrayBuffer);
        
        // Try to determine extension from URL
        try {
          const urlPath = new URL(videoUrl).pathname;
          const extMatch = urlPath.match(/\.(\w+)$/);
          if (extMatch) {
            videoExtension = extMatch[1];
          }
        } catch (urlError) {
          // If URL parsing fails, use default extension
          console.warn('[Transcribe] Failed to parse URL, using default extension:', urlError);
        }
      } else {
        // Local file path - read from filesystem
        // Security: prevent path traversal attacks
        if (videoUrl.includes('..')) {
          throw new Error('Invalid file path: path traversal detected');
        }
        
        const filePath = videoUrl.startsWith('/')
          ? join(process.cwd(), 'public', videoUrl)
          : join(process.cwd(), 'public', 'uploads', videoUrl);
        
        videoBuffer = await readFile(filePath);
        
        // Determine extension from file path
        const extMatch = filePath.match(/\.(\w+)$/);
        if (extMatch) {
          videoExtension = extMatch[1];
        }
      }

      // Extract audio from video
      console.log('[Transcribe] Extracting audio from video...');
      // Pass videoUrl to enable VM service if configured (for local files)
      audioBuffer = await extractAudioFromBuffer(videoBuffer, videoExtension, videoUrl);
      console.log('[Transcribe] Audio extracted, size:', audioBuffer.length, 'bytes');
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Failed to extract audio from video - audio buffer is empty');
    }

    // Call ElevenLabs Speech-to-Text API
    // Use FormData to properly construct multipart/form-data
    // In Node.js 18+, FormData and File are available globally
    
    // Prepare audio file (reusable across retries)
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });
    const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
    
    // Available models: 'scribe_v1', 'scribe_v1_experimental', 'scribe_v2'
    // Using 'scribe_v2' as default (can be configured via env var)
    const modelId = process.env.ELEVENLABS_STT_MODEL_ID || 'scribe_v2';

    console.log('[Transcribe] Calling ElevenLabs API');
    console.log('[Transcribe] Audio size:', audioBuffer.length, 'bytes');
    console.log('[Transcribe] API Key present:', !!process.env.ELEVENLABS_API_KEY);
    console.log('[Transcribe] API Key length:', process.env.ELEVENLABS_API_KEY?.length || 0);

    // Retry logic with exponential backoff for rate limits and server errors
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff: 2s, 4s, 8s
          console.log(`[Transcribe] Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Create fresh FormData for each attempt (FormData can only be read once)
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model_id', modelId);

        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            // Don't set Content-Type header - fetch will set it with boundary automatically
          },
          body: formData,
        });

        console.log('[Transcribe] ElevenLabs API response status:', response.status, response.statusText);

        // Retry on rate limits (429) and server errors (5xx)
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          const errorText = await response.text();
          console.warn(`[Transcribe] Retryable error (${response.status}):`, errorText);
          
          if (attempt < maxRetries) {
            lastError = new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
            continue; // Retry
          } else {
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
          }
        }

        if (!response.ok) {
          const error = await response.text();
          console.error('[Transcribe] ElevenLabs API error response:', {
            status: response.status,
            statusText: response.statusText,
            error: error
          });
          throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${error}`);
        }

        const result = await response.json();
        console.log('[Transcribe] ElevenLabs API response received');

        // Process ElevenLabs response
        // Based on ElevenLabs API documentation, response should contain text and word timestamps
        const text = result.text || result.transcript || '';
        const words: Word[] = [];
        const wordTimestamps: WordTimestamp[] = [];

        // If ElevenLabs provides word-level timestamps
        if (result.words && Array.isArray(result.words)) {
          result.words.forEach((word: ElevenLabsWord) => {
            words.push({
              word: word.word || word.text || '',
              start: word.start || word.start_time || 0,
              end: word.end || word.end_time || 0,
              confidence: word.confidence || 0.9,
            });
            wordTimestamps.push({
              word: word.word || word.text || '',
              timestamp: word.start || word.start_time || 0,
            });
          });
        } else if (result.segments && Array.isArray(result.segments)) {
          // Alternative format: segments with words
          result.segments.forEach((segment: ElevenLabsSegment) => {
            if (segment.words && Array.isArray(segment.words)) {
              segment.words.forEach((word: ElevenLabsWord) => {
                words.push({
                  word: word.word || word.text || '',
                  start: word.start || word.start_time || 0,
                  end: word.end || word.end_time || 0,
                  confidence: word.confidence || 0.9,
                });
                wordTimestamps.push({
                  word: word.word || word.text || '',
                  timestamp: word.start || word.start_time || 0,
                });
              });
            }
          });
        } else {
          // Fallback: generate word timestamps from text
          const textWords = text.split(/\s+/);
          let currentTime = 0;
          textWords.forEach((word: string) => {
            const start = currentTime;
            const duration = 0.3 + Math.random() * 0.5;
            const end = start + duration;
            
            words.push({
              word: word.replace(/[.,!?]/g, ''),
              start,
              end,
              confidence: 0.9,
            });
            wordTimestamps.push({
              word: word.replace(/[.,!?]/g, ''),
              timestamp: start,
            });
            currentTime = end + (Math.random() * 0.5);
          });
        }

        // Calculate speech metrics
        const duration = words.length > 0 
          ? Math.max(...words.map(w => w.end))
          : 0;
        const metrics = calculateSpeechMetrics(text, words, duration);

        return {
          id: `transcription-${Date.now()}`,
          recordingId: '', // Will be set by caller
          text,
          words,
          wordTimestamps,
          metrics,
          createdAt: new Date(),
        };
      } catch (fetchError) {
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          console.error('[Transcribe] Final attempt failed:', fetchError);
          throw fetchError;
        }
        // Otherwise, continue to next retry
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.warn(`[Transcribe] Attempt ${attempt + 1} failed, will retry:`, fetchError);
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Failed to transcribe audio after all retry attempts');
  } catch (error) {
    console.error('Error transcribing audio with ElevenLabs:', error);
    // Re-throw the error instead of returning mock data
    throw error;
  }
}

/**
 * Calculate speech metrics from transcription
 */
function calculateSpeechMetrics(
  text: string,
  words: Word[],
  duration: number
): SpeechMetrics {
  const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically'];
  const textLower = text.toLowerCase();
  
  let fillerWordsCount = 0;
  fillerWords.forEach((filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      fillerWordsCount += matches.length;
    }
  });

  const wordCount = words.length;
  const wpm = duration > 0 ? (wordCount / duration) * 60 : 0;

  // Calculate pause durations
  const pauses: number[] = [];
  for (let i = 1; i < words.length; i++) {
    const pause = words[i].start - words[i - 1].end;
    if (pause > 0.3) { // Pauses longer than 300ms
      pauses.push(pause);
    }
  }

  const longestPause = pauses.length > 0 ? Math.max(...pauses) : 0;
  const averagePause = pauses.length > 0
    ? pauses.reduce((a, b) => a + b, 0) / pauses.length
    : 0;

  return {
    wpm: Math.round(wpm),
    fillerWordsCount,
    longestPause: Math.round(longestPause * 100) / 100,
    averagePause: Math.round(averagePause * 100) / 100,
    totalPauses: pauses.length,
  };
}

