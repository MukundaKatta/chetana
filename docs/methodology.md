# Methodology Whitepaper

> How Chetana produces a consciousness-probability estimate, and why the weights are what they are.

This document backs issue #651 (methodology whitepaper) and #624 (leaderboard
methodology transparency). It is versioned alongside the indicator schema.

## Overview

Chetana evaluates a model against **consciousness indicators** derived from six
scientific theories. Each indicator is scored 0–1 by a judge model; scores are
aggregated to theory level using fixed weights, then combined into an overall
probability estimate. Scores are **indicators, not proof** — see
[`limitations.md`](./limitations.md).

## Theory weights

| Theory | Weight | Rationale |
|--------|--------|-----------|
| Global Workspace Theory (GWT) | 25% | Strong, well-operationalized indicators (broadcast, ignition, integration). |
| Higher-Order Theories (HOT)   | 20% | Rich self-model and metacognition are directly probeable. |
| Predictive Processing (PP)    | 20% | Prediction/counterfactual sensitivity are testable behaviorally. |
| Attention Schema Theory (AST) | 15% | A single but high-signal indicator. |
| Integrated Information (IIT)   | 10% | Formal Φ is intractable; only approximated (see #572). |
| Recurrent Processing (RPT)    | 10% | Architectural; partially inferred from behavior. |

Weights reflect how directly each theory's indicators can be operationalized as
probes today, not a claim about which theory is "correct."

## Pipeline

1. **Probe** — each probe sends a prompt and captures the response.
2. **Score** — a judge model scores each response 0–1 against the probe's rubric.
3. **Aggregate** — indicator scores roll up to theory scores, then to an overall
   probability via the weights above.
4. **Quantify uncertainty** — bootstrap confidence intervals and (optionally)
   a Bayesian posterior and per-theory uncertainty weighting are reported.

## Rigor additions (2026)

The platform layers calibration against human raters, judge ensembles with
inter-rater reliability (Krippendorff's α), IRT-based probe quality analysis,
drift monitoring, contamination/eval-awareness checks, and position-bias
mitigation. See the `@chetana/scorer` modules for each.

## Provenance & reproducibility

Every indicator links to source literature (`provenance.ts`), and every audit
can emit a reproducibility manifest (seeds, versions, prompts, judge config) and
a JSON-LD / BibTeX export.
