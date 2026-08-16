export function resolveClientUploadUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();

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

  if (trimmed.startsWith("http://localhost")) {
    return trimmed;
  }

  // Match common S3 prefixes for this project
  const s3UrlPattern = /\/(upload|attendance-photos|activity-photos|profile-photos|curhat|lms-materials|lms-covers|chitralearning)\/([a-zA-Z0-9\-._~%!$&'()*+,;=:@]+)/i;
  const match = trimmed.match(s3UrlPattern);

  if (match) {
    return `/api/uploads/${match[1]}/${match[2]}`;
  }

  return trimmed;
}
