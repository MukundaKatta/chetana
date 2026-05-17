"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  /** Explicit items. If not provided, items are derived from pathname. */
  items?: BreadcrumbItem[];
  /** Current pathname to auto-generate breadcrumbs from. */
  pathname?: string;
  /** Custom separator element. Defaults to ChevronRight icon. */
  separator?: ReactNode;
  /** Whether to show a home icon for the root breadcrumb. */
  showHome?: boolean;
  /** Custom label mapping for path segments (e.g., { "probe-results": "Probe Results" }). */
  labelMap?: Record<string, string>;
  /** Link component to use. Defaults to an <a> tag. Pass Next.js Link for client routing. */
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: ReactNode;
  }>;
  className?: string;
}

function defaultLabel(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildItemsFromPathname(
  pathname: string,
  labelMap?: Record<string, string>
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  let accumulated = "";
  for (const seg of segments) {
    accumulated += `/${seg}`;
    items.push({
      label: labelMap?.[seg] ?? defaultLabel(seg),
      href: accumulated,
    });
  }

  return items;
}

export function Breadcrumbs({
  items: explicitItems,
  pathname,
  separator,
  showHome = true,
  labelMap,
  linkComponent: LinkComponent,
  className,
}: BreadcrumbsProps) {
  const items = useMemo(() => {
    if (explicitItems) return explicitItems;
    if (pathname) return buildItemsFromPathname(pathname, labelMap);
    return [];
  }, [explicitItems, pathname, labelMap]);

  if (items.length === 0) return null;

  const Anchor = LinkComponent ?? "a";

  const separatorEl = separator ?? (
    <ChevronRight className="h-3.5 w-3.5 text-white/20" />
  );

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="shrink-0">
                  {separatorEl}
                </span>
              )}

              {isLast ? (
                <span
                  className="font-medium text-white"
                  aria-current="page"
                >
                  {isFirst && showHome && (
                    <Home className="mr-1 inline-block h-3.5 w-3.5" />
                  )}
                  {item.label}
                </span>
              ) : (
                <Anchor
                  href={item.href}
                  className="text-white/50 transition-colors hover:text-white"
                >
                  {isFirst && showHome && (
                    <Home className="mr-1 inline-block h-3.5 w-3.5" />
                  )}
                  {item.label}
                </Anchor>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
