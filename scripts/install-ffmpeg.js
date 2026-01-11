const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if ffmpeg.exe exists
const ffmpegPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const ffmpegExists = fs.existsSync(ffmpegPath);

// If it doesn't exist and we're on Windows ARM64, force x64 build
if (!ffmpegExists && process.platform === 'win32' && process.arch === 'arm64') {
  console.log('[install-ffmpeg] Detected Windows ARM64, installing x64 FFmpeg binary...');
  process.env.npm_config_arch = 'x64';
  process.env.npm_config_platform = 'win32';
  
  try {
    const installScript = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'install.js');
    execSync(`node "${installScript}"`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', 'node_modules', 'ffmpeg-static'),
      env: process.env
    });
    console.log('[install-ffmpeg] FFmpeg binary installed successfully');
  } catch (error) {
    console.warn('[install-ffmpeg] Warning: FFmpeg installation may have failed, but continuing...');
  }
}
