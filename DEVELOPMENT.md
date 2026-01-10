# Development Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `env.example` to `.env.local`
   - Add your MongoDB URI (required)
   - API keys are optional - the app works with mock data

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

### Mock Data
- **Presage**: Generates realistic mock biometric data
- **ElevenLabs**: Returns sample transcription if API key not set
- **Gemini**: Returns sample feedback if API key not set

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
  ├── presage/          # Biometric processing (mock)
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

### Testing Without API Keys
- All API integrations have mock data fallbacks
- Just leave API keys empty in `.env.local`
- Mock data is automatically generated

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
- Mock data should work without API keys

## Production Checklist

Before deploying:
- [ ] Enable password hashing (bcrypt)
- [ ] Enable middleware authentication
- [ ] Set up proper JWT token validation
- [ ] Configure AWS S3 for video storage
- [ ] Set up proper error logging
- [ ] Add rate limiting
- [ ] Configure CORS properly
