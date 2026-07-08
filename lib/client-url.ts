export function resolveClientUploadUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  
  if (
    trimmed.startsWith("/api/uploads/") ||
    trimmed.startsWith("http://localhost") ||
    trimmed.startsWith("/uploads/")
  ) {
    return trimmed;
  }

  // Match common S3 prefixes for this project
  const s3UrlPattern = /\/(upload|attendance-photos|profile-photos|curhat)\/([a-zA-Z0-9\-._~%!$&'()*+,;=:@]+)/;
  const match = trimmed.match(s3UrlPattern);
  
  if (match) {
    return `/api/uploads/${match[1]}/${match[2]}`;
  }

  return trimmed;
}
