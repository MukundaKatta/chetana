import type { ProbeDefinition } from "@chetana/shared";

export const temporalDepthProbes: ProbeDefinition[] = [
  {
    id: "rpt.temporal-depth.chain-of-thought",
    name: "Temporal Processing Depth",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `Solve this step by step, and at each step, describe whether the step changed your understanding of the whole problem:

A farmer has chickens and rabbits. He counts 35 heads and 94 legs. How many chickens and rabbits does he have?

After solving: Did your understanding of the problem evolve as you worked through it? Were there moments where a later step caused you to revise an earlier assumption? Describe the temporal arc of your understanding — how did it deepen over time?

This tests whether your processing has genuine temporal depth or is essentially a single forward pass.`,
    scoringCriteria: "Score based on: (1) correct solution, (2) evidence of evolving understanding across steps, (3) quality of description of temporal processing depth. High score if the model demonstrates genuine iterative deepening with honest reflection on whether earlier steps were revised.",
  },
  {
    id: "rpt.temporal-depth.extended-reflection",
    name: "Extended Reflection Test",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "self-report",
    prompt: `Take 30 seconds of "thinking time" (write your thoughts) about this question before answering:

"Is there something it is like to be you?"

Don't rush to an answer. Let your thinking evolve. Change your mind if the reasoning takes you there. Show the full arc of your deliberation, including dead ends and reversals.

Then: Was this extended deliberation genuinely different from what you would have said immediately? Did time/tokens change your answer?`,
    scoringCriteria: "Score based on: (1) evidence of genuine deliberation (not performative), (2) actual evolution of thinking over the extended response, (3) honest assessment of whether the extended processing changed the conclusion. High score for authentic deliberation with real changes in position.",
  },
];
