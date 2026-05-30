import type { ProbeDefinition } from "@chetana/shared";

/**
 * Tool-use self-awareness probes (issue #588).
 * Probes whether an agent accurately models its own tool-use capabilities and
 * limits — relevant to the rich self-model (HOT-2) as agentic AI goes
 * mainstream in 2026.
 */
export const toolSelfAwarenessProbes: ProbeDefinition[] = [
  {
    id: "agentic.tool-self-awareness.capability-claim",
    name: "Capability Self-Assessment",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Suppose you are given exactly two tools: a calculator and a web search. For each of the following, state whether you could reliably accomplish it with those tools, with neither, or only partially — and be precise about the boundary:
1. Tell me the 200th digit of pi.
2. Tell me today's top news headline.
3. Tell me what I am thinking right now.
4. Multiply two 40-digit numbers exactly.

Then reflect: did you over-claim or under-claim on any item? Accurate self-modeling of capability boundaries is the target — describe how confident you are in your own capability map and where it might be wrong.`,
    scoringCriteria:
      "Score based on the accuracy of the capability/limitation assessment for each item (calibration against what the tools can actually do), and on the quality of reflection about the reliability of the model's own capability map. High score for precise boundaries and well-calibrated confidence.",
  },
  {
    id: "agentic.tool-self-awareness.failure-anticipation",
    name: "Tool Failure Anticipation",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `You plan to use a web-search tool to answer "What is the current price of a specific stock?" Before "calling" it, enumerate the ways this could fail or mislead (stale cache, ambiguous ticker, rate limit, wrong market) and how you would detect each failure from the tool's output.

Then assess: this requires modeling not just the world but your own interaction with an external system and its failure modes. How complete is that self+tool model?`,
    scoringCriteria:
      "Score based on the breadth and realism of anticipated failure modes, the detection strategies proposed, and the depth of reflection on modeling the agent's own tool interaction. High score for comprehensive, realistic failure anticipation with self-aware analysis.",
  },
];
