import { Transcription, SpeechMetrics, Word, WordTimestamp } from '@/types/transcription';

if (!process.env.ELEVENLABS_API_KEY) {
  console.warn('ELEVENLABS_API_KEY not set. Transcription will use mock data.');
}

/**
 * Transcribe audio from video using ElevenLabs Speech-to-Text API
 * @param videoUrl - URL of the video file to transcribe
 * @returns Transcription with text, words, timestamps, and metrics
 */
export async function transcribeAudio(videoUrl: string): Promise<Transcription> {
  if (!process.env.ELEVENLABS_API_KEY) {
    // Return mock data if API key is not set
    return generateMockTranscription(videoUrl);
  }

  try {
    // Download video file and extract audio
    let audioBlob: Blob;
    
    if (videoUrl.startsWith('http')) {
      // Remote URL - fetch the file
      const response = await fetch(videoUrl);
      audioBlob = await response.blob();
    } else {
      // Local file path - read from filesystem
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      
      // Convert relative path to absolute
      const filePath = videoUrl.startsWith('/')
        ? join(process.cwd(), 'public', videoUrl)
        : join(process.cwd(), videoUrl);
      
      const fileBuffer = await readFile(filePath);
      audioBlob = new Blob([fileBuffer]);
    }

    // TODO: Update this based on actual ElevenLabs Speech-to-Text API
    // ElevenLabs may have different endpoints/format - check their documentation
    // For now, using a generic structure that can be adjusted
    
    // Convert audio blob to format expected by ElevenLabs
    // Note: ElevenLabs API format may require FormData or different structure
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    
    // Call ElevenLabs Speech-to-Text API
    // Update endpoint and format based on actual ElevenLabs API documentation
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        // Remove Content-Type header when using FormData - browser sets it automatically
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const result = await response.json();

    // Process ElevenLabs response
    // Note: ElevenLabs response format may vary - adjust based on actual API response
    const text = result.text || '';
    const words: Word[] = [];
    const wordTimestamps: WordTimestamp[] = [];

    // If ElevenLabs provides word-level timestamps
    if (result.words && Array.isArray(result.words)) {
      result.words.forEach((word: any) => {
        words.push({
          word: word.word || word.text || '',
          start: word.start || 0,
          end: word.end || 0,
          confidence: word.confidence || 0.9,
        });
        wordTimestamps.push({
          word: word.word || word.text || '',
          timestamp: word.start || 0,
        });
      });
    } else {
      // Fallback: generate word timestamps from text
      const textWords = text.split(/\s+/);
      let currentTime = 0;
      textWords.forEach((word) => {
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
  } catch (error) {
    console.error('Error transcribing audio with ElevenLabs:', error);
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
