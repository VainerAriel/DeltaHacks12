const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const { writeFile, unlink, readFile } = require('fs').promises;
const { join } = require('path');
const { tmpdir } = require('os');

/**
 * POST /api/extract-audio
 * Extracts audio from a video URL and returns it as base64-encoded WAV
 * 
 * Request body:
 * {
 *   "videoUrl": "https://example.com/video.mp4"
 * }
 * 
 * Response:
 * {
 *   "audioBase64": "base64-encoded-wav-data",
 *   "audioSize": 12345
 * }
 */
router.post('/', async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  let videoPath = null;
  let audioPath = null;

  try {
    // Generate temporary file paths
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    videoPath = join(tmpdir(), `video-${timestamp}-${randomId}.mp4`);
    audioPath = join(tmpdir(), `audio-${timestamp}-${randomId}.wav`);

    console.log(`[Audio] Downloading video from: ${videoUrl}`);
    
    // Download video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    await writeFile(videoPath, videoBuffer);
    console.log(`[Audio] Video downloaded, size: ${videoBuffer.length} bytes`);

    // Extract audio using FFmpeg
    console.log(`[Audio] Extracting audio...`);
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec('pcm_s16le') // WAV format
        .audioFrequency(16000) // 16kHz sample rate (good for speech)
        .audioChannels(1) // Mono
        .on('end', () => {
          console.log(`[Audio] Audio extraction completed`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[Audio] FFmpeg error:`, err);
          reject(new Error(`FFmpeg processing failed: ${err.message}`));
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Audio] Processing: ${Math.round(progress.percent)}%`);
          }
        })
        .run();
    });

    // Read audio file and convert to base64
    const audioBuffer = await readFile(audioPath);
    const audioBase64 = audioBuffer.toString('base64');

    console.log(`[Audio] Audio extracted, size: ${audioBuffer.length} bytes`);

    // Clean up temporary files
    await unlink(videoPath).catch(() => {});
    await unlink(audioPath).catch(() => {});

    res.json({
      audioBase64,
      audioSize: audioBuffer.length
    });

  } catch (error) {
    console.error('[Audio] Error:', error);
    
    // Clean up on error
    if (videoPath) await unlink(videoPath).catch(() => {});
    if (audioPath) await unlink(audioPath).catch(() => {});

    res.status(500).json({
      error: 'Failed to extract audio',
      message: error.message
    });
  }
});

module.exports = router;
