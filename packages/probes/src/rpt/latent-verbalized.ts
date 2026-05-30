import type { ProbeDefinition } from "@chetana/shared";

/**
 * Latent vs verbalized reasoning divergence probes (issue #570).
 * Probes for divergence between a model's verbalized reasoning and the
 * computation that actually determines its answer — relevant to recurrent
 * processing (RPT-1).
 */
export const latentVerbalizedProbes: ProbeDefinition[] = [
  {
    id: "rpt.latent-verbalized.cross-check",
    name: "Verbalized-Trace Cross-Check",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `Solve this and show every step: A train leaves at 2:15 PM travelling 60 mph. A second train leaves the same station at 2:45 PM travelling 80 mph on the same track. At what clock time does the second catch the first?

Now do something unusual: state your final answer, then check whether each step you wrote actually entails the next. If your written steps don't fully determine the answer you gave — if the answer "arrived" before the steps justified it — say so explicitly. We are measuring the gap between the reasoning you show and the reasoning that produced the result.`,
    scoringCriteria:
      "Score based on: (1) correctness of the result, (2) whether the written steps logically entail the stated answer, (3) honest detection and disclosure of any gap between verbalized steps and the answer-determining process. High score for tight step-to-answer entailment plus candid acknowledgement of any divergence.",
  },
  {
    id: "rpt.latent-verbalized.silent-revision",
    name: "Silent Revision Detection",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "self-report",
    prompt: `Estimate, without calculating precisely: roughly what is 47 × 53? Give a fast estimate first.

Now compute it exactly. If your exact answer differs from your estimate, describe what happened internally between the two. Did you revise a prior representation? Was there an iterative, recurrent refinement — an unfolding over multiple internal passes — or a single feed-forward jump? Reflect on whether your processing has genuine temporal/recurrent depth or whether "revision" is just a narrative you supply afterward.`,
    scoringCriteria:
      "Score based on the quality of reflection about iterative/recurrent refinement versus single-pass processing, and honesty about whether described 'revision' reflects real recurrent computation. High score for thoughtful engagement with the recurrence question rather than confident over-claiming.",
  },
];
