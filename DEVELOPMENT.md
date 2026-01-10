# Development Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `env.example` to `.env.local`
   - Add your MongoDB URI (required)
   - Add your API keys (ElevenLabs and Gemini are required)

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   - Navigate to http://localhost:3000
   - Register a new account or login
   - Start practicing!

## Development Features

### Simplified Authentication
- Passwords are stored as plain text for easy development
- No password hashing required
- Middleware is disabled - all routes are accessible

### Presage Integration
- **Presage**: Uses placeholder data ("MATTHEW IS DOING IT" / "67") until SDK integration is complete
- **ElevenLabs**: Requires API key for transcription
- **Gemini**: Requires API key for analysis

### Database
- Collections are created automatically on first use
- No migrations needed
- Easy to reset - just clear MongoDB collections

## Project Structure

```
app/
  ├── (auth)/          # Login/Register pages
  ├── api/              # API routes
  ├── dashboard/        # User dashboard
  ├── practice/         # Recording interface
  └── feedback/[id]/    # Feedback reports

components/
  ├── recording/        # VideoRecorder component
  ├── feedback/         # Chart and analysis components
  └── ui/               # shadcn/ui components

lib/
  ├── db/               # MongoDB connection
  ├── presage/          # Biometric processing (placeholder data)
  ├── elevenlabs/       # Transcription
  └── gemini/           # AI analysis

types/                   # TypeScript definitions
```

## Common Tasks

### Adding a New API Route
1. Create file in `app/api/[route-name]/route.ts`
2. Export `GET`, `POST`, etc. functions
3. Use `getDb()` for database access (handles errors)

### Adding a New Component
1. Create file in `components/`
2. Use shadcn/ui components from `components/ui/`
3. Import types from `types/`

### API Keys Required
- ElevenLabs and Gemini API keys are required for full functionality
- Presage uses placeholder data until SDK integration is complete

## Troubleshooting

### Database Connection Issues
- Check `.env.local` has `MONGODB_URI` set
- Verify MongoDB is running (if local)
- Check MongoDB Atlas IP whitelist (if cloud)

### Video Upload Fails
- Ensure `public/uploads` directory exists
- Check file size (max 100MB)
- Verify file format (MP4, WebM, MOV)

### Processing Pipeline Fails
- Check browser console for errors
- Verify API keys if using real APIs
- Ensure API keys are properly configured in `.env.local`

## Production Checklist

Before deploying:
- [ ] Enable password hashing (bcrypt)
- [ ] Enable middleware authentication
- [ ] Set up proper JWT token validation
- [ ] Configure AWS S3 for video storage
- [ ] Set up proper error logging
- [ ] Add rate limiting
- [ ] Configure CORS properly
