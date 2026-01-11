# FFmpeg Service Deployment Guide

This guide walks you through deploying the FFmpeg service to your Vultr VM.

## Prerequisites

- Vultr VM with Ubuntu 22.04
- SSH access to the VM
- Root or sudo access

## Quick Start

### Option 1: Automated Deployment (from your local machine)

1. Make the deployment script executable:
```bash
chmod +x vm-ffmpeg-service/deploy.sh
```

2. Run the deployment script:
```bash
cd vm-ffmpeg-service
./deploy.sh
```

The script will:
- Install FFmpeg on the VM
- Install Node.js 18+
- Copy service files
- Install dependencies
- Set up PM2 for process management
- Configure firewall

### Option 2: Manual Deployment

1. **SSH into your VM:**
```bash
ssh root@45.77.218.210
```

2. **Install FFmpeg:**
```bash
apt update
apt install -y ffmpeg
ffmpeg -version
```

3. **Install Node.js 18+:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version
npm --version
```

4. **Create service directory:**
```bash
mkdir -p /opt/ffmpeg-service
cd /opt/ffmpeg-service
```

5. **Copy files to VM** (from your local machine):
```bash
# From your project root
scp -r vm-ffmpeg-service/* root@45.77.218.210:/opt/ffmpeg-service/
```

6. **Install dependencies:**
```bash
cd /opt/ffmpeg-service
npm install
```

7. **Configure environment:**
```bash
cp .env.example .env
nano .env  # Edit and set FFMPEG_API_KEY
```

Generate a secure API key:
```bash
openssl rand -base64 32
```

8. **Install PM2:**
```bash
npm install -g pm2
```

9. **Start the service:**
```bash
pm2 start server.js --name ffmpeg-service
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

10. **Configure firewall:**
```bash
ufw allow 3001/tcp
```

## Configuration

Edit `/opt/ffmpeg-service/.env`:

```env
PORT=3001
FFMPEG_API_KEY=your-generated-secret-key-here
ALLOWED_ORIGIN=*
NODE_ENV=production
```

**Important:** Set `FFMPEG_API_KEY` to a secure random string. Use the same key in your Next.js app's environment variables.

## Service Management

### Check service status:
```bash
pm2 status
```

### View logs:
```bash
pm2 logs ffmpeg-service
```

### Restart service:
```bash
pm2 restart ffmpeg-service
```

### Stop service:
```bash
pm2 stop ffmpeg-service
```

### Delete service:
```bash
pm2 delete ffmpeg-service
```

## Testing

### Health check:
```bash
curl http://45.77.218.210:3001/health
```

### Test audio extraction:
```bash
curl -X POST http://45.77.218.210:3001/api/extract-audio \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"videoUrl": "https://example.com/video.mp4"}'
```

### Test video duration:
```bash
curl -X POST http://45.77.218.210:3001/api/video-duration \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"videoUrl": "https://example.com/video.mp4"}'
```

## Next.js Configuration

After deploying the VM service, update your Next.js app:

1. **Add to `.env.local`:**
```env
FFMPEG_VM_URL=http://45.77.218.210:3001
FFMPEG_API_KEY=your-generated-secret-key-here
```

2. **Add to Vercel environment variables:**
   - Go to your Vercel project settings
   - Add `FFMPEG_VM_URL` and `FFMPEG_API_KEY`
   - Redeploy your app

## Security Considerations

1. **Use HTTPS in production:** Set up Nginx with Let's Encrypt SSL
2. **Restrict CORS:** Set `ALLOWED_ORIGIN` to your Vercel domain
3. **Use a strong API key:** Generate with `openssl rand -base64 32`
4. **Firewall:** Only open port 3001, consider restricting by IP if possible

## Troubleshooting

### Service won't start:
- Check logs: `pm2 logs ffmpeg-service`
- Verify FFmpeg is installed: `ffmpeg -version`
- Check Node.js version: `node --version` (should be 18+)

### Connection refused:
- Check firewall: `ufw status`
- Verify service is running: `pm2 status`
- Check if port is listening: `netstat -tlnp | grep 3001`

### API key errors:
- Verify API key matches in both VM `.env` and Next.js environment
- Check request headers include `X-API-Key`

### FFmpeg errors:
- Check disk space: `df -h`
- Verify video URL is accessible from VM
- Check FFmpeg version: `ffmpeg -version`

## Monitoring

Monitor service health:
```bash
pm2 monit
```

Check system resources:
```bash
htop
```

View recent logs:
```bash
pm2 logs ffmpeg-service --lines 100
```
