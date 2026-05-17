"use client";

import { useCallback, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface ChartExportProps {
  /**
   * Ref to the SVG element (or a container whose first `<svg>` child
   * should be exported).
   */
  svgRef: RefObject<SVGSVGElement | HTMLElement | null>;
  /** File name without extension (default "chart"). */
  fileName?: string;
  /** Device-pixel multiplier for hi-res output (default 2). */
  scale?: number;
  /** Button label (default "Export PNG"). */
  label?: string;
  /** Extra classes for the button. */
  className?: string;
}

/**
 * Renders a download button that exports the referenced SVG to a
 * high-resolution PNG via an off-screen <canvas>.
 */
export function ChartExport({
  svgRef,
  fileName = "chart",
  scale = 2,
  label = "Export PNG",
  className,
}: ChartExportProps) {
  const handleExport = useCallback(async () => {
    const el = svgRef.current;
    if (!el) return;

    const svg =
      el instanceof SVGSVGElement
        ? el
        : el.querySelector("svg");
    if (!svg) return;

    // Clone so we can inline computed styles without mutating the DOM.
    const clone = svg.cloneNode(true) as SVGSVGElement;

    // Make sure the clone has explicit dimensions.
    const bbox = svg.getBoundingClientRect();
    const w = bbox.width;
    const h = bbox.height;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));

    // Inline inherited styles for a self-contained SVG.
    inlineStyles(svg, clone);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(pngBlob);
        a.download = `${fileName}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = url;
  }, [svgRef, fileName, scale]);

  return (
    <button
      type="button"
      onClick={handleExport}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.08]",
        className,
      )}
    >
      {/* Download icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path d="M8 1a.75.75 0 0 1 .75.75v6.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V1.75A.75.75 0 0 1 8 1ZM2.75 10a.75.75 0 0 1 .75.75v1.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-1.5a.75.75 0 0 1 .75-.75Z" />
      </svg>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Recursively inline computed styles from `src` into `dest`. */
function inlineStyles(src: Element, dest: Element) {
  const srcChildren = src.children;
  const destChildren = dest.children;

  if (src instanceof SVGElement || src instanceof HTMLElement) {
    const computed = window.getComputedStyle(src);
    const important: string[] = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-dasharray",
      "stroke-linecap",
      "stroke-linejoin",
      "opacity",
      "font-family",
      "font-size",
      "font-weight",
      "text-anchor",
      "dominant-baseline",
    ];
    for (const prop of important) {
      (dest as SVGElement | HTMLElement).style.setProperty(
        prop,
        computed.getPropertyValue(prop),
      );
    }
  }

  for (let i = 0; i < srcChildren.length && i < destChildren.length; i++) {
    inlineStyles(srcChildren[i], destChildren[i]);
  }
}
