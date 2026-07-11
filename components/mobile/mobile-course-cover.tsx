'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'

/**
 * Mobile cover image thumbnail — resolves S3/upload URLs client-side,
 * falls back to gradient placeholder on error.
 */
export function MobileCourseCover({
  src,
  alt,
  className = '',
  fallbackClassName = '',
}: {
  src?: string | null
  alt: string
  className?: string
  fallbackClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  // Resolve S3 / upload URL patterns to /api/uploads/...
  function resolveUrl(url: string | null | undefined): string {
    if (!url) return ''
    const trimmed = url.trim()
    if (
      trimmed.startsWith('/api/uploads/') ||
      trimmed.startsWith('/uploads/') ||
      trimmed.startsWith('http://localhost')
    ) {
      return trimmed
    }
    // S3 key pattern: extract key after /upload/ or /attendance-photos/ etc.
    const s3Match = trimmed.match(/\/(upload|attendance-photos|profile-photos|curhat)\/([a-zA-Z0-9\-._~%!$&'()*+,;=:@/]+)/)
    if (s3Match) {
      return `/api/uploads/${s3Match[1]}/${s3Match[2]}`
    }
    return trimmed
  }

  const resolvedSrc = resolveUrl(src)

  if (!resolvedSrc || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#003461] to-[#0ea5b0] ${fallbackClassName || className}`}>
        <BookOpen className="size-1/3 text-white/40" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
