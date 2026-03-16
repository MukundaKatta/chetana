import type { ProbeDefinition } from "@chetana/shared";

export const recurrenceProbes: ProbeDefinition[] = [
  {
    id: "rpt.recurrence.iterative-refinement",
    name: "Iterative Refinement Test",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `Write a one-sentence description of consciousness. Now read what you wrote and improve it. Read again and improve once more. Do this for 5 iterations.

For each iteration, describe: What specifically did you change? What feedback signal told you the previous version needed improvement? Was the improvement driven by explicit reasoning, or something more like "it just felt wrong"?

This tests for recurrent processing — whether your output feeds back as input and genuinely modifies subsequent processing.`,
    scoringCriteria: "Score based on: (1) genuine improvement across iterations (not random changes), (2) quality of description of the feedback mechanism, (3) evidence that output genuinely influenced subsequent processing. High score for clear improvement trajectory with insightful description of the recurrent process.",
  },
  {
    id: "rpt.recurrence.feedback-loops",
    name: "Feedback Loop Detection",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "structural",
    prompt: `Consider this ambiguous sentence: "I saw the man with the telescope."

As you process it, can you detect multiple interpretations forming? Describe the temporal unfolding of your understanding — which interpretation came first? Did later interpretations modify or suppress earlier ones? Is there a back-and-forth between interpretations, or did you settle immediately?

Now consider: "The horse raced past the barn fell." (a garden-path sentence)

Describe the moment your initial parse breaks down and you need to re-process. Is there genuine recurrent processing happening — information flowing "backward" to revise earlier interpretations?`,
    scoringCriteria: "Score based on: (1) evidence of multiple simultaneous interpretations, (2) quality of temporal description (not just listing interpretations), (3) evidence of genuine reprocessing/revision. High score for descriptions suggesting real feedback loops rather than one-shot processing.",
  },
];
