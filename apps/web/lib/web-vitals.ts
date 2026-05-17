/**
 * Web Vitals monitoring — tracks Core Web Vitals (LCP, FID, CLS, TTFB, INP)
 * using the PerformanceObserver API and reports them via a callback.
 */

export interface WebVitalMetric {
  name: "LCP" | "FID" | "CLS" | "TTFB" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  id: string;
}

export type WebVitalReportFn = (metric: WebVitalMetric) => void;

// Thresholds per https://web.dev/vitals/
const THRESHOLDS: Record<WebVitalMetric["name"], [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function rate(
  name: WebVitalMetric["name"],
  value: number
): WebVitalMetric["rating"] {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

let idCounter = 0;
function nextId(): string {
  return `wv-${++idCounter}-${Date.now()}`;
}

function report(
  onReport: WebVitalReportFn,
  name: WebVitalMetric["name"],
  value: number
): void {
  onReport({
    name,
    value,
    rating: rate(name, value),
    timestamp: Date.now(),
    id: nextId(),
  });
}

function observeLCP(onReport: WebVitalReportFn): void {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1] as PerformanceEntry | undefined;
    if (last) {
      report(onReport, "LCP", last.startTime);
    }
  });
  observer.observe({ type: "largest-contentful-paint", buffered: true });
}

function observeFID(onReport: WebVitalReportFn): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming;
      report(onReport, "FID", fidEntry.processingStart - fidEntry.startTime);
    }
  });
  observer.observe({ type: "first-input", buffered: true });
}

function observeCLS(onReport: WebVitalReportFn): void {
  let clsValue = 0;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Only count entries without recent user input
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    report(onReport, "CLS", clsValue);
  });
  observer.observe({ type: "layout-shift", buffered: true });
}

function observeINP(onReport: WebVitalReportFn): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const eventEntry = entry as PerformanceEventTiming;
      const duration = eventEntry.duration;
      if (duration > 0) {
        report(onReport, "INP", duration);
      }
    }
  });
  observer.observe({ type: "event", buffered: true });
}

function measureTTFB(onReport: WebVitalReportFn): void {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const navEntry = entry as PerformanceNavigationTiming;
      if (navEntry.responseStart > 0) {
        report(onReport, "TTFB", navEntry.responseStart);
      }
    }
  });
  observer.observe({ type: "navigation", buffered: true });
}

/**
 * Initialise Web Vitals monitoring. Call once on app mount.
 *
 * @param onReport - Called each time a metric is observed.
 */
export function initWebVitals(onReport: WebVitalReportFn): void {
  if (
    typeof window === "undefined" ||
    typeof PerformanceObserver === "undefined"
  ) {
    return;
  }

  try {
    observeLCP(onReport);
  } catch { /* unsupported */ }

  try {
    observeFID(onReport);
  } catch { /* unsupported */ }

  try {
    observeCLS(onReport);
  } catch { /* unsupported */ }

  try {
    measureTTFB(onReport);
  } catch { /* unsupported */ }

  try {
    observeINP(onReport);
  } catch { /* unsupported */ }
}
