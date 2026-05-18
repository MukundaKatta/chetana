/**
 * Accessibility audit checker with WCAG contrast validation,
 * ARIA completeness checks, keyboard nav validation,
 * screen reader compatibility helpers, and score report (Issue #378).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type WCAGLevel = "AA" | "AAA";

export type SeverityLevel = "error" | "warning" | "info";

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

export interface ARIAIssue {
  element: string;
  attribute: string;
  severity: SeverityLevel;
  message: string;
  suggestion: string;
}

export interface KeyboardIssue {
  element: string;
  issue: string;
  severity: SeverityLevel;
  suggestion: string;
}

export interface ScreenReaderIssue {
  element: string;
  issue: string;
  severity: SeverityLevel;
  suggestion: string;
}

export interface AccessibilityScoreReport {
  overallScore: number;
  contrastScore: number;
  ariaScore: number;
  keyboardScore: number;
  screenReaderScore: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: AccessibilityIssue[];
  summary: string;
}

export interface AccessibilityIssue {
  category: "contrast" | "aria" | "keyboard" | "screen-reader";
  severity: SeverityLevel;
  element: string;
  message: string;
  suggestion: string;
}

export interface ElementDescriptor {
  tag: string;
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  ariaHidden?: boolean;
  ariaExpanded?: boolean;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaLive?: string;
  tabIndex?: number;
  hasText?: boolean;
  children?: ElementDescriptor[];
  id?: string;
  className?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontWeight?: number;
  href?: string;
  type?: string;
  disabled?: boolean;
  alt?: string;
  title?: string;
}

/* ------------------------------------------------------------------ */
/*  Color contrast utilities                                          */
/* ------------------------------------------------------------------ */

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

function srgbToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/**
 * Compute WCAG 2.1 contrast ratio between two hex colors.
 */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate color contrast against WCAG criteria.
 */
export function validateContrast(
  foreground: string,
  background: string,
  fontSize?: number,
  fontWeight?: number,
): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  const isLargeText =
    (fontSize != null && fontSize >= 18) ||
    (fontSize != null && fontSize >= 14 && (fontWeight ?? 400) >= 700);

  return {
    foreground,
    background,
    ratio: Math.round(ratio * 100) / 100,
    passesAA: isLargeText ? ratio >= 3 : ratio >= 4.5,
    passesAAA: isLargeText ? ratio >= 4.5 : ratio >= 7,
    passesAALarge: ratio >= 3,
    passesAAALarge: ratio >= 4.5,
  };
}

/**
 * Suggest a foreground color that meets the given WCAG level
 * against the specified background.
 */
export function suggestAccessibleColor(
  background: string,
  level: WCAGLevel = "AA",
): string {
  const bgLum = relativeLuminance(background);
  const targetRatio = level === "AAA" ? 7 : 4.5;

  // Try white first
  const whiteLum = 1.0;
  const whiteRatio = (whiteLum + 0.05) / (bgLum + 0.05);
  if (whiteRatio >= targetRatio) return "#FFFFFF";

  // Try black
  const blackLum = 0.0;
  const blackRatio = (bgLum + 0.05) / (blackLum + 0.05);
  if (blackRatio >= targetRatio) return "#000000";

  // Fallback: return whichever has higher ratio
  return whiteRatio > blackRatio ? "#FFFFFF" : "#000000";
}

/* ------------------------------------------------------------------ */
/*  ARIA completeness checks                                          */
/* ------------------------------------------------------------------ */

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "tab",
  "menuitem",
  "switch",
  "slider",
  "textbox",
  "combobox",
  "listbox",
  "option",
  "treeitem",
]);

const LANDMARK_ROLES = new Set([
  "banner",
  "navigation",
  "main",
  "complementary",
  "contentinfo",
  "search",
  "form",
  "region",
]);

export function checkARIACompleteness(
  elements: ElementDescriptor[],
): ARIAIssue[] {
  const issues: ARIAIssue[] = [];

  for (const el of elements) {
    // Interactive elements need accessible names
    if (
      INTERACTIVE_ROLES.has(el.role ?? "") ||
      el.tag === "button" ||
      el.tag === "a"
    ) {
      if (!el.ariaLabel && !el.ariaLabelledBy && !el.hasText && !el.title) {
        issues.push({
          element: describeElement(el),
          attribute: "aria-label",
          severity: "error",
          message: `Interactive element <${el.tag}> missing accessible name`,
          suggestion: `Add aria-label, aria-labelledby, or visible text content`,
        });
      }
    }

    // Images need alt text
    if (el.tag === "img" && !el.alt && !el.ariaHidden) {
      issues.push({
        element: describeElement(el),
        attribute: "alt",
        severity: "error",
        message: "Image missing alt text",
        suggestion:
          'Add alt attribute with descriptive text, or alt="" for decorative images',
      });
    }

    // Form inputs need labels
    if (
      el.tag === "input" ||
      el.tag === "select" ||
      el.tag === "textarea"
    ) {
      if (!el.ariaLabel && !el.ariaLabelledBy && !el.title && !el.id) {
        issues.push({
          element: describeElement(el),
          attribute: "aria-label",
          severity: "error",
          message: `Form control <${el.tag}> missing accessible label`,
          suggestion:
            "Add aria-label, aria-labelledby, or associate with a <label> element",
        });
      }
    }

    // aria-expanded should be on disclosure controls
    if (
      (el.role === "button" || el.tag === "button") &&
      el.ariaExpanded === undefined
    ) {
      // Only flag if it has children that could be expandable (heuristic)
      if (el.children && el.children.length > 0) {
        issues.push({
          element: describeElement(el),
          attribute: "aria-expanded",
          severity: "info",
          message:
            "Button with children may need aria-expanded for disclosure pattern",
          suggestion: "Add aria-expanded if this button controls expandable content",
        });
      }
    }

    // Required form fields should declare aria-required
    if (
      (el.tag === "input" || el.tag === "select" || el.tag === "textarea") &&
      el.ariaRequired === undefined
    ) {
      issues.push({
        element: describeElement(el),
        attribute: "aria-required",
        severity: "info",
        message: "Form field may need aria-required for required fields",
        suggestion: "Add aria-required='true' if this field is required",
      });
    }

    // Region landmarks should have labels
    if (LANDMARK_ROLES.has(el.role ?? "") && el.role === "region") {
      if (!el.ariaLabel && !el.ariaLabelledBy) {
        issues.push({
          element: describeElement(el),
          attribute: "aria-label",
          severity: "warning",
          message: "Region landmark missing accessible name",
          suggestion: "Add aria-label or aria-labelledby to the region",
        });
      }
    }

    // Recurse into children
    if (el.children) {
      issues.push(...checkARIACompleteness(el.children));
    }
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/*  Keyboard navigation validation                                    */
/* ------------------------------------------------------------------ */

export function checkKeyboardNavigation(
  elements: ElementDescriptor[],
): KeyboardIssue[] {
  const issues: KeyboardIssue[] = [];
  let tabOrder = 0;

  for (const el of elements) {
    // Interactive elements should be focusable
    const isNativeInteractive =
      el.tag === "button" ||
      el.tag === "a" ||
      el.tag === "input" ||
      el.tag === "select" ||
      el.tag === "textarea";

    const hasInteractiveRole = INTERACTIVE_ROLES.has(el.role ?? "");

    if (hasInteractiveRole && !isNativeInteractive && el.tabIndex === undefined) {
      issues.push({
        element: describeElement(el),
        issue: "non-native-no-tabindex",
        severity: "error",
        suggestion: `Add tabIndex={0} to make this custom interactive element focusable`,
      });
    }

    // Positive tabindex is an anti-pattern
    if (el.tabIndex != null && el.tabIndex > 0) {
      issues.push({
        element: describeElement(el),
        issue: "positive-tabindex",
        severity: "warning",
        suggestion:
          "Avoid positive tabindex values; use DOM order for tab sequence instead",
      });
    }

    // Disabled elements shouldn't be tabbable (but should be discoverable)
    if (el.disabled && el.tabIndex != null && el.tabIndex >= 0) {
      issues.push({
        element: describeElement(el),
        issue: "disabled-tabbable",
        severity: "warning",
        suggestion:
          "Disabled elements with tabIndex >= 0 can confuse keyboard users",
      });
    }

    // Links without href
    if (el.tag === "a" && !el.href) {
      issues.push({
        element: describeElement(el),
        issue: "link-no-href",
        severity: "error",
        suggestion:
          "Links (<a>) should have an href. Use <button> for non-navigation actions",
      });
    }

    // Track tab order
    if (
      isNativeInteractive ||
      (el.tabIndex != null && el.tabIndex >= 0)
    ) {
      tabOrder++;
    }

    // Recurse
    if (el.children) {
      issues.push(...checkKeyboardNavigation(el.children));
    }
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/*  Screen reader compatibility                                       */
/* ------------------------------------------------------------------ */

export function checkScreenReaderCompat(
  elements: ElementDescriptor[],
): ScreenReaderIssue[] {
  const issues: ScreenReaderIssue[] = [];

  for (const el of elements) {
    // Hidden elements that contain important content
    if (el.ariaHidden && el.hasText) {
      issues.push({
        element: describeElement(el),
        issue: "hidden-with-content",
        severity: "warning",
        suggestion:
          "Element with aria-hidden='true' contains text that may be important",
      });
    }

    // Live regions should specify politeness
    if (el.ariaLive && el.ariaLive !== "polite" && el.ariaLive !== "assertive") {
      issues.push({
        element: describeElement(el),
        issue: "invalid-live-region",
        severity: "warning",
        suggestion: "aria-live should be 'polite' or 'assertive'",
      });
    }

    // Headings (heuristic: h1-h6)
    if (/^h[1-6]$/.test(el.tag) && !el.hasText && !el.ariaLabel) {
      issues.push({
        element: describeElement(el),
        issue: "empty-heading",
        severity: "error",
        suggestion: "Headings must have accessible text content",
      });
    }

    // Tables should have captions or descriptions
    if (el.tag === "table" && !el.ariaLabel && !el.ariaDescribedBy) {
      issues.push({
        element: describeElement(el),
        issue: "table-no-label",
        severity: "warning",
        suggestion:
          "Tables should have a caption or aria-label for screen readers",
      });
    }

    if (el.children) {
      issues.push(...checkScreenReaderCompat(el.children));
    }
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function describeElement(el: ElementDescriptor): string {
  let desc = `<${el.tag}`;
  if (el.role) desc += ` role="${el.role}"`;
  if (el.id) desc += ` id="${el.id}"`;
  if (el.className) desc += ` class="${el.className}"`;
  desc += ">";
  return desc;
}

/**
 * Generate SR-friendly label for an element, picking the best source.
 */
export function computeAccessibleName(el: ElementDescriptor): string | null {
  if (el.ariaLabel) return el.ariaLabel;
  if (el.title) return el.title;
  if (el.alt) return el.alt;
  if (el.hasText) return "[text content]";
  return null;
}

/**
 * Generate visually hidden CSS class for screen-reader-only text.
 */
export function srOnlyStyles(): Record<string, string> {
  return {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: "0",
  };
}

/**
 * Generate a skip-link target for keyboard navigation.
 */
export function createSkipLinkTarget(
  id: string,
  label: string,
): { id: string; "aria-label": string; tabIndex: number } {
  return {
    id,
    "aria-label": label,
    tabIndex: -1,
  };
}

/* ------------------------------------------------------------------ */
/*  Full audit and score report                                       */
/* ------------------------------------------------------------------ */

export interface AuditInput {
  elements: ElementDescriptor[];
  contrastPairs?: Array<{
    foreground: string;
    background: string;
    fontSize?: number;
    fontWeight?: number;
  }>;
  targetLevel?: WCAGLevel;
}

export function runAccessibilityAudit(input: AuditInput): AccessibilityScoreReport {
  const allIssues: AccessibilityIssue[] = [];
  const level = input.targetLevel ?? "AA";

  // Contrast checks
  const contrastIssues: AccessibilityIssue[] = [];
  if (input.contrastPairs) {
    for (const pair of input.contrastPairs) {
      const result = validateContrast(
        pair.foreground,
        pair.background,
        pair.fontSize,
        pair.fontWeight,
      );
      const passes = level === "AAA" ? result.passesAAA : result.passesAA;
      if (!passes) {
        contrastIssues.push({
          category: "contrast",
          severity: "error",
          element: `color ${pair.foreground} on ${pair.background}`,
          message: `Contrast ratio ${result.ratio}:1 fails WCAG ${level} (needs ${level === "AAA" ? "7" : "4.5"}:1)`,
          suggestion: `Use ${suggestAccessibleColor(pair.background, level)} for sufficient contrast`,
        });
      }
    }
  }

  // ARIA checks
  const ariaIssues = checkARIACompleteness(input.elements).map(
    (issue): AccessibilityIssue => ({
      category: "aria",
      severity: issue.severity,
      element: issue.element,
      message: issue.message,
      suggestion: issue.suggestion,
    }),
  );

  // Keyboard checks
  const kbIssues = checkKeyboardNavigation(input.elements).map(
    (issue): AccessibilityIssue => ({
      category: "keyboard",
      severity: issue.severity,
      element: issue.element,
      message: issue.issue,
      suggestion: issue.suggestion,
    }),
  );

  // Screen reader checks
  const srIssues = checkScreenReaderCompat(input.elements).map(
    (issue): AccessibilityIssue => ({
      category: "screen-reader",
      severity: issue.severity,
      element: issue.element,
      message: issue.issue,
      suggestion: issue.suggestion,
    }),
  );

  allIssues.push(...contrastIssues, ...ariaIssues, ...kbIssues, ...srIssues);

  // Scoring: start at 100, deduct per issue
  const deductions = { error: 15, warning: 5, info: 1 };
  const errors = allIssues.filter((i) => i.severity === "error").length;
  const warnings = allIssues.filter((i) => i.severity === "warning").length;
  const infos = allIssues.filter((i) => i.severity === "info").length;

  const totalDeduction =
    errors * deductions.error +
    warnings * deductions.warning +
    infos * deductions.info;

  const categoryScore = (issues: AccessibilityIssue[]): number => {
    const d =
      issues.filter((i) => i.severity === "error").length * deductions.error +
      issues.filter((i) => i.severity === "warning").length * deductions.warning +
      issues.filter((i) => i.severity === "info").length * deductions.info;
    return Math.max(0, Math.min(100, 100 - d));
  };

  const overallScore = Math.max(0, Math.min(100, 100 - totalDeduction));

  const summary = [
    `Accessibility Audit Report (WCAG ${level})`,
    `Overall Score: ${overallScore}/100`,
    `Issues: ${errors} errors, ${warnings} warnings, ${infos} info`,
    errors > 0
      ? `Critical: ${errors} error(s) must be fixed for compliance`
      : "No critical errors found",
  ].join("\n");

  return {
    overallScore,
    contrastScore: categoryScore(contrastIssues),
    ariaScore: categoryScore(ariaIssues),
    keyboardScore: categoryScore(kbIssues),
    screenReaderScore: categoryScore(srIssues),
    totalIssues: allIssues.length,
    errors,
    warnings,
    infos,
    issues: allIssues,
    summary,
  };
}
