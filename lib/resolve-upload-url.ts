/**
 * Client-safe URL resolution helper for S3 and Uploads Proxy.
 * Does NOT import server environment, node:fs, or AWS SDK.
 */

export function extractS3ObjectKeyFromUrl(objectUrl: string | null | undefined): string | null {
  if (!objectUrl) return null;
  try {
    const trimmed = objectUrl.trim();
    const cleanPath = trimmed.replace(/^\/+/, "");

    // 1. Direct prefix matches
    const prefixes = [
      "upload/",
      "attendance-photos/",
      "activity-photos/",
      "profile-photos/",
      "curhat/",
      "mcu-wellness-results/",
    ];
    for (const prefix of prefixes) {
      if (cleanPath.startsWith(prefix)) {
        return cleanPath;
      }
    }

    // 2. Already relative /api/uploads/
    if (trimmed.startsWith("/api/uploads/")) {
      return trimmed.slice("/api/uploads/".length);
    }
    if (trimmed.startsWith("/uploads/")) {
      return trimmed.slice("/uploads/".length);
    }

    // 3. Regex match for known prefixes in full URLs
    const match = trimmed.match(
      /(?:activity-photos|attendance-photos|profile-photos|upload|curhat|mcu-wellness-results)\/[a-zA-Z0-9\-._~%!$&'()*+,;=:@]+/i
    );
    if (match) {
      return match[0];
    }

    return null;
  } catch {
    return null;
  }
}

export function resolveUploadUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();

  // 1. Already relative /api/uploads/
  if (trimmed.startsWith("/api/uploads/")) {
    return trimmed;
  }

  // 2. Relative /uploads/
  if (trimmed.startsWith("/uploads/")) {
    return `/api${trimmed}`;
  }

  // 3. Extract key using extractS3ObjectKeyFromUrl
  const key = extractS3ObjectKeyFromUrl(trimmed);
  if (key) {
    return `/api/uploads/${key}`;
  }

  return trimmed;
}

export function replaceS3UrlsInHtml(html: string | null | undefined): string {
  if (!html) return "";

  const s3UrlPattern =
    /https?:\/\/[^\s"'<>]+?\/(upload|activity-photos|attendance-photos|profile-photos|curhat|mcu-wellness-results)\/([a-zA-Z0-9\-._~%!$&'()*+,;=:@]+)(?:\?[^\s"'<>]+)?/g;

  return html.replace(s3UrlPattern, (match, prefix, fileName) => {
    return `/api/uploads/${prefix}/${fileName}`;
  });
}
