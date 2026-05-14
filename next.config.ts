import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['face-api.js'],
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
    }
    return config
  },
}

export default nextConfig
