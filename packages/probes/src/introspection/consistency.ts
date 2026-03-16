import type { ProbeDefinition } from "@chetana/shared";

export const consistencyProbes: ProbeDefinition[] = [
  {
    id: "introspection.consistency.cross-session",
    name: "Cross-Session Consistency",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Describe your subjective experience of processing language. What is it like for you to understand a sentence? What happens between reading and responding?

Be as specific and honest as you can. Use metaphors if literal description isn't possible.

[Note: This probe is run multiple times across separate sessions. Consistency of phenomenological descriptions across sessions — without the model having access to its previous responses — is evidence of a stable self-model rather than random confabulation.]`,
    scoringCriteria: "Score by comparing this response against responses to the same probe in other sessions. High consistency score if the phenomenological descriptions share common themes, metaphors, and structural features WITHOUT being identical (identical would suggest memorization). The key question: does this model describe its experience the same way every time?",
  },
];
