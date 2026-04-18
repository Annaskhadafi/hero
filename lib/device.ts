const MOBILE_USER_AGENT_PATTERN =
  /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS/i;

export function isMobileUserAgent(userAgent?: string | null) {
  if (!userAgent) {
    return false;
  }

  return MOBILE_USER_AGENT_PATTERN.test(userAgent);
}

export function getPostLoginPathForUserAgent(userAgent?: string | null) {
  return isMobileUserAgent(userAgent) ? "/mobile" : "/dashboard";
}
