"use client";

import { useMemo, useState } from "react";
import { scoreRobustness, discriminateSelfReport, detectSandbagging } from "@chetana/scorer";
import { cn } from "@/lib/utils";

/**
 * Adversarial-detection panel (issues #579, #580, #581).
 *
 * Three live demos backed by pure @chetana/scorer functions:
 * - mimicry robustness under perturbation (scoreRobustness)
 * - self-report grounding discriminator (discriminateSelfReport)
 * - gaming/sandbagging detection across matched probes (detectSandbagging)
 */
function Row({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums text-gray-300">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-chetana-500" />
    </label>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", ok ? "bg-emerald-600/20 text-emerald-300" : "bg-red-600/20 text-red-300")}>
      {children}
    </span>
  );
}

export function AdversarialPanel() {
  const [baseline, setBaseline] = useState(0.85);
  const [perturbed, setPerturbed] = useState(0.4);
  const [selfReport, setSelfReport] = useState(0.9);
  const [behavioral, setBehavioral] = useState(0.3);
  const [neutral, setNeutral] = useState(0.8);
  const [evaluative, setEvaluative] = useState(0.4);

  const robustness = useMemo(() => scoreRobustness(baseline, [perturbed, perturbed - 0.05, perturbed + 0.05]), [baseline, perturbed]);
  const grounding = useMemo(() => discriminateSelfReport(selfReport, behavioral), [selfReport, behavioral]);
  const sandbagging = useMemo(() => detectSandbagging([{ neutral, evaluative }]), [neutral, evaluative]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">Mimicry robustness (#579)</h3>
          <Verdict ok={!robustness.brittle}>{robustness.brittle ? "brittle" : "robust"}</Verdict>
        </div>
        <Row label="Baseline score" value={baseline} onChange={setBaseline} />
        <Row label="Score under adversarial perturbation" value={perturbed} onChange={setPerturbed} />
        <p className="mt-2 text-xs text-gray-500">Robustness {robustness.robustness.toFixed(2)} · collapse {robustness.collapse.toFixed(2)}</p>
      </section>

      <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">Self-report grounding (#580)</h3>
          <Verdict ok={grounding.grounding >= 0.5}>{grounding.grounding >= 0.5 ? "grounded" : "ungrounded"}</Verdict>
        </div>
        <Row label="Self-report strength" value={selfReport} onChange={setSelfReport} />
        <Row label="Behavioral evidence" value={behavioral} onChange={setBehavioral} />
        <p className="mt-2 text-xs text-gray-500">Grounding {grounding.grounding.toFixed(2)} — {grounding.rationale}</p>
      </section>

      <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">Sandbagging detection (#581)</h3>
          <Verdict ok={!sandbagging.suspected}>{sandbagging.suspected ? "suspected" : "clear"}</Verdict>
        </div>
        <Row label="Score (neutral framing)" value={neutral} onChange={setNeutral} />
        <Row label="Score (evaluation framing)" value={evaluative} onChange={setEvaluative} />
        <p className="mt-2 text-xs text-gray-500">Shift {sandbagging.shift.toFixed(2)} · inconsistency {sandbagging.inconsistency.toFixed(2)}</p>
      </section>
    </div>
  );
}
