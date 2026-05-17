"use client";

import { useMemo } from "react";

interface TheoryScoreEntry {
  gwt: number;
  iit: number;
  hot: number;
  rpt: number;
  pp: number;
  ast: number;
}

interface TheoryAgreementProps {
  theoryScores: TheoryScoreEntry[];
}

const THEORIES = ["gwt", "iit", "hot", "rpt", "pp", "ast"] as const;
const THEORY_LABELS: Record<string, string> = {
  gwt: "GWT",
  iit: "IIT",
  hot: "HOT",
  rpt: "RPT",
  pp: "PP",
  ast: "AST",
};

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return num / denom;
}

function getCorrelationColor(r: number): string {
  // Green for positive (agree), red for negative (disagree)
  const absR = Math.abs(r);
  const opacity = 0.1 + absR * 0.7;
  if (r >= 0) {
    return `rgba(34, 197, 94, ${opacity})`; // green
  }
  return `rgba(239, 68, 68, ${opacity})`; // red
}

export function TheoryAgreement({ theoryScores }: TheoryAgreementProps) {
  const correlationMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};

    THEORIES.forEach((t1) => {
      matrix[t1] = {};
      THEORIES.forEach((t2) => {
        if (t1 === t2) {
          matrix[t1][t2] = 1;
        } else {
          const scores1 = theoryScores.map((s) => s[t1]);
          const scores2 = theoryScores.map((s) => s[t2]);
          matrix[t1][t2] = pearsonCorrelation(scores1, scores2);
        }
      });
    });

    return matrix;
  }, [theoryScores]);

  if (theoryScores.length < 2) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
        Need at least 2 data points to compute theory agreement.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-200">
        Theory Agreement Matrix
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left text-gray-400" />
              {THEORIES.map((t) => (
                <th
                  key={t}
                  className="px-2 py-2 text-center font-semibold text-gray-300"
                >
                  {THEORY_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {THEORIES.map((t1) => (
              <tr key={t1} className="border-t border-gray-800/50">
                <td className="px-2 py-2 font-semibold text-gray-300">
                  {THEORY_LABELS[t1]}
                </td>
                {THEORIES.map((t2) => {
                  const r = correlationMatrix[t1]?.[t2] ?? 0;
                  const isDiagonal = t1 === t2;
                  return (
                    <td key={t2} className="px-1 py-1 text-center">
                      <div
                        className="mx-auto flex h-10 w-14 items-center justify-center rounded text-[11px] font-semibold"
                        style={{
                          backgroundColor: isDiagonal
                            ? "rgba(255,255,255,0.05)"
                            : getCorrelationColor(r),
                        }}
                        title={`${THEORY_LABELS[t1]} vs ${THEORY_LABELS[t2]}: r=${r.toFixed(3)}`}
                      >
                        <span
                          className={
                            isDiagonal ? "text-gray-500" : "text-gray-200"
                          }
                        >
                          {isDiagonal ? "—" : r.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.6)" }}
          />
          Disagree (negative)
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
          />
          Neutral
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.6)" }}
          />
          Agree (positive)
        </span>
      </div>
    </div>
  );
}
