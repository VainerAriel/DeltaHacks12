export interface FeedbackReport {
  id: string;
  recordingId: string;
  overallScore: number; // 1-100
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
}

export interface Recommendation {
  category: 'physical' | 'speech' | 'content' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}
