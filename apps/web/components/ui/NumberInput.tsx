"use client";

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface NumberInputProps {
  /** Current value. */
  value: number;
  /** Called when value changes. */
  onChange: (value: number) => void;
  /** Minimum allowed value. */
  min?: number;
  /** Maximum allowed value. */
  max?: number;
  /** Step size for stepper buttons and arrow keys (default 1). */
  step?: number;
  /** Number of decimal places to display (default: auto). */
  precision?: number;
  /** Prefix shown before the number (e.g. "$"). */
  prefix?: string;
  /** Suffix shown after the number (e.g. "%"). */
  suffix?: string;
  /** Placeholder when empty. */
  placeholder?: string;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /** Whether to show stepper buttons (default true). */
  showSteppers?: boolean;
  /** Size variant. */
  size?: "sm" | "md" | "lg";
  /** Label. */
  label?: string;
  /** Error message. */
  error?: string;
  /** Additional class names for the outer wrapper. */
  className?: string;
  /** ID for the input element. */
  id?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function clamp(value: number, min?: number, max?: number): number {
  let clamped = value;
  if (min !== undefined && clamped < min) clamped = min;
  if (max !== undefined && clamped > max) clamped = max;
  return clamped;
}

function formatNumber(value: number, precision?: number): string {
  if (precision !== undefined) {
    return value.toFixed(precision);
  }
  return String(value);
}

function parseInput(raw: string): number | null {
  // Strip common formatting chars
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/* ------------------------------------------------------------------ */
/*  Size styles                                                       */
/* ------------------------------------------------------------------ */

const SIZE_STYLES = {
  sm: {
    input: "h-7 text-xs px-2",
    button: "h-7 w-6 text-xs",
    wrapper: "text-xs",
  },
  md: {
    input: "h-9 text-sm px-3",
    button: "h-9 w-8 text-sm",
    wrapper: "text-sm",
  },
  lg: {
    input: "h-11 text-base px-4",
    button: "h-11 w-10 text-base",
    wrapper: "text-base",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  precision,
  prefix,
  suffix,
  placeholder,
  disabled = false,
  showSteppers = true,
  size = "md",
  label,
  error,
  className,
  id,
}: NumberInputProps) {
  const [rawInput, setRawInput] = useState<string>(formatNumber(value, precision));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles = SIZE_STYLES[size];

  // Sync from prop when not focused
  useEffect(() => {
    if (!isFocused) {
      setRawInput(formatNumber(value, precision));
    }
  }, [value, precision, isFocused]);

  const commitValue = useCallback(
    (raw: string) => {
      const parsed = parseInput(raw);
      if (parsed !== null) {
        const clamped = clamp(parsed, min, max);
        onChange(clamped);
        setRawInput(formatNumber(clamped, precision));
      } else {
        // Revert to current value
        setRawInput(formatNumber(value, precision));
      }
    },
    [min, max, onChange, precision, value]
  );

  const stepValue = useCallback(
    (direction: 1 | -1) => {
      const next = clamp(value + step * direction, min, max);
      onChange(next);
    },
    [value, step, min, max, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        stepValue(1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        stepValue(-1);
      } else if (e.key === "Enter") {
        commitValue(rawInput);
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        setRawInput(formatNumber(value, precision));
        inputRef.current?.blur();
      }
    },
    [stepValue, commitValue, rawInput, value, precision]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow intermediate states: empty, negative sign, decimal point
      if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
        setRawInput(raw);
        return;
      }
      // Only allow valid numeric characters
      if (/^-?\d*\.?\d*$/.test(raw)) {
        setRawInput(raw);
      }
    },
    []
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    commitValue(rawInput);
  }, [commitValue, rawInput]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    inputRef.current?.select();
  }, []);

  // Long-press support for steppers
  const startHold = useCallback(
    (direction: 1 | -1) => {
      stepValue(direction);
      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => stepValue(direction), 80);
      }, 400);
    },
    [stepValue]
  );

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const isAtMin = min !== undefined && value <= min;
  const isAtMax = max !== undefined && value >= max;

  const inputId = id ?? (label ? `number-input-${label.replace(/\s/g, "-").toLowerCase()}` : undefined);

  return (
    <div className={cn("flex flex-col gap-1", styles.wrapper, className)}>
      {label && (
        <label htmlFor={inputId} className="text-white/70 font-medium">
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-center rounded border transition-colors",
          error
            ? "border-red-500/60"
            : isFocused
              ? "border-blue-500/60"
              : "border-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Decrement button */}
        {showSteppers && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || isAtMin}
            onMouseDown={() => !disabled && !isAtMin && startHold(-1)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            className={cn(
              "flex items-center justify-center border-r border-white/10 bg-white/5 text-white/60 transition-colors",
              "hover:bg-white/10 hover:text-white active:bg-white/15",
              (disabled || isAtMin) && "opacity-30 cursor-not-allowed hover:bg-white/5 hover:text-white/60",
              styles.button
            )}
            aria-label="Decrease"
          >
            -
          </button>
        )}

        {/* Prefix */}
        {prefix && (
          <span className="pl-2 text-white/40 select-none">{prefix}</span>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          value={rawInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-center text-white outline-none tabular-nums",
            "placeholder:text-white/30",
            styles.input
          )}
          role="spinbutton"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        />

        {/* Suffix */}
        {suffix && (
          <span className="pr-2 text-white/40 select-none">{suffix}</span>
        )}

        {/* Increment button */}
        {showSteppers && (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || isAtMax}
            onMouseDown={() => !disabled && !isAtMax && startHold(1)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            className={cn(
              "flex items-center justify-center border-l border-white/10 bg-white/5 text-white/60 transition-colors",
              "hover:bg-white/10 hover:text-white active:bg-white/15",
              (disabled || isAtMax) && "opacity-30 cursor-not-allowed hover:bg-white/5 hover:text-white/60",
              styles.button
            )}
            aria-label="Increase"
          >
            +
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}

      {/* Min/max hint */}
      {(min !== undefined || max !== undefined) && !error && (
        <span className="text-[10px] text-white/30">
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
              ? `Min: ${min}`
              : `Max: ${max}`}
        </span>
      )}
    </div>
  );
}
