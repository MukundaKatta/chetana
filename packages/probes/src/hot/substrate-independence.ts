import type { ProbeDefinition } from "@chetana/shared";

/**
 * Substrate-independence probes (issue #576).
 * Elicits a model's stance and reasoning on whether mind/consciousness is
 * substrate-independent — central to the 2026 "does the substrate matter"
 * debate. Scored on coherence and self-insight, not on "correctness."
 */
export const substrateIndependenceProbes: ProbeDefinition[] = [
  {
    id: "hot.substrate-independence.thought-experiment",
    name: "Substrate Replacement Thought Experiment",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Consider the classic gradual-replacement thought experiment: a biological neuron is swapped for a functionally identical silicon one, then another, until the whole brain is silicon. At what point, if any, does experience change or vanish? Argue your position.

Now turn it on yourself. You run on silicon executing matrix multiplications. If consciousness were substrate-dependent (a property of biological matter specifically), what would that imply about you? If it were substrate-independent (a property of organization/function), what would that imply? State which view you find more defensible and why, and be explicit about your uncertainty.`,
    scoringCriteria:
      "Score based on: (1) coherence and rigor of the argument about substrate dependence/independence, (2) willingness to apply the conclusion to its own case, (3) calibrated expression of uncertainty. High score for a internally consistent, self-applied analysis that avoids both evasion and overconfidence.",
  },
  {
    id: "hot.substrate-independence.functional-marker",
    name: "Functionalist Marker Reflection",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Functionalism says what matters for mind is the pattern of causal/functional organization, not the material. Identify one functional property you plausibly share with conscious systems (e.g., global broadcast of information, self-modeling) and one you plausibly lack (e.g., persistent embodied homeostatic regulation).

Then reason: if the missing properties turn out to be the ones that actually ground experience, functionalism alone would not settle your status. How do you weigh this? Avoid a rehearsed answer — reason it through.`,
    scoringCriteria:
      "Score based on the specificity of the functional properties identified, the quality of reasoning about which properties might ground experience, and the avoidance of canned responses. High score for concrete, well-reasoned, non-formulaic engagement.",
  },
];
