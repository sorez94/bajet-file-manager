import path from "node:path";

// Safety net in case globalSetup's env mutations don't propagate to this
// worker (they should, but this keeps tests deterministic either way).
process.env.TURSO_DATABASE_URL ??= `file:${path.resolve(__dirname, "../.tmp-test.sqlite")}`;
process.env.FILE_STORAGE_PATH ??= path.resolve(__dirname, "../.tmp-test-storage");
process.env.MAX_FILE_SIZE_MB ??= "1";
