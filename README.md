# Fluency Lab

> AI-powered communication coaching platform that helps users practice and improve their speaking skills through data-driven feedback.

Fluency Lab is a comprehensive web application designed to help users improve their communication skills through three main practice modes: **Job Interview**, **Elevator Pitch**, and **Presentation**. The platform records user video and audio, transcribes speech, analyzes communication metrics, and provides actionable feedback using advanced AI analysis.

## 🎯 Inspiration

It is often challenging to judge yourself when preparing for an important presentation, interview, or pitch. Practicing alone rarely provides objective or actionable feedback, especially on delivery, pacing, and confidence. Fluency Lab addresses this by providing clear, data-driven insights into speaking habits, helping users improve their communication skills with each practice session.

## ✨ Features

### Practice Modes

- **Job Interview Mode**: Practice answering 1-5 behavioral interview questions with detailed feedback on clarity, pacing, structure, and confidence
- **Elevator Pitch Mode**: Master concise introductions under strict time constraints (60 seconds) with constructive feedback
- **Presentation Mode**: Upload slides or scripts and receive feedback on delivery, engagement, and overall presentation effectiveness

### Core Capabilities

- **Video & Audio Recording**: Integrated webcam interface for seamless recording
- **Speech Transcription**: Automatic speech-to-text using ElevenLabs API
- **Communication Analytics**: Extract metrics including:
  - Speaking rate and pacing
  - Pause patterns
  - Filler word usage
  - Fluency indicators
- **AI-Powered Feedback**: Google Gemini analyzes transcripts and metrics to generate structured, actionable feedback on:
  - Tone
  - Fluency
  - Vocabulary
  - Pronunciation
  - Engagement
  - Confidence
- **Progress Tracking**: Dashboard with session history and performance trends
- **User Authentication**: Secure JWT-based authentication system

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization for progress tracking
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - Database for users, recordings, transcriptions, and feedback
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### AI & Processing
- **Google Gemini API** - AI-powered feedback generation and question generation
- **ElevenLabs API** - Speech-to-text transcription
- **FFmpeg** - Video/audio processing (via VM service for production)

### Infrastructure
- **AWS S3** - Video and document storage
- **Vercel** - Deployment platform (with VM service for FFmpeg operations)

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB database (local or MongoDB Atlas)
- AWS S3 bucket (for production/storage)
- API keys:
  - Google Gemini API key
  - ElevenLabs API key
- (Optional) VM with FFmpeg for production deployment

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DeltaHacks12
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/esl-coaching
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/esl-coaching

   # Authentication
   NEXTAUTH_SECRET=your-secret-key-here

   # AI Services
   GOOGLE_GEMINI_API_KEY=your-gemini-api-key
   ELEVENLABS_API_KEY=your-elevenlabs-api-key

   # AWS S3 (required for production)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET=your-bucket-name

   # FFmpeg VM Service (optional, for production)
   FFMPEG_VM_URL=http://your-vm-url:3001
   FFMPEG_API_KEY=your-ffmpeg-api-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
DeltaHacks12/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── feedback/       # Feedback generation
│   │   ├── gemini/         # Gemini AI integration
│   │   ├── process/        # Video processing
│   │   ├── recordings/     # Recording management
│   │   ├── transcriptions/ # Transcription endpoints
│   │   ├── upload/         # Video upload
│   │   ├── upload-reference/ # Document upload
│   │   ├── videos/         # Video serving
│   │   └── whisper/        # Transcription trigger
│   ├── dashboard/          # User dashboard
│   ├── feedback/           # Feedback viewing
│   ├── practice/           # Practice modes
│   │   ├── job-interview/
│   │   ├── elevator-pitch/
│   │   └── presentation/
│   └── page.tsx            # Landing page
├── components/              # React components
│   ├── feedback/           # Feedback display components
│   ├── recording/          # Video recording component
│   └── ui/                 # UI components
├── lib/                     # Utility libraries
│   ├── auth.ts             # Authentication utilities
│   ├── db/                 # Database connection
│   ├── gemini/             # Gemini AI integration
│   ├── elevenlabs/         # ElevenLabs transcription
│   ├── s3/                 # AWS S3 integration
│   └── vm-ffmpeg/          # FFmpeg VM service client
├── types/                   # TypeScript type definitions
├── public/                  # Static assets
└── vm-ffmpeg-service/       # FFmpeg microservice (for production)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_SECRET` | Secret key for JWT tokens | Yes |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | Yes |
| `AWS_REGION` | AWS region for S3 | Production |
| `AWS_ACCESS_KEY_ID` | AWS access key | Production |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Production |
| `AWS_S3_BUCKET` | S3 bucket name | Production |
| `FFMPEG_VM_URL` | FFmpeg service URL | Production |
| `FFMPEG_API_KEY` | FFmpeg service API key | Production |

### FFmpeg VM Service (Production)

For production deployments on Vercel, video processing is handled by a separate VM service to avoid timeout limitations. See `vm-ffmpeg-service/README.md` for setup instructions.

## 🎮 Usage

1. **Register/Login**: Create an account or log in to access the platform
2. **Choose Practice Mode**: Select from Job Interview, Elevator Pitch, or Presentation
3. **Record**: Use your webcam to record your practice session
4. **Review Feedback**: Get detailed AI-powered feedback on your performance
5. **Track Progress**: View your improvement over time on the dashboard

### Job Interview Mode
- Select number of questions (1-5)
- Answer behavioral interview questions
- Receive feedback on clarity, structure, and confidence

### Elevator Pitch Mode
- Practice a 60-second introduction
- Get feedback on conciseness and impact

### Presentation Mode
- Upload slides or script (optional)
- Deliver your presentation
- Receive comprehensive feedback on delivery and engagement

## 🏗️ Architecture

### Data Flow

1. **Recording**: User records video/audio via webcam
2. **Upload**: Video uploaded to S3 (or local storage in dev)
3. **Transcription**: Audio extracted and transcribed via ElevenLabs
4. **Analysis**: Transcription and metrics analyzed by Google Gemini
5. **Feedback**: Structured feedback generated and stored
6. **Display**: User views feedback with visualizations

### Database Collections

- `users` - User accounts and authentication
- `recordings` - Video recordings metadata
- `transcriptions` - Speech transcription data
- `feedbackReports` - AI-generated feedback reports
- `referenceDocuments` - Uploaded slides/scripts

## 🚢 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

**Note**: For production, you'll need to set up the FFmpeg VM service separately. See `vm-ffmpeg-service/DEPLOYMENT.md` for details.

### Local Development

The app can run locally with:
- Local MongoDB instance
- Local file storage (no S3 required)
- FFmpeg installed locally (via `ffmpeg-static` package)

## 🧪 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🎯 Challenges & Solutions

### Challenges Faced

- **Reliable Speech Metrics**: Extracting meaningful fluency metrics from speech data in real-time
- **Balanced Feedback**: Designing prompts that provide specific, encouraging feedback without being overly generic or critical
- **Feature Scope**: Balancing feature completeness with polish within hackathon timeframe
- **Video Processing**: Handling large video files and processing on serverless platforms

### Solutions Implemented

- **Robust Transcription Pipeline**: Using ElevenLabs for accurate transcription with word-level timestamps
- **Careful Prompt Engineering**: Structured prompts that generate balanced, actionable feedback
- **Modular Architecture**: Clean separation of concerns for maintainability
- **VM Service**: Separate FFmpeg service for production video processing

## 🏆 Accomplishments

- ✅ Complete end-to-end system with immediate, actionable feedback
- ✅ Multiple practice modes (Interview, Elevator Pitch, Presentation)
- ✅ Data-driven insights from raw speech data
- ✅ Strong MVP delivered within hackathon timeline
- ✅ Polished user interface with progress tracking

## 📚 What We Learned

- Value of combining speech analytics with LLMs for skill development
- Building reliable speech-processing pipelines
- Designing structured AI outputs for consistent feedback
- Creating user-focused feedback systems under time constraints
- Serverless architecture considerations for media processing

## 🔮 What's Next

Future enhancements planned:

- **Real-time Feedback**: Live feedback during practice sessions
- **Progress Tracking**: Long-term progress analytics and trends
- **Additional Scenarios**: Team meetings, impromptu speaking practice
- **Enhanced Scoring**: Refined fluency scoring algorithms
- **Visual Feedback**: Timeline visualizations for confidence/engagement
- **Personalization**: Improved personalization and adaptive learning

## 📝 License

This project was created for DeltaHacks 12 hackathon.

## 👥 Contributors

Built with ❤️ by the Fluency Lab team.

---

For questions or issues, please open an issue on the repository.
