# FFmpeg Service

Lightweight Express API service for FFmpeg operations (audio extraction and video duration).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Edit `.env` and set:
- `FFMPEG_API_KEY`: A secure random key (generate with `openssl rand -base64 32`)
- `ALLOWED_ORIGIN`: Your Vercel domain (or `*` for development)

4. Start the service:
```bash
npm start
```

## API Endpoints

### POST /api/extract-audio
Extracts audio from a video URL.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4"
}
```

**Response:**
```json
{
  "audioBase64": "base64-encoded-wav-data",
  "audioSize": 12345
}
```

### POST /api/video-duration
Gets video duration.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4"
}
```

**Response:**
```json
{
  "duration": 120
}
```

### GET /health
Health check endpoint.

## Authentication

All API endpoints require an `X-API-Key` header:
```
X-API-Key: your-secret-api-key-here
```

Or use `Authorization` header:
```
Authorization: Bearer your-secret-api-key-here
```

## Deployment

### Using PM2 (Recommended)

```bash
npm install -g pm2
pm2 start server.js --name ffmpeg-service
pm2 save
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/ffmpeg-service.service`:
```ini
[Unit]
Description=FFmpeg Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ffmpeg-service
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
systemctl daemon-reload
systemctl enable ffmpeg-service
systemctl start ffmpeg-service
```

## Firewall

Open port 3001:
```bash
ufw allow 3001/tcp
```
