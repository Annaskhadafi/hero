import { resolveUploadUrl } from '@/lib/resolve-upload-url'

/**
 * Pure client-safe photo URL helper.
 * Converts Apple HEIC / HEIF image URLs to high-performance JPEG display URLs
 * through the server-side conversion & caching API.
 * Standard web formats (JPEG, PNG, WebP) are resolved to persistent proxy URLs directly.
 */
export function formatPhotoDisplayUrl(url?: string | null, width?: number): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Always resolve the upload URL first (cleans expired tokens, standardizes S3 paths to /api/uploads/...)
  const resolved = resolveUploadUrl(trimmed)
  if (!resolved) return ''

  // Check if file is HEIC/HEIF
  const cleanPath = resolved.split('?')[0].toLowerCase()
  const isHeic = cleanPath.endsWith('.heic') || cleanPath.endsWith('.heif')

  if (isHeic) {
    const params = new URLSearchParams()
    params.set('url', resolved)
    if (width && width > 0) {
      params.set('w', width.toString())
    }
    return `/api/activity-photos/view?${params.toString()}`
  }

  return resolved
}

