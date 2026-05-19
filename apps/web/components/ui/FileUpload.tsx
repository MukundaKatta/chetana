/**
 * File upload: drag-and-drop zone, file type validation (JSON/CSV/YAML),
 * progress indicator, preview parsed data, error highlighting (Issue #512).
 */

"use client";

import {
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AcceptedFileType = "json" | "csv" | "yaml";

export interface ParsedData {
  fileName: string;
  fileType: AcceptedFileType;
  sizeBytes: number;
  rowCount: number;
  columns?: string[];
  preview: unknown[];
  raw: string;
}

export interface FileError {
  fileName: string;
  line?: number;
  column?: number;
  message: string;
}

export interface FileUploadProps {
  /** Accepted file types. Defaults to all three. */
  accept?: AcceptedFileType[];
  /** Max file size in bytes. Default 10 MB. */
  maxSize?: number;
  /** Whether multiple files can be selected. */
  multiple?: boolean;
  /** Callback with parsed result(s). */
  onFileParsed?: (data: ParsedData[]) => void;
  /** Callback on parse error(s). */
  onError?: (errors: FileError[]) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// MIME / extension map
// ---------------------------------------------------------------------------

const TYPE_MAP: Record<AcceptedFileType, { mime: string[]; ext: string[] }> = {
  json: { mime: ["application/json"], ext: [".json"] },
  csv: { mime: ["text/csv", "text/plain"], ext: [".csv"] },
  yaml: {
    mime: ["application/x-yaml", "text/yaml", "text/plain"],
    ext: [".yaml", ".yml"],
  },
};

function detectType(file: File, allowed: AcceptedFileType[]): AcceptedFileType | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  for (const t of allowed) {
    if (TYPE_MAP[t].ext.includes(ext)) return t;
  }
  for (const t of allowed) {
    if (TYPE_MAP[t].mime.includes(file.type)) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseJSON(raw: string, fileName: string): { data: ParsedData; errors: FileError[] } {
  const errors: FileError[] = [];
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const columns = arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null
      ? Object.keys(arr[0] as Record<string, unknown>)
      : undefined;
    return {
      data: {
        fileName,
        fileType: "json",
        sizeBytes: new Blob([raw]).size,
        rowCount: arr.length,
        columns,
        preview: arr.slice(0, 10),
        raw,
      },
      errors,
    };
  } catch (e) {
    const msg = e instanceof SyntaxError ? e.message : "Invalid JSON";
    // Try to extract line/column from error message
    const match = msg.match(/position (\d+)/);
    const position = match ? parseInt(match[1], 10) : undefined;
    let line: number | undefined;
    let column: number | undefined;
    if (position !== undefined) {
      const upToPos = raw.slice(0, position);
      line = (upToPos.match(/\n/g)?.length ?? 0) + 1;
      column = position - upToPos.lastIndexOf("\n");
    }
    errors.push({ fileName, line, column, message: msg });
    return {
      data: {
        fileName,
        fileType: "json",
        sizeBytes: new Blob([raw]).size,
        rowCount: 0,
        preview: [],
        raw,
      },
      errors,
    };
  }
}

function parseCSV(raw: string, fileName: string): { data: ParsedData; errors: FileError[] } {
  const errors: FileError[] = [];
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    errors.push({ fileName, message: "Empty CSV file" });
    return {
      data: { fileName, fileType: "csv", sizeBytes: new Blob([raw]).size, rowCount: 0, preview: [], raw },
      errors,
    };
  }

  const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    if (values.length !== columns.length) {
      errors.push({
        fileName,
        line: i + 1,
        message: `Expected ${columns.length} columns, got ${values.length}`,
      });
      continue;
    }
    const row: Record<string, string> = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    rows.push(row);
  }

  return {
    data: {
      fileName,
      fileType: "csv",
      sizeBytes: new Blob([raw]).size,
      rowCount: rows.length,
      columns,
      preview: rows.slice(0, 10),
      raw,
    },
    errors,
  };
}

function parseYAML(raw: string, fileName: string): { data: ParsedData; errors: FileError[] } {
  // Simple YAML key-value parser (not a full YAML implementation)
  const errors: FileError[] = [];
  const lines = raw.split(/\r?\n/);
  const items: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let inItem = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) continue;

    if (trimmed === "---") {
      if (inItem && Object.keys(current).length > 0) {
        items.push(current);
        current = {};
      }
      inItem = true;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (Object.keys(current).length > 0) items.push(current);
      current = {};
      const kvMatch = trimmed.slice(2).match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        current[kvMatch[1]] = kvMatch[2].replace(/^['"]|['"]$/g, "");
      }
      inItem = true;
      continue;
    }

    const kvMatch = trimmed.match(/^(\w[\w.-]*):\s*(.*)$/);
    if (kvMatch) {
      current[kvMatch[1]] = kvMatch[2].replace(/^['"]|['"]$/g, "");
      inItem = true;
    } else {
      errors.push({
        fileName,
        line: i + 1,
        message: `Unrecognized YAML syntax: "${trimmed}"`,
      });
    }
  }
  if (Object.keys(current).length > 0) items.push(current);

  const columns = items.length > 0 ? Object.keys(items[0]) : undefined;

  return {
    data: {
      fileName,
      fileType: "yaml",
      sizeBytes: new Blob([raw]).size,
      rowCount: items.length,
      columns,
      preview: items.slice(0, 10),
      raw,
    },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileUpload({
  accept = ["json", "csv", "yaml"],
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  onFileParsed,
  onError,
  className,
}: FileUploadProps): ReactNode {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<ParsedData[]>([]);
  const [errors, setErrors] = useState<FileError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptStr = accept
    .flatMap((t) => TYPE_MAP[t].ext)
    .join(",");

  const processFiles = useCallback(
    async (files: File[]) => {
      const allResults: ParsedData[] = [];
      const allErrors: FileError[] = [];
      setProgress(0);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round(((i + 0.5) / files.length) * 100));

        // Size check
        if (file.size > maxSize) {
          allErrors.push({
            fileName: file.name,
            message: `File exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(1)} MB`,
          });
          continue;
        }

        // Type check
        const fileType = detectType(file, accept);
        if (!fileType) {
          allErrors.push({
            fileName: file.name,
            message: `Unsupported file type. Accepted: ${accept.join(", ")}`,
          });
          continue;
        }

        // Read contents
        const raw = await file.text();

        let result: { data: ParsedData; errors: FileError[] };
        switch (fileType) {
          case "json":
            result = parseJSON(raw, file.name);
            break;
          case "csv":
            result = parseCSV(raw, file.name);
            break;
          case "yaml":
            result = parseYAML(raw, file.name);
            break;
        }

        allResults.push(result.data);
        allErrors.push(...result.errors);
      }

      setProgress(100);
      setResults(allResults);
      setErrors(allErrors);

      if (allResults.length > 0) onFileParsed?.(allResults);
      if (allErrors.length > 0) onError?.(allErrors);

      setTimeout(() => setProgress(null), 1000);
    },
    [accept, maxSize, onFileParsed, onError]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      processFiles(multiple ? files : files.slice(0, 1));
    },
    [multiple, processFiles]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      processFiles(files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFiles]
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-700 bg-gray-900 hover:border-gray-600"
        )}
      >
        <div className="text-3xl text-gray-500">&#8593;</div>
        <p className="mt-2 text-sm text-gray-300">
          Drop files here or <span className="text-blue-400">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Accepts {accept.map((t) => t.toUpperCase()).join(", ")} &mdash; max{" "}
          {(maxSize / 1024 / 1024).toFixed(0)} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Progress */}
      {progress !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <div
              key={i}
              className="rounded border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-300"
            >
              <strong>{err.fileName}</strong>
              {err.line !== undefined && (
                <span className="text-red-400">
                  {" "}
                  (line {err.line}
                  {err.column !== undefined ? `, col ${err.column}` : ""})
                </span>
              )}
              : {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {results.map((res, idx) => (
        <div
          key={idx}
          className="rounded-md border border-gray-800 bg-gray-900 p-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-200">
              {res.fileName}
            </h4>
            <div className="flex gap-2 text-[10px] text-gray-500">
              <span className="rounded bg-gray-800 px-1.5 py-0.5">
                {res.fileType.toUpperCase()}
              </span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5">
                {res.rowCount} rows
              </span>
              <span className="rounded bg-gray-800 px-1.5 py-0.5">
                {(res.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>

          {res.columns && (
            <div className="mt-2 flex flex-wrap gap-1">
              {res.columns.map((col) => (
                <span
                  key={col}
                  className="rounded bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400"
                >
                  {col}
                </span>
              ))}
            </div>
          )}

          {/* Data table preview */}
          {res.preview.length > 0 && res.columns && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr>
                    {res.columns.map((col) => (
                      <th
                        key={col}
                        className="border-b border-gray-800 px-2 py-1 text-left font-medium text-gray-400"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {res.preview.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {res.columns!.map((col) => (
                        <td
                          key={col}
                          className="border-b border-gray-800/50 px-2 py-1 text-gray-300"
                        >
                          {String(
                            (row as Record<string, unknown>)[col] ?? ""
                          ).slice(0, 50)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {res.preview.length > 5 && (
                <p className="mt-1 text-center text-[10px] text-gray-600">
                  ...and {res.rowCount - 5} more rows
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
