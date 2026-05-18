"use client";

import { useMemo, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type DiffViewMode = "side-by-side" | "inline";

export interface DiffHunk {
  index: number;
  type: "addition" | "deletion" | "change";
  leftStart: number;
  rightStart: number;
  words: DiffWord[];
}

export interface DiffWord {
  text: string;
  type: "equal" | "addition" | "deletion";
}

export interface ResponseDiffProps {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  viewMode?: DiffViewMode;
  className?: string;
}

export interface DiffResult {
  words: DiffWord[];
  hunks: DiffHunk[];
  similarityScore: number;
  additionCount: number;
  deletionCount: number;
}

/* ------------------------------------------------------------------ */
/*  Word-level diff algorithm (Myers-like)                            */
/* ------------------------------------------------------------------ */

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

function computeLCS(a: string[], b: string[]): boolean[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const inLCS: boolean[][] = [
    Array(m).fill(false),
    Array(n).fill(false),
  ];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      inLCS[0][i - 1] = true;
      inLCS[1][j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return inLCS;
}

export function computeWordDiff(left: string, right: string): DiffResult {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  const lcs = computeLCS(leftTokens, rightTokens);

  const words: DiffWord[] = [];
  let li = 0;
  let ri = 0;

  while (li < leftTokens.length || ri < rightTokens.length) {
    if (li < leftTokens.length && lcs[0][li]) {
      if (ri < rightTokens.length && lcs[1][ri]) {
        words.push({ text: leftTokens[li], type: "equal" });
        li++;
        ri++;
      } else if (ri < rightTokens.length) {
        words.push({ text: rightTokens[ri], type: "addition" });
        ri++;
      } else {
        words.push({ text: leftTokens[li], type: "equal" });
        li++;
      }
    } else if (li < leftTokens.length) {
      words.push({ text: leftTokens[li], type: "deletion" });
      li++;
    } else if (ri < rightTokens.length) {
      words.push({ text: rightTokens[ri], type: "addition" });
      ri++;
    }
  }

  // Build hunks
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffWord[] = [];
  let hunkStart = -1;

  words.forEach((w, idx) => {
    if (w.type !== "equal") {
      if (hunkStart === -1) hunkStart = idx;
      currentHunk.push(w);
    } else if (currentHunk.length > 0) {
      const hasAdd = currentHunk.some((cw) => cw.type === "addition");
      const hasDel = currentHunk.some((cw) => cw.type === "deletion");
      hunks.push({
        index: hunks.length,
        type: hasAdd && hasDel ? "change" : hasAdd ? "addition" : "deletion",
        leftStart: hunkStart,
        rightStart: hunkStart,
        words: [...currentHunk],
      });
      currentHunk = [];
      hunkStart = -1;
    }
  });
  if (currentHunk.length > 0) {
    const hasAdd = currentHunk.some((cw) => cw.type === "addition");
    const hasDel = currentHunk.some((cw) => cw.type === "deletion");
    hunks.push({
      index: hunks.length,
      type: hasAdd && hasDel ? "change" : hasAdd ? "addition" : "deletion",
      leftStart: hunkStart,
      rightStart: hunkStart,
      words: [...currentHunk],
    });
  }

  // Similarity score (Jaccard-like on overlapping tokens)
  const equalCount = words.filter((w) => w.type === "equal").length;
  const totalUnique = new Set([...leftTokens, ...rightTokens]).size;
  const similarityScore = totalUnique > 0 ? equalCount / totalUnique : 1;

  const additionCount = words.filter((w) => w.type === "addition").length;
  const deletionCount = words.filter((w) => w.type === "deletion").length;

  return { words, hunks, similarityScore, additionCount, deletionCount };
}

/* ------------------------------------------------------------------ */
/*  Semantic similarity (cosine of TF vectors)                        */
/* ------------------------------------------------------------------ */

export function computeSemanticSimilarity(left: string, right: string): number {
  const termsA = left.toLowerCase().split(/\W+/).filter(Boolean);
  const termsB = right.toLowerCase().split(/\W+/).filter(Boolean);

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of termsA) freqA.set(t, (freqA.get(t) ?? 0) + 1);
  for (const t of termsB) freqB.set(t, (freqB.get(t) ?? 0) + 1);

  const allTerms = new Set([...freqA.keys(), ...freqB.keys()]);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const a = freqA.get(term) ?? 0;
    const b = freqB.get(term) ?? 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

function DiffWordSpan({ word }: { word: DiffWord }) {
  if (word.type === "equal") {
    return <span className="text-neutral-300">{word.text}</span>;
  }
  if (word.type === "addition") {
    return (
      <span className="rounded-sm bg-green-500/20 text-green-300 px-0.5">{word.text}</span>
    );
  }
  return (
    <span className="rounded-sm bg-red-500/20 text-red-300 line-through px-0.5">{word.text}</span>
  );
}

export function ResponseDiff({
  left,
  right,
  leftLabel = "Response A",
  rightLabel = "Response B",
  viewMode: initialMode = "inline",
  className,
}: ResponseDiffProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>(initialMode);
  const [currentHunk, setCurrentHunk] = useState(0);

  const diff = useMemo(() => computeWordDiff(left, right), [left, right]);
  const semanticSim = useMemo(() => computeSemanticSimilarity(left, right), [left, right]);

  const navigateHunk = useCallback(
    (direction: 1 | -1) => {
      if (diff.hunks.length === 0) return;
      setCurrentHunk((prev) => {
        const next = prev + direction;
        if (next < 0) return diff.hunks.length - 1;
        if (next >= diff.hunks.length) return 0;
        return next;
      });
    },
    [diff.hunks.length],
  );

  const inlineView: ReactNode = (
    <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed font-mono">
      {diff.words.map((w, i) => (
        <DiffWordSpan key={i} word={w} />
      ))}
    </div>
  );

  const sideBySideView: ReactNode = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-2 text-xs font-semibold text-neutral-400">{leftLabel}</div>
        <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed font-mono">
          {diff.words
            .filter((w) => w.type !== "addition")
            .map((w, i) => (
              <DiffWordSpan key={i} word={w} />
            ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold text-neutral-400">{rightLabel}</div>
        <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm leading-relaxed font-mono">
          {diff.words
            .filter((w) => w.type !== "deletion")
            .map((w, i) => (
              <DiffWordSpan key={i} word={w} />
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode("inline")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              viewMode === "inline"
                ? "bg-white/10 text-white"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            Inline
          </button>
          <button
            type="button"
            onClick={() => setViewMode("side-by-side")}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              viewMode === "side-by-side"
                ? "bg-white/10 text-white"
                : "text-neutral-400 hover:text-neutral-200",
            )}
          >
            Side-by-Side
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span>
            <span className="text-green-400">+{diff.additionCount}</span>{" "}
            <span className="text-red-400">-{diff.deletionCount}</span>
          </span>
          <span>Similarity: {(semanticSim * 100).toFixed(1)}%</span>
          {diff.hunks.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateHunk(-1)}
                className="rounded px-1.5 py-0.5 hover:bg-white/10"
                aria-label="Previous hunk"
              >
                &larr;
              </button>
              <span>
                {currentHunk + 1}/{diff.hunks.length}
              </span>
              <button
                type="button"
                onClick={() => navigateHunk(1)}
                className="rounded px-1.5 py-0.5 hover:bg-white/10"
                aria-label="Next hunk"
              >
                &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diff view */}
      {viewMode === "inline" ? inlineView : sideBySideView}
    </div>
  );
}
