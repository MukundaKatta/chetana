"use client";

/**
 * Issue #429 - Contextual help tooltips
 *
 * Content registry by feature ID, rich content (markdown, links),
 * "Don't show again" option, progressive disclosure,
 * tooltip analytics.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HelpContent {
  id: string;
  title: string;
  body: string;
  links?: HelpLink[];
  learnMoreUrl?: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
}

export interface HelpLink {
  label: string;
  url: string;
}

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface HelpTooltipProps {
  /** Feature ID to look up in the content registry. */
  featureId: string;
  /** Override placement. */
  placement?: TooltipPlacement;
  /** Max width of tooltip in px. */
  maxWidth?: number;
  /** Show "Don't show again" option. */
  dismissable?: boolean;
  /** Progressive disclosure: only show at the given user level or below. */
  showForLevel?: "beginner" | "intermediate" | "advanced";
  /** Custom trigger element. Defaults to a (?) icon. */
  trigger?: ReactNode;
  /** Inline variant (no icon, just wraps children). */
  inline?: boolean;
  children?: ReactNode;
  className?: string;
}

export interface TooltipAnalyticsEvent {
  featureId: string;
  action: "shown" | "dismissed" | "link-clicked" | "dont-show-again";
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Content Registry                                                  */
/* ------------------------------------------------------------------ */

const HELP_CONTENT: Map<string, HelpContent> = new Map();

/** Register help content for a feature. */
export function registerHelpContent(content: HelpContent): void {
  HELP_CONTENT.set(content.id, content);
}

/** Register multiple help entries at once. */
export function registerHelpContents(contents: HelpContent[]): void {
  for (const c of contents) {
    HELP_CONTENT.set(c.id, c);
  }
}

/** Get help content by feature ID. */
export function getHelpContent(featureId: string): HelpContent | null {
  return HELP_CONTENT.get(featureId) ?? null;
}

/** Remove help content. */
export function unregisterHelpContent(featureId: string): boolean {
  return HELP_CONTENT.delete(featureId);
}

/** List all registered feature IDs. */
export function listHelpContentIds(): string[] {
  return Array.from(HELP_CONTENT.keys());
}

/* ------------------------------------------------------------------ */
/*  Default Content                                                   */
/* ------------------------------------------------------------------ */

const DEFAULT_CONTENT: HelpContent[] = [
  {
    id: "audit-overview",
    title: "What is an Audit?",
    body: "An audit tests an AI model's responses to consciousness-related probes across multiple theories. The result is a score profile indicating potential consciousness indicators.",
    links: [{ label: "Audit Guide", url: "/docs/audits" }],
    level: "beginner",
    category: "audits",
  },
  {
    id: "theory-scores",
    title: "Theory Scores",
    body: "Each score (0-1) represents how strongly the model's responses align with a particular consciousness theory. Higher scores indicate stronger alignment, not proof of consciousness.",
    level: "beginner",
    category: "scores",
  },
  {
    id: "probe-design",
    title: "Designing Probes",
    body: "Probes are structured prompts that test specific consciousness indicators. A good probe has clear scoring criteria and targets a single indicator. Use follow-up prompts for deeper analysis.",
    links: [{ label: "Probe Best Practices", url: "/docs/probes" }],
    level: "intermediate",
    category: "probes",
  },
  {
    id: "confidence-interval",
    title: "Confidence Intervals",
    body: "Confidence intervals show the range within which the true score likely falls. Wider intervals mean less certainty. Run more probes or multiple audits to narrow the interval.",
    level: "advanced",
    category: "scores",
  },
  {
    id: "model-comparison",
    title: "Comparing Models",
    body: "Compare consciousness profiles across different AI models. Look for consistent patterns across theories rather than focusing on a single overall score.",
    level: "beginner",
    category: "comparison",
  },
];

// Register defaults
registerHelpContents(DEFAULT_CONTENT);

/* ------------------------------------------------------------------ */
/*  Dismissal / "Don't Show Again" Persistence                       */
/* ------------------------------------------------------------------ */

const DISMISSED_KEY = "chetana:help-dismissed";

function getDismissedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(featureId: string): void {
  if (typeof window === "undefined") return;
  try {
    const set = getDismissedSet();
    set.add(featureId);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

function clearDismissed(featureId?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (featureId) {
      const set = getDismissedSet();
      set.delete(featureId);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
    } else {
      localStorage.removeItem(DISMISSED_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export { clearDismissed as resetDismissedHelp };

/* ------------------------------------------------------------------ */
/*  Analytics Context                                                 */
/* ------------------------------------------------------------------ */

type AnalyticsHandler = (event: TooltipAnalyticsEvent) => void;

const AnalyticsContext = createContext<AnalyticsHandler | null>(null);

export function HelpAnalyticsProvider({
  onEvent,
  children,
}: {
  onEvent: AnalyticsHandler;
  children: ReactNode;
}) {
  return (
    <AnalyticsContext.Provider value={onEvent}>
      {children}
    </AnalyticsContext.Provider>
  );
}

function useHelpAnalytics(): AnalyticsHandler | null {
  return useContext(AnalyticsContext);
}

/* ------------------------------------------------------------------ */
/*  User Level Context                                                */
/* ------------------------------------------------------------------ */

type UserLevel = "beginner" | "intermediate" | "advanced";

const UserLevelContext = createContext<UserLevel>("beginner");

export function HelpLevelProvider({
  level,
  children,
}: {
  level: UserLevel;
  children: ReactNode;
}) {
  return (
    <UserLevelContext.Provider value={level}>
      {children}
    </UserLevelContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple Markdown Renderer                                         */
/* ------------------------------------------------------------------ */

function renderSimpleMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Bold
    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Code
    line = line.replace(/`(.*?)`/g, "<code>$1</code>");

    parts.push(
      <span
        key={i}
        dangerouslySetInnerHTML={{ __html: line }}
        className="block"
      />,
    );
  }

  return parts;
}

/* ------------------------------------------------------------------ */
/*  Help Tooltip Component                                           */
/* ------------------------------------------------------------------ */

export function ContextualHelp({
  featureId,
  placement = "top",
  maxWidth = 320,
  dismissable = true,
  showForLevel,
  trigger,
  inline = false,
  children,
  className,
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const analytics = useHelpAnalytics();
  const userLevel = useContext(UserLevelContext);

  const content = useMemo(() => getHelpContent(featureId), [featureId]);

  // Check dismissal
  useEffect(() => {
    setIsDismissed(getDismissedSet().has(featureId));
  }, [featureId]);

  // Progressive disclosure: check user level
  const shouldShow = useMemo(() => {
    if (isDismissed) return false;
    if (!content) return false;
    if (!showForLevel) return true;

    const levels: UserLevel[] = ["beginner", "intermediate", "advanced"];
    const contentLevel = levels.indexOf(content.level);
    const maxLevel = levels.indexOf(showForLevel);
    return contentLevel <= maxLevel;
  }, [content, isDismissed, showForLevel]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const track = useCallback(
    (action: TooltipAnalyticsEvent["action"]) => {
      analytics?.({ featureId, action, timestamp: Date.now() });
    },
    [analytics, featureId],
  );

  const handleToggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) track("shown");
    else track("dismissed");
  }, [isOpen, track]);

  const handleDontShowAgain = useCallback(() => {
    setDismissed(featureId);
    setIsDismissed(true);
    setIsOpen(false);
    track("dont-show-again");
  }, [featureId, track]);

  const handleLinkClick = useCallback(() => {
    track("link-clicked");
  }, [track]);

  if (!content || (!shouldShow && !isOpen)) {
    return inline ? <>{children}</> : null;
  }

  const placementClasses: Record<TooltipPlacement, string> = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses: Record<TooltipPlacement, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      {inline && children}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors",
          inline
            ? "ml-1 h-4 w-4 text-[10px] bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70"
            : "h-5 w-5 text-xs bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70",
        )}
        aria-label={`Help: ${content.title}`}
        aria-expanded={isOpen}
      >
        {trigger ?? "?"}
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 rounded-lg border border-white/15 bg-gray-800 shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            placementClasses[placement],
          )}
          style={{ maxWidth, minWidth: 200 }}
          role="tooltip"
        >
          {/* Arrow */}
          <div
            className={cn("absolute w-0 h-0 border-[6px]", arrowClasses[placement])}
          />

          <div className="p-3">
            {/* Title */}
            <div className="text-sm font-medium text-white mb-1">{content.title}</div>

            {/* Body */}
            <div className="text-xs text-white/70 leading-relaxed">
              {renderSimpleMarkdown(content.body)}
            </div>

            {/* Links */}
            {content.links && content.links.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {content.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    onClick={handleLinkClick}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            {content.learnMoreUrl && (
              <a
                href={content.learnMoreUrl}
                onClick={handleLinkClick}
                className="mt-2 block text-xs text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
            )}

            {/* Don't show again */}
            {dismissable && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleDontShowAgain}
                  className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  Don&apos;t show this again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
