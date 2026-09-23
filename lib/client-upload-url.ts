/**
 * Pure client-safe upload URL resolution helper.
 * Free of Node.js dependencies (fs, crypto, server-env) so it can be safely imported
 * inside Next.js 'use client' components without build errors.
 */
export function resolveClientUploadUrl(url: string | null | undefined): string {
  if (!url) return "";
  let trimmed = url.trim();

  // Strip localhost / 127.0.0.1 domain prefix if present
  trimmed = trimmed.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, "");

  // 1. Already relative /api/uploads/
  if (trimmed.startsWith("/api/uploads/")) {
    return trimmed;
  }

  // 2. Relative /uploads/
  if (trimmed.startsWith("/uploads/")) {
    return `/api${trimmed}`;
  }
  if (trimmed.startsWith("uploads/")) {
    return `/api/${trimmed}`;
  }

  // 3. Extract known S3 key prefix pattern from direct S3 URLs
  const match = trimmed.match(
    /(?:upload|curhat|attendance-photos|activity-photos|profile-photos|lms-materials|lms-covers|chitralearning|mcu-wellness-results)\/[a-zA-Z0-9\-._~%!$&'()*+,;=:@]+/i
  );
  if (match) {
    return `/api/uploads/${match[0]}`;
  }

  return trimmed;
}
