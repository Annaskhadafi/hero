import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_SUFFIX = "better-auth.session_token";

function getAuthSecret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function parseCookieHeader(cookieHeader: string) {
  const jar = new Map<string, string>();

  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) jar.set(name, value);
  }

  return jar;
}

function getSessionCookieValue(cookieHeader: string) {
  const jar = parseCookieHeader(cookieHeader);

  for (const [name, value] of jar) {
    if (name === SESSION_COOKIE_SUFFIX || name.endsWith(`.${SESSION_COOKIE_SUFFIX}`)) {
      return value;
    }
  }

  return null;
}

/**
 * Verify the better-auth session cookie signature locally using HMAC.
 *
 * This proves the cookie was issued by this server (the token + signature pair
 * is signed with BETTER_AUTH_SECRET) without hitting the database, so it stays
 * reliable even when the remote Postgres link is briefly unreachable.
 */
export async function hasValidSessionCookie(cookieHeader: string | null) {
  if (!cookieHeader) return false;

  const secret = getAuthSecret();
  if (!secret) return false;

  const cookieValue = getSessionCookieValue(cookieHeader);
  if (!cookieValue) return false;

  const decoded = decodeURIComponent(cookieValue);
  const separatorIndex = decoded.lastIndexOf(".");
  if (separatorIndex <= 0) return false;

  const token = decoded.slice(0, separatorIndex);
  const signature = decoded.slice(separatorIndex + 1);
  if (!token || !signature) return false;

  const expected = createHmac("sha256", secret).update(token).digest("base64url");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
