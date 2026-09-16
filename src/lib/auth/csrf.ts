import "server-only";

/**
 * Same-origin check for state-changing requests. Combined with the
 * session cookie's SameSite=Lax attribute, this blocks classic
 * cross-site form/fetch CSRF against mutating endpoints.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Same-site requests without an Origin header (e.g. some same-origin
  // navigations) are allowed; cross-site ones always send Origin.
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
