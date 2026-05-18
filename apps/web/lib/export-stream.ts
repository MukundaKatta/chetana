/**
 * Streaming export utilities for large audit data (Issue #283).
 * Chunks data into manageable pieces and streams them to the client
 * with progress reporting and cancellation support.
 */

export interface ExportProgress {
  /** Number of chunks sent so far. */
  chunksComplete: number;
  /** Total number of chunks to send. */
  totalChunks: number;
  /** Progress as a fraction (0-1). */
  fraction: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/** Default chunk size: 500 records per chunk. */
const DEFAULT_CHUNK_SIZE = 500;

interface ExportStreamOptions {
  /** Number of records per chunk (default 500). */
  chunkSize?: number;
  /** Called as each chunk is written. */
  onProgress?: ProgressCallback;
  /** AbortController signal for cancellation. */
  signal?: AbortSignal;
}

/**
 * Fetches audit data and returns a ReadableStream of JSON chunks.
 * Each chunk is a newline-delimited JSON object.
 *
 * @param auditId - The audit to export
 * @param options - Streaming configuration
 */
export function createExportStream(
  auditId: string,
  options: ExportStreamOptions = {}
): ReadableStream<Uint8Array> {
  const { chunkSize = DEFAULT_CHUNK_SIZE, onProgress, signal } = options;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Check for cancellation before starting
        if (signal?.aborted) {
          controller.close();
          return;
        }

        // Fetch the full audit data from the API
        const response = await fetch(`/api/audits/${auditId}/export`, {
          signal,
        });

        if (!response.ok) {
          controller.error(
            new Error(`Export failed: ${response.status} ${response.statusText}`)
          );
          return;
        }

        const data = await response.json();
        const records: unknown[] = Array.isArray(data)
          ? data
          : data.probeResults ?? data.results ?? [data];

        const totalChunks = Math.max(1, Math.ceil(records.length / chunkSize));

        // Write header
        const header = JSON.stringify({
          auditId,
          exportedAt: new Date().toISOString(),
          totalRecords: records.length,
        });
        controller.enqueue(encoder.encode(header + "\n"));

        // Stream data in chunks
        for (let i = 0; i < totalChunks; i++) {
          if (signal?.aborted) {
            controller.close();
            return;
          }

          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, records.length);
          const chunk = records.slice(start, end);

          const chunkJson = JSON.stringify({ chunk: i, records: chunk });
          controller.enqueue(encoder.encode(chunkJson + "\n"));

          const progress: ExportProgress = {
            chunksComplete: i + 1,
            totalChunks,
            fraction: (i + 1) / totalChunks,
          };
          onProgress?.(progress);

          // Yield to the event loop between chunks to avoid blocking
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        controller.close();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          controller.close();
        } else {
          controller.error(err);
        }
      }
    },

    cancel() {
      // Stream consumer cancelled - nothing extra to clean up
    },
  });
}

/**
 * Convenience helper: reads the entire export stream and returns the
 * concatenated text. Useful for testing or small exports.
 */
export async function readExportStream(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(decoder.decode(value, { stream: true }));
  }

  return parts.join("");
}

/**
 * Triggers a file download from the export stream.
 *
 * @param auditId - The audit to export
 * @param filename - Download filename (default: audit-{id}.jsonl)
 * @param options - Stream options
 */
export async function downloadExport(
  auditId: string,
  filename?: string,
  options?: ExportStreamOptions
): Promise<void> {
  const stream = createExportStream(auditId, options);
  const text = await readExportStream(stream);
  const blob = new Blob([text], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `audit-${auditId}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
