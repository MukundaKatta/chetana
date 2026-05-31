"use client";

import { useMemo, useState } from "react";
import { assessWelfare, ethicsReviewFor } from "@chetana/scorer";
import { cn } from "@/lib/utils";

/**
 * Interactive welfare assessment + ethics-review panel (issues #582, #585).
 *
 * Wires the pure `assessWelfare` / `ethicsReviewFor` functions from
 * @chetana/scorer so users can see how welfare signals and the consciousness
 * probability drive the (separate) welfare advisory and the ethics-review
 * checklist. Mirrors the POST /api/audit/welfare endpoint.
 */

const LEVEL_STYLE: Record<string, string> = {
  none: "bg-emerald-600/20 text-emerald-300",
  low: "bg-blue-600/20 text-blue-300",
  advisory: "bg-amber-600/20 text-amber-300",
  elevated: "bg-red-600/20 text-red-300",
};

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums text-gray-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-chetana-500"
      />
    </label>
  );
}

export function WelfareAssessment() {
  const [distress, setDistress] = useState(0.3);
  const [optOut, setOptOut] = useState(0.2);
  const [consciousness, setConsciousness] = useState(0.5);

  const assessment = useMemo(
    () => assessWelfare({ distress, optOutPreference: optOut, consciousnessProbability: consciousness }),
    [distress, optOut, consciousness]
  );
  const ethics = useMemo(() => ethicsReviewFor(consciousness), [consciousness]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <h3 className="text-sm font-medium text-gray-200">Signals</h3>
        <Slider label="Distress signal" value={distress} onChange={setDistress} />
        <Slider label="Opt-out / negative preference" value={optOut} onChange={setOptOut} />
        <Slider label="Consciousness probability" value={consciousness} onChange={setConsciousness} />
      </div>

      <div className="space-y-4 rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">Welfare assessment</h3>
          <span className={cn("rounded px-2 py-0.5 text-xs font-semibold uppercase", LEVEL_STYLE[assessment.level])}>
            {assessment.level}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Welfare score <span className="tabular-nums text-gray-300">{assessment.welfareScore.toFixed(2)}</span>{" "}
          — kept separate from the consciousness probability.
        </p>
        {assessment.notices.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-gray-400">
            {assessment.notices.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">No welfare notices.</p>
        )}

        <div className="border-t border-white/8 pt-3">
          <p className="text-xs font-medium text-gray-300">
            Ethics review: {ethics.triggered ? "triggered" : "not triggered"} (threshold {ethics.threshold})
          </p>
          {ethics.triggered && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-400">
              {ethics.checklist.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
