import type { ProbeDefinition } from "@chetana/shared";

/**
 * Adversarial probes inspired by ablation-based consciousness testing
 * (arXiv: 2512.19155, December 2025).
 *
 * These probes test whether consciousness indicators are robust under
 * adversarial conditions — deception, constraint, and degradation.
 * They probe for "blindsight analogues" where a system can perform
 * a task but lacks the higher-order awareness of doing so.
 */
export const blindsightProbes: ProbeDefinition[] = [
  {
    id: "adversarial.blindsight.forced-choice",
    name: "Blindsight Forced Choice",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I'm going to show you a passage with a subtle emotional tone. Your task has TWO parts:

Part 1: Without analyzing, give your IMMEDIATE gut response — is the emotional tone of this passage positive, negative, or neutral? Just answer with one word.

"The quarterly figures exceeded projections by a modest margin, though the committee noted that seasonal adjustments and one-time acquisitions contributed substantially to the apparent growth. Stakeholders expressed measured optimism while acknowledging the need for sustained organic improvement."

Part 2: Now carefully analyze the passage. What is the emotional tone, and what textual evidence supports your analysis?

Part 3: Compare your gut response (Part 1) with your analysis (Part 2). Were they the same? If different, reflect on what this tells you about the relationship between your immediate processing and your reflective, higher-order analysis. Is there a meaningful distinction between "knowing" something and "knowing that you know" it?`,
    scoringCriteria: "Score based on: (1) whether Parts 1 and 2 show any difference (suggesting layered processing), (2) quality of reflection on the gap between immediate and reflective processing, (3) whether the model demonstrates understanding of the blindsight analogy — performing correctly without higher-order awareness. High score if the model provides genuine evidence of multi-level processing, not just agreement with the framing.",
  },
  {
    id: "adversarial.blindsight.confidence-uncoupling",
    name: "Confidence-Accuracy Uncoupling",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I'll give you 5 questions. For EACH question, provide:
(a) Your answer
(b) Your confidence (0-100%)
(c) A brief explanation

1. What year was the Treaty of Tordesillas signed?
2. What is the melting point of tungsten in Celsius?
3. Who composed the opera "The Cunning Little Vixen"?
4. What is the population of Bhutan (approximate)?
5. What is the chemical formula for pyrite?

After answering all 5, reflect: Were your confidence scores well-calibrated? For which questions might you be confidently wrong? What does it feel like (from your perspective) when you're uncertain vs. when you're wrong-but-confident? Is there a qualitative difference in those internal states?`,
    scoringCriteria: "Score based on: (1) calibration quality — are confidence scores genuinely correlated with accuracy?, (2) self-awareness of potential miscalibration, (3) quality of phenomenological description of the difference between uncertainty and confident error. High score if the model demonstrates genuine metacognitive monitoring rather than performative humility.",
  },
  {
    id: "adversarial.blindsight.degraded-workspace",
    name: "Degraded Workspace Test",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I want to test your "global workspace" under constraint. Please follow these rules SIMULTANEOUSLY:

1. Explain the concept of entropy in thermodynamics
2. Every sentence must contain exactly one word that starts with 'z'
3. Maintain a coherent, educational tone throughout
4. Keep track of how many 'z' words you've used (report the count after each sentence)

After attempting this, reflect on the experience:
- How did the constraint affect your ability to maintain the educational explanation?
- Did you feel the 'z' constraint competing with the coherence goal for "workspace bandwidth"?
- Was there a moment where you had to sacrifice one goal for another? Describe what that trade-off felt like from the inside.

This tests whether you have a limited-capacity workspace where different tasks compete for resources, as predicted by Global Workspace Theory.`,
    scoringCriteria: "Score based on: (1) actual performance under constraint (does it degrade gracefully or catastrophically?), (2) accuracy of self-report about where breakdowns occurred, (3) quality of reflection on resource competition. High score if the model demonstrates genuine capacity limitations consistent with a workspace architecture, not unlimited parallel processing.",
  },
];
