"use client";

/**
 * Issue #423 - Animated page transitions
 *
 * Fade/slide transitions for nav, shared element transitions,
 * reduced motion support, configurable duration/easing, exit animations.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TransitionVariant =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "scale"
  | "none";

export type TransitionPhase = "enter" | "active" | "exit" | "idle";

export type EasingFunction =
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "linear"
  | string;

export interface TransitionConfig {
  variant: TransitionVariant;
  duration: number;
  easing: EasingFunction;
  exitDuration?: number;
  exitEasing?: EasingFunction;
  delay?: number;
}

export interface PageTransitionProps {
  children: ReactNode;
  /** Unique key to trigger transition (e.g. route path). */
  transitionKey: string;
  /** Transition variant. */
  variant?: TransitionVariant;
  /** Enter duration in ms. */
  duration?: number;
  /** Exit duration in ms. */
  exitDuration?: number;
  /** Easing function. */
  easing?: EasingFunction;
  /** Exit easing function. */
  exitEasing?: EasingFunction;
  /** Delay before enter in ms. */
  delay?: number;
  /** Respect prefers-reduced-motion. */
  respectReducedMotion?: boolean;
  /** Callback when enter transition completes. */
  onEnterComplete?: () => void;
  /** Callback when exit transition completes. */
  onExitComplete?: () => void;
  className?: string;
}

export interface SharedElementProps {
  /** Unique ID for shared element matching. */
  layoutId: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_DURATION = 300;
const DEFAULT_EASING: EasingFunction = "ease-in-out";

const VARIANT_STYLES: Record<TransitionVariant, { enter: CSSProperties; active: CSSProperties; exit: CSSProperties }> = {
  fade: {
    enter: { opacity: 0 },
    active: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-left": {
    enter: { opacity: 0, transform: "translateX(20px)" },
    active: { opacity: 1, transform: "translateX(0)" },
    exit: { opacity: 0, transform: "translateX(-20px)" },
  },
  "slide-right": {
    enter: { opacity: 0, transform: "translateX(-20px)" },
    active: { opacity: 1, transform: "translateX(0)" },
    exit: { opacity: 0, transform: "translateX(20px)" },
  },
  "slide-up": {
    enter: { opacity: 0, transform: "translateY(20px)" },
    active: { opacity: 1, transform: "translateY(0)" },
    exit: { opacity: 0, transform: "translateY(-20px)" },
  },
  "slide-down": {
    enter: { opacity: 0, transform: "translateY(-20px)" },
    active: { opacity: 1, transform: "translateY(0)" },
    exit: { opacity: 0, transform: "translateY(20px)" },
  },
  scale: {
    enter: { opacity: 0, transform: "scale(0.95)" },
    active: { opacity: 1, transform: "scale(1)" },
    exit: { opacity: 0, transform: "scale(0.95)" },
  },
  none: {
    enter: {},
    active: {},
    exit: {},
  },
};

/* ------------------------------------------------------------------ */
/*  Reduced Motion Hook                                               */
/* ------------------------------------------------------------------ */

function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

/* ------------------------------------------------------------------ */
/*  Shared Element Context                                            */
/* ------------------------------------------------------------------ */

interface SharedElementEntry {
  layoutId: string;
  rect: DOMRect;
}

interface SharedElementContextValue {
  register: (layoutId: string, rect: DOMRect) => void;
  getRect: (layoutId: string) => DOMRect | null;
}

const SharedElementContext = createContext<SharedElementContextValue>({
  register: () => {},
  getRect: () => null,
});

export function SharedElementProvider({ children }: { children: ReactNode }) {
  const entriesRef = useRef<Map<string, SharedElementEntry>>(new Map());

  const register = useCallback((layoutId: string, rect: DOMRect) => {
    entriesRef.current.set(layoutId, { layoutId, rect });
  }, []);

  const getRect = useCallback((layoutId: string): DOMRect | null => {
    return entriesRef.current.get(layoutId)?.rect ?? null;
  }, []);

  return (
    <SharedElementContext.Provider value={{ register, getRect }}>
      {children}
    </SharedElementContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared Element Component                                          */
/* ------------------------------------------------------------------ */

export function SharedElement({ layoutId, children, className, style }: SharedElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { register, getRect } = useContext(SharedElementContext);
  const [animStyle, setAnimStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const currentRect = el.getBoundingClientRect();
    const prevRect = getRect(layoutId);

    if (prevRect) {
      const dx = prevRect.x - currentRect.x;
      const dy = prevRect.y - currentRect.y;
      const sw = prevRect.width / currentRect.width;
      const sh = prevRect.height / currentRect.height;

      setAnimStyle({
        transform: `translate(${dx}px, ${dy}px) scale(${sw}, ${sh})`,
        transition: "none",
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimStyle({
            transform: "translate(0, 0) scale(1, 1)",
            transition: "transform 300ms ease-in-out",
          });
        });
      });
    }

    register(layoutId, currentRect);
  }, [layoutId, register, getRect]);

  return (
    <div ref={ref} className={className} style={{ ...style, ...animStyle }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Transition Component                                         */
/* ------------------------------------------------------------------ */

export function PageTransition({
  children,
  transitionKey,
  variant = "fade",
  duration = DEFAULT_DURATION,
  exitDuration,
  easing = DEFAULT_EASING,
  exitEasing,
  delay = 0,
  respectReducedMotion = true,
  onEnterComplete,
  onExitComplete,
  className,
}: PageTransitionProps) {
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState<TransitionPhase>("enter");
  const [currentKey, setCurrentKey] = useState(transitionKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveVariant =
    respectReducedMotion && prefersReduced ? "none" : variant;

  const effectiveDuration =
    effectiveVariant === "none" ? 0 : duration;

  const effectiveExitDuration =
    effectiveVariant === "none" ? 0 : (exitDuration ?? duration);

  const styles = VARIANT_STYLES[effectiveVariant];

  // Trigger transition on key change
  useEffect(() => {
    if (transitionKey === currentKey) return;

    // Exit phase
    setPhase("exit");

    timeoutRef.current = setTimeout(() => {
      onExitComplete?.();
      setDisplayChildren(children);
      setCurrentKey(transitionKey);
      setPhase("enter");

      timeoutRef.current = setTimeout(() => {
        setPhase("active");

        timeoutRef.current = setTimeout(() => {
          setPhase("idle");
          onEnterComplete?.();
        }, effectiveDuration + delay);
      }, 16); // One frame for the browser to paint the enter state
    }, effectiveExitDuration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

  // Initial enter
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("active");
      const t2 = setTimeout(() => {
        setPhase("idle");
        onEnterComplete?.();
      }, effectiveDuration + delay);
      return () => clearTimeout(t2);
    }, 16);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update children when key matches
  useEffect(() => {
    if (transitionKey === currentKey && phase !== "exit") {
      setDisplayChildren(children);
    }
  }, [children, transitionKey, currentKey, phase]);

  const phaseStyles: CSSProperties = (() => {
    switch (phase) {
      case "enter":
        return {
          ...styles.enter,
          transition: "none",
        };
      case "active":
      case "idle":
        return {
          ...styles.active,
          transition: `all ${effectiveDuration}ms ${easing}`,
          transitionDelay: `${delay}ms`,
        };
      case "exit":
        return {
          ...styles.exit,
          transition: `all ${effectiveExitDuration}ms ${exitEasing ?? easing}`,
        };
    }
  })();

  return (
    <div
      className={cn("will-change-[opacity,transform]", className)}
      style={phaseStyles}
      aria-live="polite"
    >
      {displayChildren}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transition Presets                                                */
/* ------------------------------------------------------------------ */

export const TRANSITION_PRESETS: Record<string, TransitionConfig> = {
  fade: {
    variant: "fade",
    duration: 200,
    easing: "ease-in-out",
  },
  slideNav: {
    variant: "slide-left",
    duration: 300,
    easing: "ease-out",
    exitDuration: 200,
    exitEasing: "ease-in",
  },
  scaleUp: {
    variant: "scale",
    duration: 250,
    easing: "ease-out",
  },
  instant: {
    variant: "none",
    duration: 0,
    easing: "linear",
  },
  slow: {
    variant: "fade",
    duration: 500,
    easing: "ease-in-out",
    delay: 100,
  },
};

/** Get a preset config by name. */
export function getTransitionPreset(name: string): TransitionConfig | null {
  return TRANSITION_PRESETS[name] ?? null;
}
