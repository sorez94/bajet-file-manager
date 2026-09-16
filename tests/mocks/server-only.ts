// Vitest runs modules in plain Node, not inside Next.js's "react-server"
// bundling condition, so the real `server-only` package throws on import.
// This stub replaces it for tests only (see vitest.config.ts alias).
export {};
