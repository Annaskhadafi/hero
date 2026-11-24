import { getAppBaseUrl } from './resolve-upload-url'

/**
 * Client-safe upload URL resolver.
 * Free of Node.js dependencies (fs, crypto, server-env) so it can be safely imported
 * inside Next.js 'use client' components without build errors.
 */
export function resolveClientUploadUrl(
  url: string | null | undefined,
  options?: { absolute?: boolean }
): string {
  if (!url) return ''
  let trimmed = url.trim()

  // 0. Base64 data URLs and blob URLs must be preserved untouched
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }

  // Strip localhost / 127.0.0.1 domain prefix if present
  trimmed = trimmed.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, '')

  let relative = ''

  // 1. Already relative /api/uploads/
  if (trimmed.startsWith('/api/uploads/')) {
    relative = trimmed
  } else if (trimmed.startsWith('/uploads/')) {
    // 2. Relative /uploads/
    relative = `/api${trimmed}`
  } else if (trimmed.startsWith('uploads/')) {
    relative = `/api/${trimmed}`
  } else {
    // 3. Extract known S3 key prefix pattern from direct S3 URLs
    const cleanUrl = trimmed.split('?')[0].split('#')[0]
    const match = cleanUrl.match(
      /(?:upload|uploads|curhat|curhat-attachments|attendance-photos|activity-photos|profile-photos|lms-materials|lms-covers|chitralearning|mcu-wellness-results|mcu-referral-letters|mcu-results|offering-letters|sop-win-requests|sop-win|emergency-reports|safety|face-attendance|face-attendance-v2|contract-review-attachment|public-career-cv|cer|cer-bast|cer-attachments|hse-osm|reward-store|training-requests|marital-status|ga-house-rental|hrga-kerjasama|asset-transfer|asset-borrow|asset-disposal|asset-disposals|rfr|road-hazard|twibbon-templates|troubleshooting-attachments|troubleshooting|service-desk|business-cards)\/[^\r\n]+/i
    )
    if (match) {
      relative = `/api/uploads/${match[0]}`
    } else {
      relative = cleanUrl
    }
  }

  if (relative.startsWith('/')) {
    if (options?.absolute) {
      return `${getAppBaseUrl()}${relative}`
    }
    if (
      typeof window !== 'undefined' &&
      (window.location.origin.includes('capacitor://') ||
        window.location.origin.startsWith('file:') ||
        window.location.origin.startsWith('content:'))
    ) {
      return `${getAppBaseUrl()}${relative}`
    }
  }

  return relative
}
