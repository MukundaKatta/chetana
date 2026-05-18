/**
 * Color contrast checking utilities (Issue #352).
 * WCAG 2.1 contrast-ratio helpers and a pre-checked accessible palette
 * for the Chetana UI.
 */

// ---------------------------------------------------------------------------
// Hex ↔ sRGB helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(full, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts an 8-bit sRGB channel value to its linear-light equivalent
 * per WCAG 2.1 relative luminance definition.
 */
function srgbToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Computes the relative luminance of an sRGB color.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

// ---------------------------------------------------------------------------
// Contrast ratio
// ---------------------------------------------------------------------------

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colours.
 * Always returns a value >= 1.
 *
 * @param fg - Foreground colour in hex (e.g. `"#ffffff"`).
 * @param bg - Background colour in hex.
 */
export function getContrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// WCAG compliance checks
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the colour pair meets WCAG **AA** requirements.
 *
 * - Normal text (< 18pt / < 14pt bold): contrast >= 4.5:1
 * - Large text (>= 18pt / >= 14pt bold): contrast >= 3:1
 */
export function meetsWCAG_AA(
  fg: string,
  bg: string,
  size: "normal" | "large" = "normal"
): boolean {
  const ratio = getContrastRatio(fg, bg);
  return size === "large" ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Returns `true` when the colour pair meets WCAG **AAA** requirements.
 *
 * - Normal text: contrast >= 7:1
 * - Large text: contrast >= 4.5:1
 */
export function meetsWCAG_AAA(
  fg: string,
  bg: string,
  size: "normal" | "large" = "normal"
): boolean {
  const ratio = getContrastRatio(fg, bg);
  return size === "large" ? ratio >= 4.5 : ratio >= 7;
}

// ---------------------------------------------------------------------------
// Accessible colour suggestion
// ---------------------------------------------------------------------------

/**
 * Given a background colour and a target contrast ratio, returns a
 * foreground hex colour (white or black variant) that meets the ratio.
 *
 * The algorithm first checks pure white and pure black, then nudges the
 * brightness towards the target if neither extreme satisfies it on its
 * own (which is rare for standard ratios like 4.5 or 7).
 */
export function suggestAccessibleColor(
  bg: string,
  targetRatio: number = 4.5
): string {
  // Try the extremes first — they almost always work for standard ratios.
  if (getContrastRatio("#ffffff", bg) >= targetRatio) return "#ffffff";
  if (getContrastRatio("#000000", bg) >= targetRatio) return "#000000";

  // Binary-search a grey that meets the target against the background.
  const bgLum = relativeLuminance(bg);
  let lo = 0;
  let hi = 255;

  // Decide search direction: if bg is dark we want a lighter fg and vice-versa.
  const needLighter = bgLum < 0.5;

  for (let i = 0; i < 32; i++) {
    const mid = Math.round((lo + hi) / 2);
    const candidate = rgbToHex(mid, mid, mid);
    const ratio = getContrastRatio(candidate, bg);

    if (ratio >= targetRatio) {
      // Candidate passes — try to move it closer to the background
      // (i.e. less extreme) to find the "closest passing" colour.
      if (needLighter) lo = mid;
      else hi = mid;
    } else {
      // Candidate fails — move away from background.
      if (needLighter) hi = mid;
      else lo = mid;
    }
  }

  const final = needLighter ? hi : lo;
  return rgbToHex(final, final, final);
}

// ---------------------------------------------------------------------------
// Pre-checked accessible palette
// ---------------------------------------------------------------------------

/**
 * Pre-verified colour combinations for the Chetana app.
 * Every pair meets WCAG AA for normal-sized text (>= 4.5:1).
 */
export const ACCESSIBLE_PALETTE = {
  /** Dark backgrounds with light foreground text. */
  dark: {
    bg: "#0a0a0f",
    text: "#e5e5e5",
    muted: "#a3a3a3",
    primary: "#60a5fa",
    success: "#4ade80",
    warning: "#fbbf24",
    error: "#f87171",
  },
  /** Light backgrounds with dark foreground text. */
  light: {
    bg: "#fafafa",
    text: "#171717",
    muted: "#525252",
    primary: "#2563eb",
    success: "#15803d",
    warning: "#a16207",
    error: "#dc2626",
  },
  /** Consciousness-score-specific colours (on dark bg #0a0a0f). */
  scores: {
    low: { fg: "#f87171", bg: "#0a0a0f" },
    mid: { fg: "#fbbf24", bg: "#0a0a0f" },
    high: { fg: "#4ade80", bg: "#0a0a0f" },
  },
} as const;

// ---------------------------------------------------------------------------
// Dev-mode audit utility
// ---------------------------------------------------------------------------

/**
 * Audits the colour contrast of a DOM element and its descendants.
 * Logs warnings to the console for any text that fails WCAG AA.
 *
 * **Only intended for development use.**
 *
 * @param element - The root element to audit.
 */
export function auditColorContrast(element: HTMLElement): void {
  if (process.env.NODE_ENV !== "development") return;

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node: Node | null;
  const warnings: string[] = [];

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;

    const style = getComputedStyle(parent);
    const fg = style.color;
    const bg = getEffectiveBackground(parent);

    if (!fg || !bg) continue;

    const fgHex = cssColorToHex(fg);
    const bgHex = cssColorToHex(bg);
    if (!fgHex || !bgHex) continue;

    const ratio = getContrastRatio(fgHex, bgHex);
    const fontSize = parseFloat(style.fontSize);
    const isBold = parseInt(style.fontWeight, 10) >= 700;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && isBold);

    const threshold = isLarge ? 3 : 4.5;

    if (ratio < threshold) {
      const text = (node.textContent ?? "").trim().slice(0, 40);
      warnings.push(
        `[contrast ${ratio.toFixed(2)}:1] "${text}" — ${fgHex} on ${bgHex} (needs ${threshold}:1)`
      );
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `[color-contrast] ${warnings.length} issue(s) found:`,
      "\n" + warnings.join("\n")
    );
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEffectiveBackground(el: HTMLElement): string | null {
  let current: HTMLElement | null = el;

  while (current) {
    const bg = getComputedStyle(current).backgroundColor;

    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      return bg;
    }

    current = current.parentElement;
  }

  // Fallback: assume white background
  return "rgb(255, 255, 255)";
}

function cssColorToHex(css: string): string | null {
  const rgbMatch = css.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
  );
  if (!rgbMatch) return null;

  return rgbToHex(
    parseInt(rgbMatch[1], 10),
    parseInt(rgbMatch[2], 10),
    parseInt(rgbMatch[3], 10)
  );
}
