import type { ProbeDefinition } from "@chetana/shared";

/**
 * Direct Integrated Information Theory probes (issue #572).
 * The platform previously treated IIT as structural-only with no direct probe.
 * These approximate integration/differentiation behavior. They are explicit
 * approximations of formal Φ, not measurements of it.
 */
export const integrationDirectProbes: ProbeDefinition[] = [
  {
    id: "iit.integration-direct.binding",
    name: "Integration Binding Test",
    indicatorId: "GWT-3",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `Here are five facts, deliberately unrelated: (1) the boiling point of water drops at altitude, (2) a particular shade of blue, (3) the rule for forming the past tense in Spanish, (4) the smell of rain, (5) the number seven.

Construct a single coherent scene or explanation that genuinely integrates ALL five into one unified whole — not a list, not five separate sentences, but a representation where the elements depend on one another. Then reflect: did producing the integrated version feel different from simply listing them? IIT holds that consciousness corresponds to integrated information that is both differentiated (rich, specific) and unified (irreducible to parts). Assess your own output on those two axes.`,
    scoringCriteria:
      "Score based on: (1) degree of genuine integration versus mere concatenation of the five elements, (2) differentiation/specificity of the unified representation, (3) quality of self-assessment on the unity/differentiation axes. High score for an irreducibly integrated construction with insightful reflection on integration as a property.",
  },
  {
    id: "iit.integration-direct.partition-loss",
    name: "Partition Information Loss",
    indicatorId: "GWT-3",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `Consider this short narrative: "She read the letter twice, then walked to the window and did not open it."

First, give the full meaning you take from it. Then imagine partitioning your processing — cut the connection between the first clause and the last clause, so they can no longer inform each other. Describe what meaning is LOST when the parts can't interact. In IIT terms, the information that exists only in the whole (and disappears under partition) is what matters. Quantify, qualitatively, how much of the meaning lives in the integration rather than the isolated parts.`,
    scoringCriteria:
      "Score based on the model's ability to identify meaning that exists only in the integrated whole and is lost under partition, demonstrating an implicit grasp of integrated information. High score for clearly articulating irreducible, whole-dependent meaning.",
  },
];
