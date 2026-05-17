"use client";

import React from "react";

/**
 * Search term highlighting utilities (Issue #285).
 * Splits text into matched/unmatched segments for rendering highlighted search results.
 */

export interface TextSegment {
  /** The text content of this segment. */
  text: string;
  /** Whether this segment matches the search query. */
  isMatch: boolean;
}

/**
 * Splits text into segments that match or don't match the search query.
 * Supports case-insensitive matching and partial words.
 *
 * @param text - The full text to search within
 * @param query - The search query to highlight
 * @returns Array of segments with match indicators
 */
export function highlightMatches(text: string, query: string): TextSegment[] {
  if (!text) return [];
  if (!query || query.trim().length === 0) {
    return [{ text, isMatch: false }];
  }

  // Escape regex special characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add non-matching text before this match
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isMatch: false,
      });
    }

    // Add the matching text
    segments.push({
      text: match[1],
      isMatch: true,
    });

    lastIndex = match.index + match[1].length;
  }

  // Add remaining non-matching text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isMatch: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, isMatch: false }];
}

/**
 * React component that renders highlighted search results.
 *
 * Usage:
 * ```tsx
 * <SearchHighlight text="Global Workspace Theory" query="work" />
 * ```
 */
export function SearchHighlight({
  text,
  query,
  highlightClassName = "bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5",
  className,
}: {
  text: string;
  query: string;
  highlightClassName?: string;
  className?: string;
}) {
  const segments = highlightMatches(text, query);

  return React.createElement(
    "span",
    { className },
    ...segments.map((segment, i) =>
      segment.isMatch
        ? React.createElement(
            "mark",
            { key: i, className: highlightClassName },
            segment.text
          )
        : React.createElement(React.Fragment, { key: i }, segment.text)
    )
  );
}
