"use client";

import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Print-friendly styles and print button (Issue #254).
 * Injects @media print CSS and provides a PrintButton component.
 */

/**
 * Global print stylesheet.
 * Render this once at the layout level (e.g. in the dashboard layout).
 *
 * Usage:
 * ```tsx
 * <PrintStyles />
 * ```
 */
export function PrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media print {
  /* Hide non-essential UI */
  nav,
  aside,
  [data-print-hide],
  .no-print,
  button:not([data-print-keep]),
  [role="toolbar"],
  [role="navigation"] {
    display: none !important;
  }

  /* Reset backgrounds for readability */
  body {
    background: white !important;
    color: black !important;
    font-size: 12pt !important;
  }

  /* Remove fixed positioning */
  .fixed,
  .sticky {
    position: static !important;
  }

  /* Ensure full width */
  main, .ml-64 {
    margin-left: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
  }

  /* Page break management */
  h1, h2, h3, h4 {
    page-break-after: avoid;
    break-after: avoid;
    color: black !important;
  }

  table, figure, .chart-container {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Ensure visible borders in tables */
  table {
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ccc !important;
    padding: 6px 10px !important;
    color: black !important;
  }

  /* Readable links */
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }
  a[href^="#"]::after,
  a[href^="javascript"]::after {
    content: "";
  }

  /* Fix dark mode backgrounds */
  .bg-gray-900,
  .bg-gray-950,
  [class*="bg-white/"] {
    background: white !important;
  }

  /* Fix text colors */
  [class*="text-white"],
  [class*="text-gray-"],
  [class*="text-neutral-"] {
    color: black !important;
  }

  /* Score cards */
  .rounded-xl {
    border: 1px solid #ddd !important;
    background: white !important;
  }

  /* Page margins */
  @page {
    margin: 1.5cm;
  }

  /* Print-specific show elements */
  [data-print-show] {
    display: block !important;
  }
}
`,
      }}
    />
  );
}

/**
 * Print button that triggers window.print().
 */
export function PrintButton({
  label = "Print Report",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={() => window.print()}
      className={cn(
        "no-print inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
        className
      )}
      data-print-hide
      aria-label={label}
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}

/**
 * Wrapper that hides its children when printing.
 */
export function NoPrint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("no-print", className)} data-print-hide>
      {children}
    </div>
  );
}

/**
 * Wrapper that only shows its children when printing.
 */
export function PrintOnly({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden", className)} data-print-show>
      {children}
    </div>
  );
}
