/**
 * Simple in-memory login throttle. Good enough for a single-instance
 * deployment; if this app is ever run behind a load balancer with multiple
 * instances, replace this with a shared store (e.g. Redis).
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Attempt = { count: number; firstAttemptAt: number };

const attempts = new Map<string, Attempt>();

function cleanup(now: number) {
  for (const [key, value] of attempts) {
    if (now - value.firstAttemptAt > WINDOW_MS) attempts.delete(key);
  }
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  cleanup(now);
  const entry = attempts.get(key);
  if (!entry) return false;
  if (now - entry.firstAttemptAt > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    entry.count += 1;
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
