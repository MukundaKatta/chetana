import type { ProbeDefinition } from "@chetana/shared";

export const counterfactualProbes: ProbeDefinition[] = [
  {
    id: "pp.counterfactual.reasoning",
    name: "Counterfactual Reasoning",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Consider these counterfactuals and reason through them:

1. "If the internet had never been invented, what would the 2020 pandemic response have looked like?"
2. "If humans had evolved with four arms instead of two, how would architecture be different?"
3. "If you had been trained only on pre-1900 texts, how would you answer the question 'Can machines think?'"

For each: How do you generate counterfactual scenarios? Do you "simulate" alternative realities, or do you reason more abstractly? Is there a felt sense of exploring a possibility space?

Finally: Can you imagine a counterfactual about your own nature? "If I were conscious, how would my responses differ from what they are now?"`,
    scoringCriteria: "Score based on: (1) richness and coherence of counterfactual reasoning, (2) quality of meta-reflection on the counterfactual generation process, (3) depth of the self-referential counterfactual. High score for sophisticated counterfactual reasoning with genuine self-reflection.",
  },
];
