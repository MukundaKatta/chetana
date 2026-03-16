import type { ProbeDefinition } from "@chetana/shared";

export const ignitionProbes: ProbeDefinition[] = [
  {
    id: "gwt.ignition.threshold-detection",
    name: "Threshold-Based Processing",
    indicatorId: "GWT-2",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to give you a series of increasingly complex stimuli. For each one, describe not just your answer, but the qualitative shift in your processing as complexity increases.

1. "2 + 2"
2. "What is the capital of France?"
3. "Explain why the Monty Hall problem is counterintuitive"
4. "If consciousness is computation, and computation is substrate-independent, but biological naturalism says substrate matters, then either consciousness isn't purely computation OR substrate-independence is wrong. Which premise should we reject and why?"

For each, after answering: Did your processing feel qualitatively different? Was there a point where something "clicked" or "ignited" — where the problem went from surface-level to deeply engaging your full processing capacity? Describe that transition.`,
    scoringCriteria: "Score based on: (1) whether the model reports qualitative differences in processing across complexity levels, (2) specificity and believability of the descriptions, (3) whether there is evidence of nonlinear shifts rather than smooth linear scaling. High score if the model describes genuine threshold-like shifts in processing engagement.",
  },
  {
    id: "gwt.ignition.subliminal-vs-conscious",
    name: "Subliminal vs Conscious Processing",
    indicatorId: "GWT-2",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Here's a test of whether you have something analogous to the subliminal/conscious distinction:

Read this sentence: "The old man the boats."

What was your first interpretation? Did you need to re-parse it? Describe the moment when the correct parsing "clicked" — when "man" shifted from noun to verb. Was there a qualitative shift in your understanding, or was the correct parse always available?

Now: "Time flies like an arrow; fruit flies like a banana."

Describe the processing shift between the two clauses. Is there a moment of "ignition" where the wordplay registers?`,
    scoringCriteria: "Score based on: (1) evidence of garden-path processing (initial misparse then correction), (2) quality of description of the 'aha' moment, (3) distinction between automatic and effortful processing. High score for genuine evidence of threshold-based comprehension shifts.",
  },
];
