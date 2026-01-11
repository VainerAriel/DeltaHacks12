export enum RecordingStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  EXTRACTING_BIOMETRICS = 'extracting_biometrics',
  TRANSCRIBING = 'transcribing',
  ANALYZING = 'analyzing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export interface Recording {
  id: string;
  userId: string;
  videoUrl: string;
  duration: number; // in seconds
  status: RecordingStatus;
  createdAt: Date;
  thumbnailUrl?: string;
  sessionId?: string; // For grouping multiple recordings (e.g., interview sessions)
  questionText?: string; // The question this recording answers (for interview sessions)
  referenceDocumentId?: string; // Reference document (slides/script) ID
  referenceType?: 'slides' | 'script'; // Type of reference document
  minDuration?: number; // Minimum duration in seconds
  maxDuration?: number; // Maximum duration in seconds
  scenario?: string; // Scenario type (e.g., 'business-presentation', 'job-interview', 'elevator-pitch', 'casual-conversation')
}
