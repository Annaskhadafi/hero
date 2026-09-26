/**
 * Client-safe URL resolution helper for S3 and Uploads Proxy.
 * Does NOT import server environment, node:fs, or AWS SDK.
 */

export function extractS3ObjectKeyFromUrl(objectUrl: string | null | undefined): string | null {
  if (!objectUrl) return null;
  try {
    let trimmed = objectUrl.trim();
    // Strip query string and fragment first
    const qIdx = trimmed.indexOf("?");
    if (qIdx !== -1) trimmed = trimmed.substring(0, qIdx);
    const hashIdx = trimmed.indexOf("#");
    if (hashIdx !== -1) trimmed = trimmed.substring(0, hashIdx);

    const cleanPath = trimmed.replace(/^\/+/, "");

    // 1. Direct prefix matches
    const prefixes = [
      "upload/",
      "uploads/",
      "attendance-photos/",
      "activity-photos/",
      "profile-photos/",
      "curhat/",
      "curhat-attachments/",
      "mcu-wellness-results/",
      "mcu-referral-letters/",
      "mcu-results/",
      "offering-letters/",
      "sop-win-requests/",
      "sop-win/",
      "lms-materials/",
      "lms-covers/",
      "chitralearning/",
      "emergency-reports/",
      "safety/",
      "face-attendance/",
      "face-attendance-v2/",
      "contract-review-attachment/",
      "public-career-cv/",
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
      /(?:activity-photos|attendance-photos|profile-photos|upload|uploads|curhat|curhat-attachments|mcu-wellness-results|mcu-referral-letters|mcu-results|offering-letters|sop-win-requests|sop-win|lms-materials|lms-covers|chitralearning|emergency-reports|safety|face-attendance|face-attendance-v2|contract-review-attachment|public-career-cv)\/[a-zA-Z0-9\-._~%!$&'()*+,;=:@]+/i
    );
    if (match) {
      return match[0];
    }

    // 4. Cloudhost S3 URL fallback (e.g. is3.cloudhost.id/onechitra/...)
    if (trimmed.includes("is3.cloudhost.id")) {
      const parts = trimmed.split("is3.cloudhost.id/")[1];
      if (parts) {
        // Remove bucket name prefix (e.g. "onechitra/upload/uuid.jpg" -> "upload/uuid.jpg")
        const withoutBucket = parts.replace(/^[^/]+\//, "");
        if (withoutBucket) {
          return withoutBucket;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to get the base application URL dynamically based on BETTER_AUTH_URL,
 * NEXT_PUBLIC_BETTER_AUTH_URL, or window.location.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const configured =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (configured) {
    const trimmed = configured.trim().replace(/\/api\/auth\/?$/, "").replace(/\/+$/, "");
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  return process.env.NODE_ENV === "production"
    ? "https://hero.chitraparatama.com"
    : "http://localhost:3000";
}

export function resolveUploadUrl(
  url: string | null | undefined,
  options?: { absolute?: boolean }
): string {
  if (!url) return "";
  let trimmed = url.trim();

  // Strip known hosts (localhost, 127.0.0.1, hero.chitraparatama.com, or configured BETTER_AUTH_URL host)
  // to ensure relative path resolution works on whatever host the user is currently accessing!
  trimmed = trimmed
    .replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, "")
    .replace(/^https?:\/\/hero\.chitraparatama\.com(?::\d+)?/i, "")
    .replace(/^https?:\/\/hero\.chitraparatama\.co\.id(?::\d+)?/i, "");

  // If BETTER_AUTH_URL or NEXT_PUBLIC_BETTER_AUTH_URL is defined, strip its host as well
  const envAuthUrl =
    (typeof process !== "undefined" &&
      (process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL)) ||
    "";
  if (envAuthUrl) {
    try {
      const parsedHost = new URL(
        envAuthUrl.startsWith("http") ? envAuthUrl : `https://${envAuthUrl}`
      ).host;
      if (parsedHost) {
        trimmed = trimmed.replace(
          new RegExp(`^https?:\\/\\/${parsedHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?::\\d+)?`, "i"),
          ""
        );
      }
    } catch {}
  }

  let finalRelativeUrl = trimmed;

  // 1. Already relative /api/uploads/
  if (trimmed.startsWith("/api/uploads/")) {
    finalRelativeUrl = trimmed.split("?")[0].split("#")[0];
  } else if (trimmed.startsWith("/uploads/")) {
    // 2. Relative /uploads/
    finalRelativeUrl = `/api${trimmed.split("?")[0].split("#")[0]}`;
  } else if (trimmed.startsWith("uploads/")) {
    finalRelativeUrl = `/api/${trimmed.split("?")[0].split("#")[0]}`;
  } else {
    // 3. Extract key using extractS3ObjectKeyFromUrl
    const key = extractS3ObjectKeyFromUrl(trimmed);
    if (key) {
      finalRelativeUrl = `/api/uploads/${key}`;
    }
  }

  if (options?.absolute && finalRelativeUrl.startsWith("/")) {
    return `${getAppBaseUrl()}${finalRelativeUrl}`;
  }

  return finalRelativeUrl;
}

export function resolveAbsoluteUploadUrl(url: string | null | undefined): string {
  return resolveUploadUrl(url, { absolute: true });
}

export function replaceS3UrlsInHtml(html: string | null | undefined): string {
  if (!html) return "";

  const s3UrlPattern =
    /https?:\/\/[^\s"'<>]+?\/(upload|uploads|activity-photos|attendance-photos|profile-photos|curhat|mcu-wellness-results|sop-win-requests|sop-win|lms-materials|lms-covers|chitralearning)\/([a-zA-Z0-9\-._~%!$&'()*+,;=:@]+)(?:\?[^\s"'<>]+)?/g;

  return html.replace(s3UrlPattern, (match, prefix, fileName) => {
    return `/api/uploads/${prefix}/${fileName}`;
  });
}
