import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function getScoreColor(score: number): string {
  if (score < 0.3) return "text-consciousness-low";
  if (score < 0.6) return "text-consciousness-mid";
  return "text-consciousness-high";
}

export function getScoreBgColor(score: number): string {
  if (score < 0.3) return "bg-consciousness-low";
  if (score < 0.6) return "bg-consciousness-mid";
  return "bg-consciousness-high";
}

export function getTheoryColor(theory: string): string {
  const colors: Record<string, string> = {
    gwt: "var(--color-theory-gwt)",
    iit: "var(--color-theory-iit)",
    hot: "var(--color-theory-hot)",
    rpt: "var(--color-theory-rpt)",
    pp: "var(--color-theory-pp)",
    ast: "var(--color-theory-ast)",
  };
  return colors[theory] || "#888";
}
