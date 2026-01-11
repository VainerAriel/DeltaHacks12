export interface SectorScore {
  score: number; // 0-100
  feedback: string;
}

export interface FeedbackReport {
  id: string;
  recordingId: string;
  overallScore: number; // Calculated as average of 6 sector scores
  sectorScores?: {
    tone: SectorScore;
    fluency: SectorScore;
    vocabulary: SectorScore;
    pronunciation: SectorScore;
    engagement: SectorScore;
    confidence: SectorScore;
  };
  confidenceData?: Array<{ timestamp: number; confidence: number }>;
  engagementData?: Array<{ timestamp: number; engagement: number }>;
  // Keep existing fields for backward compatibility
  biometricInsights: {
    heartRateAnalysis: string;
    breathingPattern: string;
    facialExpressionNotes: string;
  };
  speechInsights: {
    wpm: number;
    fillerWordsCount: number;
    pauseAnalysis: string;
    clarityScore: number;
    pronunciationNotes: string;
  };
  recommendations: Recommendation[];
  createdAt: Date;
  referenceAdherence?: {
    score: number;
    analysis: string;
  };
  durationFeedback?: {
    actual: number;
    target: {
      min?: number;
      max?: number;
    };
    feedback: string;
  };
}

export interface Recommendation {
  category: 'physical' | 'speech' | 'content' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}
