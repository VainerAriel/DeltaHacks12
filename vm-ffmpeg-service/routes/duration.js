const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const { writeFile, unlink } = require('fs').promises;
const { join } = require('path');
const { tmpdir } = require('os');

/**
 * POST /api/video-duration
 * Gets the duration of a video from a URL
 * 
 * Request body:
 * {
 *   "videoUrl": "https://example.com/video.mp4"
 * }
 * 
 * Response:
 * {
 *   "duration": 120 (seconds)
 * }
 */
router.post('/', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  let videoPath = null;

  try {
    // Generate temporary file path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    videoPath = join(tmpdir(), `video-${timestamp}-${randomId}.mp4`);

    console.log(`[Duration] Downloading video from: ${videoUrl}`);
    
    // Download video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    await writeFile(videoPath, videoBuffer);
    console.log(`[Duration] Video downloaded, size: ${videoBuffer.length} bytes`);

    // Get duration using FFprobe
    console.log(`[Duration] Extracting duration...`);
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.error(`[Duration] FFprobe error:`, err);
          reject(new Error(`FFprobe failed: ${err.message}`));
          return;
        }

        const duration = metadata.format?.duration;
        if (duration === undefined || duration === null) {
          reject(new Error('Could not extract video duration'));
          return;
        }

        resolve(Math.round(duration));
      });
    });

    console.log(`[Duration] Video duration: ${duration} seconds`);

    // Clean up temporary file
    await unlink(videoPath).catch(() => {});

    res.json({
      duration
    });

  } catch (error) {
    console.error('[Duration] Error:', error);
    
    // Clean up on error
    if (videoPath) await unlink(videoPath).catch(() => {});

    res.status(500).json({
      error: 'Failed to get video duration',
      message: error.message
    });
  }
});

module.exports = router;
