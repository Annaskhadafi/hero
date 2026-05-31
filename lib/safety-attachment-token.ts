import { createHmac, timingSafeEqual } from "crypto";

function getSigningSecret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function computeSignature(objectUrl: string, expiresAt: number) {
  return createHmac("sha256", getSigningSecret())
    .update(`${objectUrl}\n${expiresAt}`)
    .digest("base64url");
}

/**
 * Create a short-lived signed token that authorizes read access to a single
 * S3 object through the same-origin attachment proxy.
 *
 * The token is self-contained (HMAC over the object URL + expiry) so the proxy
 * can authorize the request without a session cookie or a database lookup. This
 * keeps `<img>` subresource loads working even inside embedded browsers that do
 * not forward cookies to subresource requests.
 */
export function signAttachmentToken(objectUrl: string, ttlMs = 1000 * 60 * 60) {
  const trimmed = objectUrl?.trim();
  if (!trimmed) return "";

  const expiresAt = Date.now() + ttlMs;
  const signature = computeSignature(trimmed, expiresAt);
  return `${expiresAt}.${signature}`;
}

export function verifyAttachmentToken(objectUrl: string, token: string | null) {
  if (!objectUrl || !token) return false;
  if (!getSigningSecret()) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0) return false;

  const expiresAt = Number(token.slice(0, separatorIndex));
  const signature = token.slice(separatorIndex + 1);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Date.now()) return false;

  const expected = computeSignature(objectUrl.trim(), expiresAt);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function buildSignedAttachmentPath(objectUrl: string | null, ttlMs?: number) {
  const trimmed = objectUrl?.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;

  const token = signAttachmentToken(trimmed, ttlMs);
  return `/api/safety/attachment?url=${encodeURIComponent(trimmed)}&token=${encodeURIComponent(token)}`;
}
