/**
 * Minimal stand-in for next/headers' cookies() so service/route-handler code
 * can run inside Vitest (outside a real Next.js request scope). Backed by a
 * module-level store so a session set during a "login" call in a test is
 * readable by a later "getSessionUser" call in the same test, just like a
 * real browser round-trip.
 */
const store = new Map<string, string>();

function cookieApi() {
  return {
    get(name: string) {
      return store.has(name) ? { name, value: store.get(name)! } : undefined;
    },
    set(name: string, value: string) {
      store.set(name, value);
    },
    delete(name: string) {
      store.delete(name);
    },
    has(name: string) {
      return store.has(name);
    },
  };
}

export async function cookies() {
  return cookieApi();
}

export function __resetCookies() {
  store.clear();
}
