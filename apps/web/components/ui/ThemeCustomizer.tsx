"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import {
  Palette,
  Download,
  Upload,
  Save,
  RotateCcw,
  Check,
  Copy,
  Sun,
  Moon,
  Eye,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface ThemeColors {
  primary: HSLColor;
  secondary: HSLColor;
  accent: HSLColor;
  background: HSLColor;
  foreground: HSLColor;
  muted: HSLColor;
  destructive: HSLColor;
  border: HSLColor;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  isDark: boolean;
  createdAt: string;
}

export interface ThemeCustomizerProps {
  /** Current theme. */
  initialTheme?: Partial<ThemeColors>;
  /** List of saved themes. */
  savedThemes?: CustomTheme[];
  /** Called when the theme changes (live preview). */
  onThemeChange?: (colors: ThemeColors) => void;
  /** Called when a theme is saved. */
  onSave?: (theme: CustomTheme) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Default theme                                                     */
/* ------------------------------------------------------------------ */

const DEFAULT_LIGHT_THEME: ThemeColors = {
  primary: { h: 222, s: 47, l: 51 },
  secondary: { h: 210, s: 40, l: 96 },
  accent: { h: 210, s: 40, l: 96 },
  background: { h: 0, s: 0, l: 100 },
  foreground: { h: 222, s: 47, l: 11 },
  muted: { h: 210, s: 40, l: 96 },
  destructive: { h: 0, s: 84, l: 60 },
  border: { h: 214, s: 32, l: 91 },
};

const DEFAULT_DARK_THEME: ThemeColors = {
  primary: { h: 210, s: 40, l: 68 },
  secondary: { h: 217, s: 33, l: 17 },
  accent: { h: 217, s: 33, l: 17 },
  background: { h: 222, s: 47, l: 6 },
  foreground: { h: 210, s: 40, l: 98 },
  muted: { h: 217, s: 33, l: 17 },
  destructive: { h: 0, s: 62, l: 50 },
  border: { h: 217, s: 33, l: 17 },
};

/* ------------------------------------------------------------------ */
/*  Color helpers                                                     */
/* ------------------------------------------------------------------ */

function hslToString(c: HSLColor): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

function hslToHex(c: HSLColor): string {
  const h = c.h / 360;
  const s = c.s / 100;
  const l = c.l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Relative luminance (WCAG). */
function relativeLuminance(c: HSLColor): number {
  const hex = hslToHex(c);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio. */
function contrastRatio(c1: HSLColor, c2: HSLColor): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check WCAG AA compliance (4.5:1 for normal text). */
function isAccessible(
  fg: HSLColor,
  bg: HSLColor,
  level: "AA" | "AAA" = "AA",
): boolean {
  const ratio = contrastRatio(fg, bg);
  return level === "AA" ? ratio >= 4.5 : ratio >= 7;
}

/** Auto-adjust lightness to meet WCAG AA against a background. */
function makeAccessible(fg: HSLColor, bg: HSLColor): HSLColor {
  const adjusted = { ...fg };
  const bgLum = relativeLuminance(bg);

  // Try adjusting lightness
  for (let attempt = 0; attempt < 50; attempt++) {
    if (isAccessible(adjusted, bg)) return adjusted;
    if (bgLum > 0.5) {
      // Dark text on light bg: decrease lightness
      adjusted.l = Math.max(0, adjusted.l - 2);
    } else {
      // Light text on dark bg: increase lightness
      adjusted.l = Math.min(100, adjusted.l + 2);
    }
  }
  return adjusted;
}

/** Generate an accessible palette from a primary colour. */
export function generateAccessiblePalette(
  primary: HSLColor,
  isDark: boolean,
): ThemeColors {
  const base = isDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  const bg = base.background;
  const fg = base.foreground;

  return {
    primary: makeAccessible(primary, bg),
    secondary: {
      h: primary.h,
      s: Math.max(10, primary.s - 30),
      l: isDark ? 17 : 96,
    },
    accent: {
      h: (primary.h + 30) % 360,
      s: Math.max(10, primary.s - 10),
      l: isDark ? 17 : 96,
    },
    background: bg,
    foreground: fg,
    muted: {
      h: primary.h,
      s: Math.max(5, primary.s - 35),
      l: isDark ? 17 : 96,
    },
    destructive: makeAccessible(base.destructive, bg),
    border: {
      h: primary.h,
      s: Math.max(5, primary.s - 15),
      l: isDark ? 17 : 91,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  HSL Picker sub-component                                          */
/* ------------------------------------------------------------------ */

function HSLPicker({
  label,
  color,
  onChange,
}: {
  label: string;
  color: HSLColor;
  onChange: (c: HSLColor) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium capitalize">{label}</span>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-8 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: hslToString(color) }}
          />
          <span className="text-[10px] tabular-nums text-gray-500">
            {hslToHex(color)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[10px] text-gray-500">H</span>
          <input
            type="range"
            min={0}
            max={360}
            value={color.h}
            onChange={(e) =>
              onChange({ ...color, h: parseInt(e.target.value, 10) })
            }
            className="h-1.5 w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(0,${color.s}%,${color.l}%), hsl(60,${color.s}%,${color.l}%), hsl(120,${color.s}%,${color.l}%), hsl(180,${color.s}%,${color.l}%), hsl(240,${color.s}%,${color.l}%), hsl(300,${color.s}%,${color.l}%), hsl(360,${color.s}%,${color.l}%))`,
            }}
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] text-gray-500">S</span>
          <input
            type="range"
            min={0}
            max={100}
            value={color.s}
            onChange={(e) =>
              onChange({ ...color, s: parseInt(e.target.value, 10) })
            }
            className="h-1.5 w-full cursor-pointer"
          />
        </label>
        <label className="space-y-0.5">
          <span className="text-[10px] text-gray-500">L</span>
          <input
            type="range"
            min={0}
            max={100}
            value={color.l}
            onChange={(e) =>
              onChange({ ...color, l: parseInt(e.target.value, 10) })
            }
            className="h-1.5 w-full cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function ThemeCustomizer({
  initialTheme,
  savedThemes = [],
  onThemeChange,
  onSave,
  className,
}: ThemeCustomizerProps) {
  const [isDark, setIsDark] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(() => ({
    ...DEFAULT_LIGHT_THEME,
    ...initialTheme,
  }));
  const [themeName, setThemeName] = useState("");

  const colorKeys = Object.keys(colors) as (keyof ThemeColors)[];

  /* ---- Update a single colour ---- */
  const updateColor = useCallback(
    (key: keyof ThemeColors, value: HSLColor) => {
      setColors((prev) => {
        const next = { ...prev, [key]: value };
        onThemeChange?.(next);
        return next;
      });
    },
    [onThemeChange],
  );

  /* ---- Auto-generate accessible palette ---- */
  const autoGenerate = useCallback(() => {
    const palette = generateAccessiblePalette(colors.primary, isDark);
    setColors(palette);
    onThemeChange?.(palette);
  }, [colors.primary, isDark, onThemeChange]);

  /* ---- Toggle dark/light ---- */
  const toggleMode = useCallback(() => {
    const newDark = !isDark;
    setIsDark(newDark);
    const base = newDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
    const merged = { ...base, primary: colors.primary };
    setColors(merged);
    onThemeChange?.(merged);
  }, [isDark, colors.primary, onThemeChange]);

  /* ---- Reset ---- */
  const reset = useCallback(() => {
    const base = isDark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
    setColors(base);
    onThemeChange?.(base);
  }, [isDark, onThemeChange]);

  /* ---- Save ---- */
  const handleSave = useCallback(() => {
    if (!themeName.trim()) return;
    const theme: CustomTheme = {
      id: `theme_${Date.now().toString(36)}`,
      name: themeName.trim(),
      colors: structuredClone(colors),
      isDark,
      createdAt: new Date().toISOString(),
    };
    onSave?.(theme);
    setThemeName("");
  }, [colors, isDark, themeName, onSave]);

  /* ---- Export / Import ---- */
  const exportTheme = useCallback(() => {
    const data = JSON.stringify({ colors, isDark }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [colors, isDark]);

  const importTheme = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed.colors) {
          setColors(parsed.colors);
          if (typeof parsed.isDark === "boolean") {
            setIsDark(parsed.isDark);
          }
          onThemeChange?.(parsed.colors);
        }
      } catch {
        // Invalid file
      }
    };
    input.click();
  }, [onThemeChange]);

  /* ---- Contrast checks ---- */
  const contrastInfo = useMemo(() => {
    const ratio = contrastRatio(colors.foreground, colors.background);
    const passAA = ratio >= 4.5;
    const passAAA = ratio >= 7;
    return { ratio, passAA, passAAA };
  }, [colors.foreground, colors.background]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Palette className="h-4 w-4" /> Theme Customizer
        </h3>
        <button
          onClick={toggleMode}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          {isDark ? (
            <>
              <Moon className="h-3.5 w-3.5" /> Dark
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5" /> Light
            </>
          )}
        </button>
      </div>

      {/* Live preview swatch */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: hslToString(colors.background),
          borderColor: hslToString(colors.border),
        }}
      >
        <p
          className="text-sm font-semibold"
          style={{ color: hslToString(colors.foreground) }}
        >
          Preview text
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: hslToString(colors.foreground) }}
        >
          This shows how your theme looks in practice.
        </p>
        <div className="mt-2 flex gap-2">
          <span
            className="rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: hslToString(colors.primary) }}
          >
            Primary
          </span>
          <span
            className="rounded border px-2 py-0.5 text-xs"
            style={{
              borderColor: hslToString(colors.border),
              backgroundColor: hslToString(colors.secondary),
              color: hslToString(colors.foreground),
            }}
          >
            Secondary
          </span>
          <span
            className="rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: hslToString(colors.destructive) }}
          >
            Destructive
          </span>
        </div>
      </div>

      {/* Contrast indicator */}
      <div className="flex items-center gap-2 text-xs">
        <Eye className="h-3.5 w-3.5 text-gray-500" />
        <span>
          Contrast: <strong>{contrastInfo.ratio.toFixed(2)}:1</strong>
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold",
            contrastInfo.passAA
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
          )}
        >
          {contrastInfo.passAAA ? "AAA" : contrastInfo.passAA ? "AA" : "FAIL"}
        </span>
      </div>

      {/* Color pickers */}
      <div className="space-y-3">
        {colorKeys.map((key) => (
          <HSLPicker
            key={key}
            label={key}
            color={colors[key]}
            onChange={(c) => updateColor(key, c)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={autoGenerate}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          <Palette className="h-3.5 w-3.5" /> Auto-generate
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        <button
          onClick={exportTheme}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <button
          onClick={importTheme}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <Upload className="h-3.5 w-3.5" /> Import
        </button>
      </div>

      {/* Save as theme */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          placeholder="Theme name..."
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          onClick={handleSave}
          disabled={!themeName.trim()}
          className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>

      {/* Saved themes */}
      {savedThemes.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-gray-500">Saved Themes</h4>
          <div className="flex flex-wrap gap-2">
            {savedThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setColors(theme.colors);
                  setIsDark(theme.isDark);
                  onThemeChange?.(theme.colors);
                }}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1 text-xs transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: hslToString(theme.colors.primary),
                  }}
                />
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeCustomizer;
