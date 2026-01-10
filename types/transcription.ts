export interface Transcription {
  id: string;
  recordingId: string;
  text: string;
  words: Word[];
  wordTimestamps: WordTimestamp[];
  metrics: SpeechMetrics;
  createdAt: Date;
}

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface WordTimestamp {
  word: string;
  timestamp: number;
}

export interface SpeechMetrics {
  wpm: number; // words per minute
  fillerWordsCount: number;
  longestPause: number; // in seconds
  averagePause: number; // in seconds
  totalPauses: number;
}
