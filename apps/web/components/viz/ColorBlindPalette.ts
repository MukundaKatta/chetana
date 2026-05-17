/**
 * Color-blind friendly palettes for visualization components.
 *
 * Wong palette: optimized for the most common forms of color-vision
 * deficiency (deuteranopia / protanopia).
 *
 * High-contrast palette: maximises luminance differences for
 * environments with poor contrast (projectors, e-ink, etc.).
 */

export type PaletteType = "wong" | "highContrast";

export type Theory = "gwt" | "iit" | "hot" | "rpt" | "pp" | "ast";

/** Wong (2011) palette – safe for ~99 % of color-blind viewers. */
export const WONG_PALETTE = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
  "#000000", // black
] as const;

/** High-contrast palette using pure luminance separation. */
export const HIGH_CONTRAST_PALETTE = [
  "#FFFFFF", // white
  "#FFD700", // gold
  "#00BFFF", // deep sky blue
  "#FF4500", // orange-red
  "#32CD32", // lime green
  "#FF69B4", // hot pink
  "#8A2BE2", // blue violet
  "#000000", // black
] as const;

const THEORY_INDEX: Record<Theory, number> = {
  gwt: 0,
  iit: 1,
  hot: 2,
  rpt: 3,
  pp: 4,
  ast: 5,
};

/**
 * Return a color for the given theory from the requested palette.
 *
 * @param theory  - one of the six consciousness theories
 * @param palette - "wong" (default) or "highContrast"
 */
export function getTheoryColor(
  theory: Theory,
  palette: PaletteType = "wong",
): string {
  const idx = THEORY_INDEX[theory] ?? 0;
  const colors =
    palette === "highContrast" ? HIGH_CONTRAST_PALETTE : WONG_PALETTE;
  return colors[idx % colors.length];
}

/** Convenience: return the full six-color array for the chosen palette. */
export function getTheoryPalette(palette: PaletteType = "wong"): string[] {
  const colors =
    palette === "highContrast" ? HIGH_CONTRAST_PALETTE : WONG_PALETTE;
  return (Object.keys(THEORY_INDEX) as Theory[]).map(
    (t) => colors[THEORY_INDEX[t] % colors.length],
  );
}

/** All six theory keys in canonical order. */
export const THEORIES: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

/** Human-readable labels. */
export const THEORY_LABELS: Record<Theory, string> = {
  gwt: "Global Workspace Theory",
  iit: "Integrated Information Theory",
  hot: "Higher-Order Theories",
  rpt: "Recurrent Processing Theory",
  pp: "Predictive Processing",
  ast: "Attention Schema Theory",
};

/** Short labels for tight spaces. */
export const THEORY_SHORT_LABELS: Record<Theory, string> = {
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};
