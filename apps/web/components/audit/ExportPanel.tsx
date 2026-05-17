"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ExportPanelProps {
  auditId: string;
}

interface ExportFormat {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "json",
    label: "JSON",
    description: "Machine-readable structured data with full probe details",
    extension: ".json",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
  },
  {
    id: "csv",
    label: "CSV",
    description: "Spreadsheet-compatible table format for analysis tools",
    extension: ".csv",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M21.375 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25-3.75c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25 0h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125" />
      </svg>
    ),
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Print-ready report with charts and formatted tables",
    extension: ".pdf",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: "latex",
    label: "LaTeX",
    description: "Academic paper-ready tables and figures for publication",
    extension: ".tex",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

export function ExportPanel({ auditId }: ExportPanelProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (format: ExportFormat) => {
      setDownloading(format.id);
      try {
        const url = `/api/audit/${auditId}/export?format=${format.id}`;
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error("Export failed");
        }

        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `audit-${auditId}${format.extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setDownloading(null);
      }
    },
    [auditId]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-sm font-semibold text-neutral-100">
        Export Results
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        Download audit data in your preferred format.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => handleDownload(format)}
            disabled={downloading !== null}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-4 text-center transition",
              "hover:border-white/20 hover:bg-white/[0.05]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              downloading === format.id && "border-chetana-500/30 bg-chetana-500/5"
            )}
          >
            <span
              className={cn(
                "text-neutral-400 transition group-hover:text-white",
                downloading === format.id && "animate-pulse text-chetana-400"
              )}
            >
              {format.icon}
            </span>
            <span className="text-sm font-medium text-neutral-200">
              {format.label}
            </span>

            {/* Tooltip on hover */}
            <span className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-neutral-300 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              {format.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
