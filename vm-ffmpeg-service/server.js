require('dotenv').config();
const express = require('express');
const cors = require('cors');
const audioRoutes = require('./routes/audio');
const durationRoutes = require('./routes/duration');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', // Configure in production
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.FFMPEG_API_KEY;

  if (!expectedKey) {
    console.warn('[Auth] FFMPEG_API_KEY not set - allowing all requests');
    return next();
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ffmpeg-service', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/extract-audio', authenticateApiKey, audioRoutes);
app.use('/api/video-duration', authenticateApiKey, durationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FFmpeg Service] Server running on port ${PORT}`);
  console.log(`[FFmpeg Service] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[FFmpeg Service] API Key required: ${!!process.env.FFMPEG_API_KEY}`);
});
