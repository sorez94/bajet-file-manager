import path from "node:path";
import { defineConfig } from "vitest/config";

const dirname = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(dirname, "tests/mocks/server-only.ts"),
      "next/headers": path.resolve(dirname, "tests/mocks/next-headers.ts"),
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globalSetup: "./tests/globalSetup.ts",
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    // All tests share one on-disk SQLite file, so keep them fully
    // sequential (one process, one file at a time) to avoid SQLITE_BUSY.
    fileParallelism: false,
  },
});
