export function resolveClientUploadUrl(url: string | null | undefined): string {
  if (!url) return "";
  let trimmed = url.trim();

  // Strip localhost / 127.0.0.1 domain prefix if present
  trimmed = trimmed.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, "");

  // 1. Already /api/uploads/...
  if (trimmed.startsWith("/api/uploads/")) {
    return trimmed;
  }

  // 2. Relative /uploads/... -> redirect to custom API route for Dokploy / standalone mode
  if (trimmed.startsWith("/uploads/")) {
    return `/api${trimmed}`;
  }
  if (trimmed.startsWith("uploads/")) {
    return `/api/${trimmed}`;
  }

  // Match common S3 prefixes for this project
  const s3UrlPattern = /\/(upload|attendance-photos|activity-photos|profile-photos|curhat|lms-materials|lms-covers|chitralearning|mcu-wellness-results)\/([a-zA-Z0-9\-._~%!$&'()*+,;=:@]+)/i;
  const match = trimmed.match(s3UrlPattern);

  if (match) {
    return `/api/uploads/${match[1]}/${match[2]}`;
  }

  return trimmed;
}
