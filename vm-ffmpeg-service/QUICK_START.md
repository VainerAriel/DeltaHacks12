# Quick Start Guide

## 1. On Your VM (SSH into it)

```bash
ssh root@45.77.218.210
```

## 2. Install Prerequisites

```bash
# Install FFmpeg
apt update && apt install -y ffmpeg

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2
```

## 3. Copy Files to VM

From your local machine:
```bash
scp -r vm-ffmpeg-service/* root@45.77.218.210:/opt/ffmpeg-service/
```

## 4. On VM: Install and Configure

```bash
cd /opt/ffmpeg-service
npm install

# Create .env file
cat > .env << EOF
PORT=3001
FFMPEG_API_KEY=$(openssl rand -base64 32)
ALLOWED_ORIGIN=*
NODE_ENV=production
EOF

# Start service
pm2 start server.js --name ffmpeg-service
pm2 save
pm2 startup  # Follow the instructions shown

# Open firewall
ufw allow 3001/tcp
```

## 5. Get Your API Key

```bash
cat /opt/ffmpeg-service/.env | grep FFMPEG_API_KEY
```

Copy this value - you'll need it for your Next.js app.

## 6. Test the Service

```bash
curl http://45.77.218.210:3001/health
```

Should return: `{"status":"ok","service":"ffmpeg-service",...}`

## 7. Configure Next.js

Add to your `.env.local`:
```env
FFMPEG_VM_URL=http://45.77.218.210:3001
FFMPEG_API_KEY=<paste-the-key-from-step-5>
```

## 8. Deploy to Vercel

Add the same environment variables in Vercel project settings, then redeploy.

## Done! 🎉

Your FFmpeg processing will now run on the VM, avoiding Vercel timeouts.
