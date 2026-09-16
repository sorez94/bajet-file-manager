export interface StoredFileHandle {
  /** Provider-internal identifier for the physical object (e.g. a filename). */
  storedName: string;
  /** Number of bytes written. */
  size: number;
}

/**
 * Abstraction over "where the bytes actually live". The local filesystem
 * implementation is the only one used today, but every call site in this
 * app talks to this interface so the physical backend could later be
 * swapped for S3-compatible storage without touching route handlers or UI.
 */
export interface StorageService {
  /** Persists a stream/buffer under a new, provider-generated name. Never trusts caller-supplied paths. */
  upload(data: ReadableStream | Buffer, extension: string): Promise<StoredFileHandle>;
  /** Returns a readable stream for a previously stored object. */
  download(storedName: string): Promise<ReadableStream>;
  /** Removes a previously stored object. Resolves even if the object is already missing. */
  delete(storedName: string): Promise<void>;
  /** Checks whether a stored object currently exists on the backend. */
  exists(storedName: string): Promise<boolean>;
  /** Returns backend metadata (currently just size) for a stored object. */
  getMetadata(storedName: string): Promise<{ size: number } | null>;
}
