/**
 * Response compression: gzip/brotli, selective field compression,
 * ratio monitoring, decompression middleware, savings reporting
 * (Issue #503).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompressionAlgorithm = "gzip" | "brotli" | "deflate" | "none";

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  /** Minimum payload size (bytes) to apply compression. Default 1024. */
  minSize?: number;
  /** Quality level 1-11 for brotli, 1-9 for gzip. */
  quality?: number;
  /** Content types to compress. Defaults to text/json types. */
  compressibleTypes?: string[];
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: CompressionAlgorithm;
  durationMs: number;
}

export interface CumulativeSavings {
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  averageRatio: number;
  requestCount: number;
  byAlgorithm: Record<CompressionAlgorithm, { count: number; savedBytes: number }>;
}

export interface FieldCompressionConfig {
  /** Dot-notation paths to fields that should be compressed individually. */
  fields: string[];
  /** Fields to exclude from compression. */
  excludeFields?: string[];
  /** Minimum field value size to compress. */
  minFieldSize?: number;
}

export interface CompressionMiddlewareResult {
  body: Uint8Array | string;
  headers: Record<string, string>;
  stats: CompressionStats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COMPRESSIBLE_TYPES = [
  "application/json",
  "text/plain",
  "text/html",
  "text/css",
  "application/javascript",
  "text/javascript",
  "application/xml",
  "text/xml",
  "image/svg+xml",
];

const DEFAULT_MIN_SIZE = 1024;

// ---------------------------------------------------------------------------
// Stats tracking
// ---------------------------------------------------------------------------

let statsHistory: CompressionStats[] = [];
const MAX_HISTORY = 10_000;

function recordStats(stats: CompressionStats): void {
  statsHistory.push(stats);
  if (statsHistory.length > MAX_HISTORY) {
    statsHistory = statsHistory.slice(-MAX_HISTORY);
  }
}

export function getCumulativeSavings(): CumulativeSavings {
  const byAlgorithm: CumulativeSavings["byAlgorithm"] = {
    gzip: { count: 0, savedBytes: 0 },
    brotli: { count: 0, savedBytes: 0 },
    deflate: { count: 0, savedBytes: 0 },
    none: { count: 0, savedBytes: 0 },
  };

  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const s of statsHistory) {
    totalOriginal += s.originalSize;
    totalCompressed += s.compressedSize;
    byAlgorithm[s.algorithm].count++;
    byAlgorithm[s.algorithm].savedBytes += s.originalSize - s.compressedSize;
  }

  return {
    totalOriginalBytes: totalOriginal,
    totalCompressedBytes: totalCompressed,
    totalSavedBytes: totalOriginal - totalCompressed,
    averageRatio: totalOriginal === 0 ? 1 : totalCompressed / totalOriginal,
    requestCount: statsHistory.length,
    byAlgorithm,
  };
}

export function resetStats(): void {
  statsHistory = [];
}

// ---------------------------------------------------------------------------
// Compression / decompression using Web APIs (CompressionStream)
// ---------------------------------------------------------------------------

async function compressWithStream(
  data: Uint8Array,
  format: "gzip" | "deflate"
): Promise<Uint8Array> {
  const cs = new CompressionStream(format);
  const writer = cs.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function decompressWithStream(
  data: Uint8Array,
  format: "gzip" | "deflate"
): Promise<Uint8Array> {
  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public compression API
// ---------------------------------------------------------------------------

export async function compress(
  data: string | Uint8Array,
  options: CompressionOptions = { algorithm: "gzip" }
): Promise<{ compressed: Uint8Array; stats: CompressionStats }> {
  const start = performance.now();
  const encoder = new TextEncoder();
  const raw = typeof data === "string" ? encoder.encode(data) : data;
  const originalSize = raw.byteLength;

  if (options.algorithm === "none" || originalSize < (options.minSize ?? DEFAULT_MIN_SIZE)) {
    const stats: CompressionStats = {
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      algorithm: "none",
      durationMs: performance.now() - start,
    };
    recordStats(stats);
    return { compressed: raw, stats };
  }

  let compressed: Uint8Array;
  const algo = options.algorithm;

  if (algo === "gzip" || algo === "deflate") {
    compressed = await compressWithStream(raw, algo);
  } else if (algo === "brotli") {
    // Brotli not available via CompressionStream in all runtimes; fall back to gzip
    compressed = await compressWithStream(raw, "gzip");
  } else {
    compressed = raw;
  }

  const stats: CompressionStats = {
    originalSize,
    compressedSize: compressed.byteLength,
    ratio: compressed.byteLength / originalSize,
    algorithm: algo === "brotli" ? "gzip" : algo, // actual algorithm used
    durationMs: performance.now() - start,
  };
  recordStats(stats);

  return { compressed, stats };
}

export async function decompress(
  data: Uint8Array,
  algorithm: CompressionAlgorithm = "gzip"
): Promise<string> {
  if (algorithm === "none") {
    return new TextDecoder().decode(data);
  }

  const format = algorithm === "brotli" ? "gzip" : algorithm === "deflate" ? "deflate" : "gzip";
  const decompressed = await decompressWithStream(data, format as "gzip" | "deflate");
  return new TextDecoder().decode(decompressed);
}

// ---------------------------------------------------------------------------
// Selective field compression
// ---------------------------------------------------------------------------

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((curr, key) => {
    if (curr && typeof curr === "object") return (curr as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let curr: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in curr) || typeof curr[keys[i]] !== "object") {
      curr[keys[i]] = {};
    }
    curr = curr[keys[i]] as Record<string, unknown>;
  }
  curr[keys[keys.length - 1]] = value;
}

export async function compressFields(
  data: Record<string, unknown>,
  config: FieldCompressionConfig,
  options: CompressionOptions = { algorithm: "gzip" }
): Promise<{
  result: Record<string, unknown>;
  compressedFields: string[];
  totalSaved: number;
}> {
  const result = structuredClone(data);
  const compressedFields: string[] = [];
  let totalSaved = 0;
  const minFieldSize = config.minFieldSize ?? 256;
  const excludeSet = new Set(config.excludeFields ?? []);

  for (const field of config.fields) {
    if (excludeSet.has(field)) continue;
    const value = getNestedValue(result, field);
    if (value === undefined) continue;

    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    if (serialized.length < minFieldSize) continue;

    const { compressed, stats } = await compress(serialized, options);
    // Store as base64 for JSON serialization
    const b64 = btoa(String.fromCharCode(...compressed));
    setNestedValue(result, field, `__compressed:${options.algorithm}:${b64}`);
    compressedFields.push(field);
    totalSaved += stats.originalSize - stats.compressedSize;
  }

  return { result, compressedFields, totalSaved };
}

export async function decompressFields(
  data: Record<string, unknown>,
  fields: string[]
): Promise<Record<string, unknown>> {
  const result = structuredClone(data);

  for (const field of fields) {
    const value = getNestedValue(result, field);
    if (typeof value !== "string" || !value.startsWith("__compressed:")) continue;

    const [, algo, b64] = value.split(":");
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const decompressed = await decompress(bytes, algo as CompressionAlgorithm);
    try {
      setNestedValue(result, field, JSON.parse(decompressed));
    } catch {
      setNestedValue(result, field, decompressed);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Middleware helper for Next.js API routes
// ---------------------------------------------------------------------------

export function selectAlgorithm(acceptEncoding: string): CompressionAlgorithm {
  if (acceptEncoding.includes("br")) return "brotli";
  if (acceptEncoding.includes("gzip")) return "gzip";
  if (acceptEncoding.includes("deflate")) return "deflate";
  return "none";
}

export function isCompressible(
  contentType: string,
  allowed: string[] = DEFAULT_COMPRESSIBLE_TYPES
): boolean {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return allowed.includes(base);
}

export async function compressResponse(
  body: string,
  acceptEncoding: string,
  contentType: string = "application/json",
  options?: Partial<CompressionOptions>
): Promise<CompressionMiddlewareResult> {
  const algo = selectAlgorithm(acceptEncoding);

  if (algo === "none" || !isCompressible(contentType)) {
    const encoder = new TextEncoder();
    const raw = encoder.encode(body);
    return {
      body,
      headers: { "Content-Type": contentType },
      stats: {
        originalSize: raw.byteLength,
        compressedSize: raw.byteLength,
        ratio: 1,
        algorithm: "none",
        durationMs: 0,
      },
    };
  }

  const { compressed, stats } = await compress(body, {
    algorithm: algo,
    ...options,
  });

  const encodingHeader = algo === "brotli" ? "br" : algo;

  return {
    body: compressed,
    headers: {
      "Content-Type": contentType,
      "Content-Encoding": encodingHeader,
      "Content-Length": String(compressed.byteLength),
      Vary: "Accept-Encoding",
    },
    stats,
  };
}
