/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // Disable static file serving for /uploads to use route handler
  async rewrites() {
    return [];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude ffmpeg-static and ffprobe-static from webpack bundling
      // They need to be resolved at runtime
      config.externals = config.externals || [];
      config.externals.push({
        'ffmpeg-static': 'commonjs ffmpeg-static',
        'ffprobe-static': 'commonjs ffprobe-static',
      });
    }
    return config;
  },
}

module.exports = nextConfig
