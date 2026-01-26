/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['cron-parser', 'bullmq', 'ioredis'],
  },
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure cron-parser and bullmq work in API routes
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize packages that need to run in Node.js environment
      config.externals = [
        ...(config.externals || []),
        'cron-parser',
        'bullmq',
        'ioredis',
      ]
    }
    return config
  },
}

module.exports = nextConfig