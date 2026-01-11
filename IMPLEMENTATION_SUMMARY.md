# FFmpeg VM Service Implementation Summary

## What Was Implemented

This implementation moves FFmpeg processing from Vercel (which has timeout limits) to your Vultr VM, eliminating timeout issues during video processing.

## Files Created

### VM Service (vm-ffmpeg-service/)
- `server.js` - Express server with authentication middleware
- `package.json` - Dependencies and scripts
- `routes/audio.js` - Audio extraction endpoint
- `routes/duration.js` - Video duration endpoint
- `README.md` - Service documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `QUICK_START.md` - Quick reference guide
- `deploy.sh` - Automated deployment script
- `setup-vm.sh` - Manual setup script
- `.gitignore` - Git ignore rules

### Next.js Integration
- `lib/vm-ffmpeg/client.ts` - VM service client with fallback logic
- Updated `lib/audio-extract.ts` - Uses VM service if configured, falls back to local
- Updated `lib/video-duration.ts` - Uses VM service if configured, falls back to local
- Updated `lib/elevenlabs/transcribe.ts` - Passes videoUrl to enable VM service
- Updated `README.md` - Added environment variable documentation

## How It Works

1. **Hybrid Architecture**: Next.js app stays on Vercel, FFmpeg processing runs on VM
2. **Automatic Fallback**: If VM service is not configured, falls back to local FFmpeg
3. **Seamless Integration**: No code changes needed in API routes - they automatically use VM if configured

## Next Steps

### 1. Deploy VM Service

Follow `vm-ffmpeg-service/QUICK_START.md` or `vm-ffmpeg-service/DEPLOYMENT.md`

Key steps:
- SSH into VM: `ssh root@45.77.218.210`
- Install FFmpeg, Node.js, PM2
- Copy service files to `/opt/ffmpeg-service`
- Configure `.env` with API key
- Start with PM2

### 2. Configure Next.js

Add to `.env.local`:
```env
FFMPEG_VM_URL=http://45.77.218.210:3001
FFMPEG_API_KEY=<same-key-as-vm-service>
```

### 3. Deploy to Vercel

Add environment variables in Vercel project settings:
- `FFMPEG_VM_URL`
- `FFMPEG_API_KEY`

Then redeploy.

## Testing

1. **Test VM service directly:**
```bash
curl http://45.77.218.210:3001/health
```

2. **Test from Next.js app:**
- Upload a video
- Check that processing completes without timeouts
- Verify audio extraction and duration work

## Rollback

If you need to rollback:
1. Remove `FFMPEG_VM_URL` from environment variables
2. App automatically falls back to local FFmpeg
3. No code changes needed

## Architecture Flow

```
User uploads video
    ↓
Next.js API route (/api/whisper)
    ↓
lib/elevenlabs/transcribe.ts
    ↓
lib/audio-extract.ts
    ↓
Checks: FFMPEG_VM_URL configured?
    ├─ Yes → lib/vm-ffmpeg/client.ts → HTTP request to VM
    │                                    ↓
    │                              VM processes with FFmpeg
    │                                    ↓
    │                              Returns base64 audio
    │                                    ↓
    └─ No → Local FFmpeg processing (fallback)
```

## Benefits

✅ **No Vercel timeouts** - Processing runs on VM with no time limits
✅ **Zero downtime rollback** - Just remove env var
✅ **Automatic fallback** - Works locally without VM
✅ **Secure** - API key authentication
✅ **Scalable** - Can handle multiple concurrent requests

## Security Notes

- API key authentication required
- CORS can be restricted to your Vercel domain
- Consider adding HTTPS (Nginx + Let's Encrypt)
- Firewall only opens necessary port (3001)

## Support

If you encounter issues:
1. Check VM service logs: `pm2 logs ffmpeg-service`
2. Verify API key matches in both places
3. Test VM service directly with curl
4. Check firewall rules: `ufw status`
