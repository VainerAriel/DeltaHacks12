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
  // Optimize compilation performance
  swcMinify: true, // Use SWC for minification (faster than Terser)
  compiler: {
    // Remove console logs in production (optional, helps with bundle size)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Optimize webpack configuration
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Exclude ffmpeg-static and ffprobe-static from webpack bundling
      // They need to be resolved at runtime
      config.externals = config.externals || [];
      config.externals.push({
        'ffmpeg-static': 'commonjs ffmpeg-static',
        'ffprobe-static': 'commonjs ffprobe-static',
        'pdf-parse': 'commonjs pdf-parse',
      });
    }
    
    // Optimize for development
    if (dev) {
      // Reduce filesystem watching overhead
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
        ignored: /node_modules/, // Ignore node_modules
      };
      
      // Optimize module resolution
      config.resolve = {
        ...config.resolve,
        // Cache module resolution
        cache: true,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
