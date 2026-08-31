import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'is3.cloudhost.id',
      },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['face-api.js'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/dashboard/scheduling/timesheet/:path*',
        destination: '/dashboard/scheduling-timesheet/:path*',
      },
      {
        source: '/dashboard/scheduling/timesheet',
        destination: '/dashboard/scheduling-timesheet/overview',
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent face-api.js from being bundled on server
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('face-api.js')
      }
    }
    // Handle canvas dependency that face-api.js may need
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      encoding: false,
      fs: false,
    }
    return config
  },
}

export default nextConfig
