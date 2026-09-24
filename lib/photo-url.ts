/**
 * Pure client-safe photo URL helper.
 * Converts Apple HEIC / HEIF image URLs to high-performance JPEG display URLs
 * through the server-side conversion & caching API.
 */

export function formatPhotoDisplayUrl(url?: string | null, width?: number): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Check if file is HEIC/HEIF
  const cleanPath = trimmed.split('?')[0].toLowerCase()
  const isHeic = cleanPath.endsWith('.heic') || cleanPath.endsWith('.heif')

  if (isHeic) {
    const params = new URLSearchParams()
    params.set('url', trimmed)
    if (width && width > 0) {
      params.set('w', width.toString())
    }
    return `/api/activity-photos/view?${params.toString()}`
  }

  // If width is specified and it's a known uploaded photo, we can also route it through view for optimization
  if (width && width > 0 && (trimmed.includes('activity-photos') || trimmed.includes('/upload/'))) {
    const params = new URLSearchParams()
    params.set('url', trimmed)
    params.set('w', width.toString())
    return `/api/activity-photos/view?${params.toString()}`
  }

  return trimmed
}
