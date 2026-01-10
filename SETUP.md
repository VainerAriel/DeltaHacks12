# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `env.example` to `.env.local`
   - Fill in your API keys:
     - `MONGODB_URI`: MongoDB connection string
     - `ELEVENLABS_API_KEY`: For ElevenLabs transcription
     - `GOOGLE_GEMINI_API_KEY`: For AI analysis
     - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

3. **Set Up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGODB_URI` in `.env.local`
   - Collections will be created automatically on first use

4. **Create Upload Directory**
   ```bash
   mkdir -p public/uploads
   ```
   (This will be created automatically on first upload if using local storage)

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Register a new account or login

## API Keys Required

The application requires API keys for full functionality:
- **ElevenLabs API key**: Required for audio transcription
- **Google Gemini API key**: Required for AI analysis and feedback generation
- **Presage**: Uses placeholder data until SDK integration is complete

## Presage SDK Integration

To integrate the actual Presage SDK:

1. Review `lib/presage/processor.ts` for TODO comments
2. Install Presage SDK package (when available)
3. Update `processPresageData()` function
4. Map Presage response to `BiometricData` interface

Key integration points:
- Authentication/API key setup
- Video upload/processing
- Response format mapping
- Error handling

## Production Deployment

1. **Environment Variables**: Set all required env vars in your hosting platform
2. **MongoDB**: Use MongoDB Atlas or managed MongoDB service
3. **File Storage**: Configure AWS S3 or use local storage
4. **Build**: Run `npm run build` to create production build
5. **Start**: Run `npm start` to start production server

## Troubleshooting

### Video Upload Fails
- Check file size (max 100MB)
- Verify file format (MP4, WebM, MOV)
- Ensure `public/uploads` directory exists and is writable

### Processing Pipeline Fails
- Check API keys are set correctly
- Verify MongoDB connection
- Check browser console and server logs for errors

### Authentication Issues
- Clear browser cookies
- Verify `NEXTAUTH_SECRET` is set
- Check JWT token expiration
