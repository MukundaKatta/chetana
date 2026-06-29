import { cn } from "@/lib/utils";

/**
 * Accessible circular score ring for a 0-1 value. Server-renderable (pure SVG),
 * color-graded by score, with an accessible label.
 */
export interface ScoreRingProps {
  value: number; // 0-1
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function gradeColor(v: number): string {
  if (v >= 0.66) return "#34d399"; // emerald
  if (v >= 0.4) return "#fbbf24"; // amber
  return "#f87171"; // red
}

export function ScoreRing({ value, label, size = 96, strokeWidth = 8, className }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * clamped;
  const color = gradeColor(clamped);
  const pct = Math.round(clamped * 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`${label ? label + ": " : ""}${pct}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-white">{pct}%</span>
        {label && <span className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">{label}</span>}
      </div>
    </div>
  );
}
