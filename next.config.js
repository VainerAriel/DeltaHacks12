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
}

module.exports = nextConfig
