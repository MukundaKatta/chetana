/**
 * Image optimisation utilities — blur placeholders, responsive srcset
 * generation, and priority loading detection for Next.js Image.
 */

export interface ImageOptions {
  /** Desired display width in pixels. */
  width?: number;
  /** Desired display height in pixels. */
  height?: number;
  /** Image quality 1–100 (default: 75). */
  quality?: number;
  /** Whether this image is above the fold / LCP candidate. */
  priority?: boolean;
  /** Responsive widths for srcset (defaults to common breakpoints). */
  breakpoints?: number[];
  /** Optional alt text passthrough. */
  alt?: string;
}

export interface OptimizedImageProps {
  src: string;
  srcSet: string;
  sizes: string;
  width?: number;
  height?: number;
  loading: "eager" | "lazy";
  decoding: "sync" | "async";
  fetchPriority: "high" | "auto";
  /** Tiny inline blur placeholder data URI. */
  blurDataURL: string;
  alt: string;
}

/** Default responsive breakpoints. */
const DEFAULT_BREAKPOINTS = [320, 640, 768, 1024, 1280, 1536, 1920];

/**
 * Generate a tiny inline SVG blur placeholder data URI.
 * This produces a ~200-byte SVG that can be inlined as a CSS background
 * while the real image loads.
 */
export function generateBlurPlaceholder(
  width = 8,
  height = 8,
  color = "#94a3b8"
): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    `<filter id="b"><feGaussianBlur stdDeviation="2"/></filter>`,
    `<rect width="100%" height="100%" fill="${color}" filter="url(#b)"/>`,
    `</svg>`,
  ].join("");

  // btoa is available in both browser and Node 16+
  if (typeof btoa === "function") {
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Build a responsive `srcset` string for a given source URL using
 * Next.js Image Optimization URL format.
 */
export function buildSrcSet(
  src: string,
  breakpoints: number[] = DEFAULT_BREAKPOINTS,
  quality = 75
): string {
  return breakpoints
    .map((w) => {
      const optimizedUrl = `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
      return `${optimizedUrl} ${w}w`;
    })
    .join(", ");
}

/**
 * Build a `sizes` attribute string from breakpoints.
 */
function buildSizes(breakpoints: number[]): string {
  const sorted = [...breakpoints].sort((a, b) => a - b);

  // Generate (max-width: Xpx) Xpx entries, with the largest as the fallback
  const parts = sorted.slice(0, -1).map((bp) => `(max-width: ${bp}px) ${bp}px`);
  parts.push(`${sorted[sorted.length - 1]}px`);

  return parts.join(", ");
}

/**
 * Detect whether an image should be loaded eagerly (above the fold).
 * Heuristic: if it has explicit priority flag or is "small" (hero-sized).
 */
function detectPriority(options: ImageOptions): boolean {
  if (options.priority !== undefined) return options.priority;
  // Conservative default: lazy-load unless told otherwise
  return false;
}

/**
 * Compute optimised image props suitable for spreading onto an `<img>` or
 * Next.js `<Image>` element.
 *
 * @param src - Original image URL or path
 * @param options - Sizing, quality, and priority options
 * @returns Props object ready to spread onto an image element
 *
 * @example
 * ```tsx
 * const props = optimizeImageProps("/hero.jpg", {
 *   width: 1200,
 *   height: 600,
 *   priority: true,
 *   alt: "Hero banner",
 * });
 * return <img {...props} />;
 * ```
 */
export function optimizeImageProps(
  src: string,
  options: ImageOptions = {}
): OptimizedImageProps {
  const breakpoints = options.breakpoints ?? DEFAULT_BREAKPOINTS;
  const quality = options.quality ?? 75;
  const isPriority = detectPriority(options);

  return {
    src,
    srcSet: buildSrcSet(src, breakpoints, quality),
    sizes: buildSizes(breakpoints),
    width: options.width,
    height: options.height,
    loading: isPriority ? "eager" : "lazy",
    decoding: isPriority ? "sync" : "async",
    fetchPriority: isPriority ? "high" : "auto",
    blurDataURL: generateBlurPlaceholder(),
    alt: options.alt ?? "",
  };
}
