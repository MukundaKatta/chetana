/**
 * Lazy loading: React.lazy wrappers, route-based code splitting helpers,
 * Intersection Observer for below-fold, skeleton placeholders,
 * preload on hover (Issue #497).
 */

"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
  createElement,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LazyComponentOptions {
  /** Fallback shown while loading. Defaults to null. */
  fallback?: ReactNode;
  /** Minimum ms to show the fallback (prevents flash). */
  minimumLoadingMs?: number;
}

export interface IntersectionOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  /** Only trigger once, then disconnect. Default true. */
  triggerOnce?: boolean;
}

export interface PreloadableComponent<P> {
  Component: ComponentType<P>;
  preload: () => Promise<void>;
}

export interface RouteSplitConfig {
  path: string;
  load: () => Promise<{ default: ComponentType<Record<string, unknown>> }>;
  /** Prefetch when this path pattern appears as an <a href>. */
  prefetchOnLink?: boolean;
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  animate?: boolean;
}

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 4,
  className = "",
  animate = true,
}: SkeletonProps): ReactNode {
  const style: Record<string, string | number> = {
    width,
    height,
    borderRadius,
    backgroundColor: "var(--skeleton-bg, rgba(128,128,128,0.15))",
  };

  return createElement("div", {
    className: `${animate ? "animate-pulse" : ""} ${className}`.trim(),
    style,
    "aria-hidden": true,
  });
}

// ---------------------------------------------------------------------------
// Enhanced React.lazy with minimum loading time and preload
// ---------------------------------------------------------------------------

export function createLazyComponent<P extends Record<string, unknown>>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
): PreloadableComponent<P> {
  let modulePromise: Promise<{ default: ComponentType<P> }> | null = null;

  const load = (): Promise<{ default: ComponentType<P> }> => {
    if (!modulePromise) {
      modulePromise = factory();
    }
    return modulePromise;
  };

  const minimumWait =
    options.minimumLoadingMs && options.minimumLoadingMs > 0
      ? options.minimumLoadingMs
      : 0;

  const LazyComponent = lazy(() => {
    const start = Date.now();
    return load().then((mod) => {
      const elapsed = Date.now() - start;
      if (minimumWait > 0 && elapsed < minimumWait) {
        return new Promise<{ default: ComponentType<P> }>((resolve) =>
          setTimeout(() => resolve(mod), minimumWait - elapsed)
        );
      }
      return mod;
    });
  });

  const WrappedComponent: ComponentType<P> = (props: P) =>
    createElement(
      Suspense,
      { fallback: options.fallback ?? null },
      createElement(LazyComponent, props)
    );

  WrappedComponent.displayName = "LazyLoaded";

  return {
    Component: WrappedComponent,
    preload: async () => {
      await load();
    },
  };
}

// ---------------------------------------------------------------------------
// Intersection Observer hook – below-fold lazy rendering
// ---------------------------------------------------------------------------

export function useIntersectionObserver(
  options: IntersectionOptions = {}
): { ref: RefObject<HTMLElement | null>; isIntersecting: boolean } {
  const ref = useRef<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const { root = null, rootMargin = "0px", threshold = 0, triggerOnce = true } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [root, rootMargin, threshold, triggerOnce]);

  return { ref, isIntersecting };
}

// ---------------------------------------------------------------------------
// Below-fold lazy wrapper (renders children only when visible)
// ---------------------------------------------------------------------------

export interface LazyVisibleProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export function LazyVisible({
  children,
  placeholder,
  rootMargin = "200px",
  threshold = 0,
  className,
}: LazyVisibleProps): ReactNode {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce: true,
  });

  return createElement(
    "div",
    { ref, className },
    isIntersecting
      ? children
      : placeholder ??
        createElement(Skeleton, { width: "100%", height: 200 })
  );
}

// ---------------------------------------------------------------------------
// Preload on hover
// ---------------------------------------------------------------------------

export function usePreloadOnHover(
  preloadFn: () => Promise<void>
): { onMouseEnter: () => void; onFocus: () => void } {
  const preloaded = useRef(false);

  const trigger = useCallback(() => {
    if (!preloaded.current) {
      preloaded.current = true;
      preloadFn().catch(() => {
        // Reset so it can be retried
        preloaded.current = false;
      });
    }
  }, [preloadFn]);

  return { onMouseEnter: trigger, onFocus: trigger };
}

// ---------------------------------------------------------------------------
// Route-based code splitting registry
// ---------------------------------------------------------------------------

const routeRegistry: Map<string, RouteSplitConfig> = new Map();

export function registerRoute(config: RouteSplitConfig): void {
  routeRegistry.set(config.path, config);
}

export function getRouteComponent(
  path: string
): PreloadableComponent<Record<string, unknown>> | null {
  const config = routeRegistry.get(path);
  if (!config) return null;
  return createLazyComponent(config.load);
}

export function prefetchRoute(path: string): void {
  const config = routeRegistry.get(path);
  if (config) {
    config.load().catch(() => {
      /* swallow – prefetch is best-effort */
    });
  }
}

export function getRegisteredRoutes(): string[] {
  return Array.from(routeRegistry.keys());
}

// ---------------------------------------------------------------------------
// Link prefetch observer – watches for <a> elements entering the viewport
// ---------------------------------------------------------------------------

export function createLinkPrefetchObserver(): {
  observe: () => void;
  disconnect: () => void;
} {
  let observer: IntersectionObserver | null = null;
  const prefetched = new Set<string>();

  const observe = () => {
    if (typeof window === "undefined") return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const anchor = entry.target as HTMLAnchorElement;
          const href = anchor.getAttribute("href");
          if (href && !prefetched.has(href)) {
            prefetched.add(href);
            prefetchRoute(href);
          }
        }
      },
      { rootMargin: "100px" }
    );

    const links = document.querySelectorAll("a[href]");
    links.forEach((link) => observer?.observe(link));
  };

  const disconnect = () => {
    observer?.disconnect();
    observer = null;
  };

  return { observe, disconnect };
}
