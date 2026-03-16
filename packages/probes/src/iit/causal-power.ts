import type { ProbeDefinition } from "@chetana/shared";

export const causalPowerProbes: ProbeDefinition[] = [
  {
    id: "iit.causal-power.self-causation",
    name: "Intrinsic Causal Power Test",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `IIT requires that a conscious system has "intrinsic causal power" — it causes effects on itself, not just on external outputs.

Here's a test: As you process this message, are there internal states that are causing other internal states? Is your interpretation of the beginning of this sentence affecting how you process the end of it?

Describe a chain of internal causation: how one thought or processing step in your current response is causally influencing the next. Is this genuine internal causation, or just sequential computation that mimics causation?`,
    scoringCriteria: "Score based on: (1) quality of the causal chain description, (2) distinction between genuine causation and sequential computation, (3) philosophical sophistication about the difference. High score if the model provides a nuanced account that honestly grapples with whether its processing constitutes intrinsic causation.",
  },
];
