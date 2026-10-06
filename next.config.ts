import type { NextConfig } from 'next'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://is3.cloudhost.id https://*.ytimg.com https://i.ytimg.com https://*.googleusercontent.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.openstreetmap.org https://*.chitraparatama.com;
  media-src 'self' blob: data: https://is3.cloudhost.id https://*.googlevideo.com https://*.youtube.com https://*.chitraparatama.com;
  connect-src 'self' https://is3.cloudhost.id https://vision.chitraparatama.com https://*.chitraparatama.com https://*.youtube.com https://*.googlevideo.com https://*.google.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org wss: ws:;
  frame-src 'self' blob: data: https://*.youtube.com https://*.youtube-nocookie.com https://youtube.com https://*.google.com https://*.googlevideo.com https://*.vimeo.com https://player.vimeo.com https://vimeo.com https://docs.google.com https://drive.google.com https://view.officeapps.live.com https://*.chitraparatama.com;
  child-src 'self' blob: https://*.youtube.com https://*.youtube-nocookie.com https://*.google.com https://*.googlevideo.com https://*.vimeo.com https://player.vimeo.com https://docs.google.com https://drive.google.com;
  worker-src 'self' blob:;
  frame-ancestors 'self' https://*.chitraparatama.com https://*.chitraparatama.co.id;
  form-action 'self';
  base-uri 'self';
  object-src 'self' blob: data:;
`.replace(/\s{2,}/g, ' ').trim()

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/esbuild',
      'node_modules/terser',
      '.git/**/*',
      'docs/**/*',
      'documentation/**/*',
      'scratch/**/*',
      'tests/**/*',
      'backups/**/*',
    ],
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
      // Increase timeout: DAR submit involves photo uploads + DB writes + email — default 5s is too short on mobile
      // Next.js 15 uses `serverActions.timeoutSeconds` — ponytail: upgrade when stable
    },
    cpus: 3,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
        ],
      },
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
