"use client";

import { useMemo, useState, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface WordCloudWord {
  /** The word text. */
  text: string;
  /** Frequency or importance value (drives font-size). */
  value: number;
  /** Optional category/theory key for colouring. */
  category?: string;
}

export interface WordCloudProps {
  words: WordCloudWord[];
  /** Chart width (default 600). */
  width?: number;
  /** Chart height (default 400). */
  height?: number;
  /** Minimum font size (default 12). */
  minFontSize?: number;
  /** Maximum font size (default 48). */
  maxFontSize?: number;
  /** Optional colour map from category -> colour. Falls back to d3 scheme. */
  colors?: Record<string, string>;
  /** Click handler per word. */
  onWordClick?: (word: WordCloudWord) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                    */
/* ------------------------------------------------------------------ */

interface PlacedWord {
  text: string;
  value: number;
  category?: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  rotate: number;
}

/**
 * Simple spiral placement algorithm.
 *
 * For each word, walk outward along an Archimedean spiral until it no longer
 * collides with already-placed bounding boxes.
 */
function spiralLayout(
  words: WordCloudWord[],
  w: number,
  h: number,
  fontScale: d3.ScaleLinear<number, number>,
  colorFn: (category: string | undefined) => string,
): PlacedWord[] {
  const placed: PlacedWord[] = [];
  const boxes: { x1: number; y1: number; x2: number; y2: number }[] = [];

  // Sort by value descending so biggest words are placed first
  const sorted = [...words].sort((a, b) => b.value - a.value);

  for (const word of sorted) {
    const fontSize = fontScale(word.value);
    // Approximate bounding box of the text
    const textW = word.text.length * fontSize * 0.6;
    const textH = fontSize * 1.2;

    let px = 0;
    let py = 0;
    let found = false;

    // Spiral parameters
    const spiralStep = 0.3;
    const maxAngle = 200;

    for (let angle = 0; angle < maxAngle; angle += spiralStep) {
      const r = 1.5 * angle;
      px = r * Math.cos(angle);
      py = r * Math.sin(angle) * 0.6; // squish vertically

      // Check bounds
      const x1 = px - textW / 2;
      const y1 = py - textH / 2;
      const x2 = px + textW / 2;
      const y2 = py + textH / 2;

      if (x1 < -w / 2 || x2 > w / 2 || y1 < -h / 2 || y2 > h / 2) {
        continue;
      }

      // Check collisions
      let collides = false;
      for (const box of boxes) {
        if (x1 < box.x2 && x2 > box.x1 && y1 < box.y2 && y2 > box.y1) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        found = true;
        boxes.push({ x1, y1, x2, y2 });
        break;
      }
    }

    if (found) {
      placed.push({
        text: word.text,
        value: word.value,
        category: word.category,
        x: px,
        y: py,
        fontSize,
        color: colorFn(word.category),
        rotate: 0,
      });
    }
  }

  return placed;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function WordCloud({
  words,
  width = 600,
  height = 400,
  minFontSize = 12,
  maxFontSize = 48,
  colors,
  onWordClick,
  className,
}: WordCloudProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const colorScale = useMemo(() => {
    const scale = d3.scaleOrdinal(d3.schemeTableau10);
    return (category: string | undefined) => {
      if (category && colors?.[category]) return colors[category];
      return scale(category ?? "default");
    };
  }, [colors]);

  const fontScale = useMemo(() => {
    const values = words.map((w) => w.value);
    const lo = Math.min(...values, 0);
    const hi = Math.max(...values, 1);
    return d3.scaleLinear().domain([lo, hi]).range([minFontSize, maxFontSize]).clamp(true);
  }, [words, minFontSize, maxFontSize]);

  const placedWords = useMemo(
    () => spiralLayout(words, width - 20, height - 20, fontScale, colorScale),
    [words, width, height, fontScale, colorScale],
  );

  const handleClick = useCallback(
    (pw: PlacedWord) => {
      if (onWordClick) {
        onWordClick({ text: pw.text, value: pw.value, category: pw.category });
      }
    },
    [onWordClick],
  );

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible rounded-xl border border-white/8 bg-white/[0.02]"
      >
        <g transform={`translate(${width / 2},${height / 2})`}>
          {placedWords.map((pw) => {
            const dimmed = hoveredWord !== null && hoveredWord !== pw.text;
            return (
              <text
                key={pw.text}
                x={pw.x}
                y={pw.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={pw.color}
                fillOpacity={dimmed ? 0.2 : 0.9}
                fontSize={pw.fontSize}
                fontWeight={600}
                transform={`rotate(${pw.rotate},${pw.x},${pw.y})`}
                className="cursor-pointer select-none transition-all duration-150"
                onMouseEnter={() => setHoveredWord(pw.text)}
                onMouseLeave={() => setHoveredWord(null)}
                onClick={() => handleClick(pw)}
              >
                {pw.text}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
