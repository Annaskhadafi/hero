import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  turbopack: {
    root: process.cwd(),
  },
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
    cpus: 1,
    workerThreads: false,
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
  async redirects() {
    return [
      {
        source: '/dashboard/activity%20hub/:path*',
        destination: '/dashboard/activity-hub/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/activity%20hub',
        destination: '/dashboard/activity-hub',
        permanent: false,
      },
      {
        source: '/dashboard/activity hub/:path*',
        destination: '/dashboard/activity-hub/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/activity hub',
        destination: '/dashboard/activity-hub',
        permanent: false,
      },
      {
        source: '/dashboard/activity_hub/:path*',
        destination: '/dashboard/activity-hub/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/activity_hub',
        destination: '/dashboard/activity-hub',
        permanent: false,
      },
      {
        source: '/dashboard/scheduling%20timesheet/:path*',
        destination: '/dashboard/scheduling-timesheet/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/scheduling%20timesheet',
        destination: '/dashboard/scheduling-timesheet',
        permanent: false,
      },
      {
        source: '/dashboard/scheduling timesheet/:path*',
        destination: '/dashboard/scheduling-timesheet/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/scheduling timesheet',
        destination: '/dashboard/scheduling-timesheet',
        permanent: false,
      },
      {
        source: '/dashboard/scheduling_timesheet/:path*',
        destination: '/dashboard/scheduling-timesheet/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/scheduling_timesheet',
        destination: '/dashboard/scheduling-timesheet',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin-kerja%20ptw/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin-kerja%20ptw',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin-kerja ptw/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin-kerja ptw',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin%20kerja%20ptw/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin%20kerja%20ptw',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin kerja ptw/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin kerja ptw',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin%20kerja/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin%20kerja',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin kerja/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin kerja',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin_kerja/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin_kerja',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin_kerja_ptw/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin_kerja_ptw',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin-kerja/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/izin-kerja',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
      {
        source: '/dashboard/hse/ptw/:path*',
        destination: '/dashboard/hse/izin-kerja-ptw/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/hse/ptw',
        destination: '/dashboard/hse/izin-kerja-ptw',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/dashboard/scheduling/timesheet/field_break',
        destination: '/dashboard/scheduling-timesheet/field-break',
      },
      {
        source: '/dashboard/scheduling/timesheet/field-break',
        destination: '/dashboard/scheduling-timesheet/field-break',
      },
      {
        source: '/dashboard/scheduling/timesheet/:path*',
        destination: '/dashboard/scheduling-timesheet/:path*',
      },
      {
        source: '/dashboard/scheduling/timesheet',
        destination: '/dashboard/scheduling-timesheet',
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
