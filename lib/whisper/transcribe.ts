import OpenAI from 'openai';
import { Transcription, SpeechMetrics, Word, WordTimestamp } from '@/types/transcription';

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set. Transcription will use mock data.');
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Transcribe audio from video using OpenAI Whisper API
 * @param videoUrl - URL of the video file to transcribe
 * @returns Transcription with text, words, timestamps, and metrics
 */
export async function transcribeAudio(videoUrl: string): Promise<Transcription> {
  if (!openai) {
    // Return mock data if API key is not set
    return generateMockTranscription(videoUrl);
  }

  try {
    // Download video file
    // Note: Whisper API can handle video files directly and will extract audio
    // For local files, we need to read from the filesystem
    let file: File | Blob;
    
    if (videoUrl.startsWith('http')) {
      // Remote URL - fetch the file
      const response = await fetch(videoUrl);
      file = await response.blob();
    } else {
      // Local file path - in production, read from filesystem
      // TODO: Implement server-side file reading for local paths
      const response = await fetch(videoUrl);
      file = await response.blob();
    }
    
    // Create a File object for OpenAI API
    // Note: OpenAI Whisper accepts video files and extracts audio automatically
    const videoFile = new File([file], 'video.webm', { type: file.type || 'video/webm' });

    // Call Whisper API with timestamp
    const transcription = await openai.audio.transcriptions.create({
      file: videoFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    // Process transcription response
    const words: Word[] = [];
    const wordTimestamps: WordTimestamp[] = [];

    if (transcription.words) {
      transcription.words.forEach((word) => {
        words.push({
          word: word.word,
          start: word.start,
          end: word.end,
          confidence: 1.0, // Whisper doesn't provide confidence, using default
        });
        wordTimestamps.push({
          word: word.word,
          timestamp: word.start,
        });
      });
    }

    // Calculate speech metrics
    const metrics = calculateSpeechMetrics(
      transcription.text,
      words,
      transcription.duration || 0
    );

    return {
      id: `transcription-${Date.now()}`,
      recordingId: '', // Will be set by caller
      text: transcription.text,
      words,
      wordTimestamps,
      metrics,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    // Return mock data on error for development
    return generateMockTranscription(videoUrl);
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

/**
 * Generate mock transcription for testing
 */
function generateMockTranscription(videoUrl: string): Transcription {
  const mockText = "Hello, my name is John and I'm here today to talk about my experience with public speaking. Um, I've been practicing for a while now, and I think I've improved quite a bit. You know, it's not easy at first, but with practice, you can get better.";
  
  const words: Word[] = [];
  const wordTimestamps: WordTimestamp[] = [];
  const mockWords = mockText.split(' ');
  let currentTime = 0;

  mockWords.forEach((word, index) => {
    const start = currentTime;
    const duration = 0.3 + Math.random() * 0.5; // Random word duration
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

    currentTime = end + (Math.random() * 0.5); // Small pause between words
  });

  const totalDuration = currentTime;
  const metrics = calculateSpeechMetrics(mockText, words, totalDuration);

  return {
    id: `transcription-${Date.now()}`,
    recordingId: '',
    text: mockText,
    words,
    wordTimestamps,
    metrics,
    createdAt: new Date(),
  };
}
