# ESL Speech Coaching Platform

An AI-powered speech coaching platform for ESL learners built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🎥 **Video Recording**: Record practice sessions using webcam or upload pre-recorded videos
- 📊 **Biometric Analysis**: Track heart rate, breathing patterns, and facial expressions (Presage integration)
- 🎤 **Speech Transcription**: Automatic transcription using ElevenLabs Speech-to-Text
- 🤖 **AI Feedback**: Comprehensive analysis using Google Gemini AI
- 📈 **Progress Tracking**: View your improvement over time with detailed analytics
- 💬 **Practice Scenarios**: Pre-defined scenarios for job interviews, presentations, and more

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: MongoDB
- **APIs**: ElevenLabs Speech-to-Text, Google Gemini (required)
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance) - **Required**
- ElevenLabs API key (required)
- Google Gemini API key (required)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd DeltaHacks12
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:
- `MONGODB_URI`: Your MongoDB connection string
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `GOOGLE_GEMINI_API_KEY`: Your Google Gemini API key
- `NEXTAUTH_SECRET`: A random secret string (generate with `openssl rand -base64 32`)
- `FFMPEG_VM_URL`: (Optional) URL of FFmpeg service on VM (e.g., `http://45.77.218.210:3001`)
- `FFMPEG_API_KEY`: (Optional) API key for FFmpeg VM service (must match VM service config)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── (auth)/          # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── api/             # API routes
│   │   ├── upload/      # Video upload endpoint
│   │   ├── presage/     # Biometric processing
│   │   ├── whisper/     # Transcription (ElevenLabs)
│   │   ├── gemini/      # AI analysis
│   │   └── process/     # Full pipeline
│   ├── dashboard/       # User dashboard
│   ├── practice/        # Practice recording page
│   └── feedback/[id]/   # Feedback report page
├── components/
│   ├── recording/       # VideoRecorder component
│   ├── feedback/        # BiometricChart, SpeechAnalysis
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── db/              # MongoDB connection
│   ├── presage/         # Presage SDK integration (TODO)
│   ├── elevenlabs/      # ElevenLabs transcription
│   └── gemini/          # Gemini analysis
└── types/               # TypeScript type definitions
```

## Processing Pipeline

1. **Upload**: Video is uploaded and stored (S3 or local)
2. **Extract Biometrics**: Presage SDK processes video for biometric data
3. **Transcribe**: ElevenLabs Speech-to-Text transcribes the audio
4. **Analyze**: Google Gemini generates comprehensive feedback
5. **Display**: User views detailed feedback report

## Presage Integration

The Presage SDK integration is currently using mock data. To integrate the actual Presage SDK:

1. Review the TODO comments in `lib/presage/processor.ts`
2. Install the Presage SDK package
3. Update `processPresageData()` function with actual SDK calls
4. Map Presage response format to our `BiometricData` interface

Key questions to clarify with Presage team:
- SDK API structure and authentication
- Video format requirements
- Response data format
- Processing time estimates
- Rate limits

## API Routes

- `POST /api/upload` - Upload video file
- `POST /api/presage` - Process biometric data
- `POST /api/whisper` - Transcribe audio (using ElevenLabs)
- `POST /api/gemini` - Generate feedback
- `POST /api/process` - Run full processing pipeline
- `GET /api/recordings` - Get user's recordings
- `GET /api/feedback/[id]` - Get feedback report

## Database Schemas

### Users
```typescript
{
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  preferences: {
    language?: string;
    notifications?: boolean;
    theme?: 'light' | 'dark' | 'system';
  };
}
```

### Recordings
```typescript
{
  id: string;
  userId: string;
  videoUrl: string;
  duration: number;
  status: RecordingStatus;
  createdAt: Date;
}
```

### BiometricData
```typescript
{
  id: string;
  recordingId: string;
  heartRate: number[];
  breathing: number[];
  facialExpressions: FacialExpression[];
  timestamps: number[];
}
```

### Transcriptions
```typescript
{
  id: string;
  recordingId: string;
  text: string;
  words: Word[];
  wordTimestamps: WordTimestamp[];
  metrics: SpeechMetrics;
}
```

### FeedbackReports
```typescript
{
  id: string;
  recordingId: string;
  overallScore: number;
  biometricInsights: {...};
  speechInsights: {...};
  recommendations: Recommendation[];
}
```

## Development Notes

- All API routes include error handling with try-catch blocks
- Presage integration uses placeholder data until SDK is integrated
- Processing status is tracked through the pipeline
- TypeScript strict mode is enabled
- Dark mode support with system preference detection

## Future Enhancements

- [ ] Real-time processing status updates with WebSockets
- [ ] Group practice sessions
- [ ] Advanced visualizations
- [ ] Mobile app optimization
- [ ] Social features and community
- [ ] Custom practice scenarios
- [ ] Export reports as PDF

## License

MIT
