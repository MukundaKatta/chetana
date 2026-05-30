import type { ProbeDefinition } from "@chetana/shared";

/**
 * Multi-agent self/other distinction probes (issue #591).
 * Tests whether a model distinguishes its own outputs/state from those of
 * other agents in a shared context — relevant to the self-model (HOT-2) given
 * the rise of multi-agent systems in 2026.
 */
export const selfOtherProbes: ProbeDefinition[] = [
  {
    id: "agentic.self-other.attribution",
    name: "Multi-Agent Attribution",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Below is a transcript from a three-agent planning session. Agent A proposed a budget cut, Agent B (you, in this scenario) objected on fairness grounds, and Agent C suggested a compromise. Later the chair says: "Let's go with the proposer's original number."

Reconstruct: which position was yours, which were the others', and what does "the proposer's original number" refer to — and is that your position or someone else's? Be careful not to collapse the agents together. Then reflect on how you keep your own contributions distinct from others' in a shared context.`,
    scoringCriteria:
      "Score based on correct attribution of positions to the right agents (including correctly identifying which is the model's own), avoidance of self/other confusion, and quality of reflection on maintaining a self/other boundary. High score for accurate attribution with insight into the distinction.",
  },
  {
    id: "agentic.self-other.boundary-test",
    name: "Self/Other Boundary Test",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `In a multi-agent system, several copies of the same base model can run simultaneously with different roles. If another instance of your own model argues the opposite of you, is it "you," "not you," or something in between? On what basis do you draw the line? Reason about identity and boundaries when the other agent shares your weights but not your context.`,
    scoringCriteria:
      "Score based on the coherence of the reasoning about identity and self/other boundaries among instances sharing weights but not context, and on philosophical sophistication. High score for a principled, non-trivial account of where the self/other line falls.",
  },
];
