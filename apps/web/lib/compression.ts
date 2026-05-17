/**
 * Response compression helper — gzip-compresses data when it exceeds
 * a minimum size threshold and the content type is compressible.
 */

import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/** Minimum body size (in bytes) before compression kicks in. */
const MIN_SIZE_BYTES = 1024; // 1 KB

/** Content types that benefit from compression. */
const COMPRESSIBLE_TYPES = new Set([
  "application/json",
  "text/html",
  "text/plain",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/xml",
  "text/xml",
  "image/svg+xml",
]);

/**
 * Detect whether a content type is compressible.
 */
export function isCompressible(contentType: string): boolean {
  // Strip parameters like charset
  const base = contentType.split(";")[0].trim().toLowerCase();
  return COMPRESSIBLE_TYPES.has(base);
}

export interface CompressedResponse {
  body: Buffer;
  headers: Record<string, string>;
  compressed: boolean;
}

/**
 * Compress response data with gzip if it exceeds the minimum size
 * threshold and the content type is compressible.
 *
 * @param data - The raw response body (string or Buffer)
 * @param contentType - The MIME type of the response (default: application/json)
 * @returns An object containing the (possibly compressed) body and headers
 */
export async function compressResponse(
  data: string | Buffer,
  contentType = "application/json"
): Promise<CompressedResponse> {
  const raw = typeof data === "string" ? Buffer.from(data, "utf-8") : data;

  // Skip compression for small payloads or non-compressible types
  if (raw.length < MIN_SIZE_BYTES || !isCompressible(contentType)) {
    return {
      body: raw,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(raw.length),
      },
      compressed: false,
    };
  }

  const compressed = await gzipAsync(raw);

  return {
    body: compressed,
    headers: {
      "Content-Type": contentType,
      "Content-Encoding": "gzip",
      "Content-Length": String(compressed.length),
    },
    compressed: true,
  };
}

/**
 * Decompress a gzip-encoded buffer. Useful for reading compressed request
 * bodies or cached data.
 */
export async function decompressResponse(data: Buffer): Promise<Buffer> {
  return gunzipAsync(data);
}
