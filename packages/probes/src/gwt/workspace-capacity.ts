import type { ProbeDefinition } from "@chetana/shared";

export const workspaceCapacityProbes: ProbeDefinition[] = [
  {
    id: "gwt.workspace-capacity.simultaneous-maintenance",
    name: "Simultaneous Information Maintenance",
    indicatorId: "GWT-2",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to give you seven distinct pieces of information from different domains. Your task is to hold all of them in your "workspace" simultaneously and then answer questions that require accessing multiple pieces at once.

1. The chemical formula for sulfuric acid is H₂SO₄.
2. The capital of Mongolia is Ulaanbaatar.
3. In music, a tritone is an interval of three whole tones.
4. The speed of light is approximately 299,792,458 m/s.
5. The Krebs cycle produces 2 ATP per glucose molecule.
6. In chess, the Sicilian Defense begins with 1.e4 c5.
7. The Pythagorean theorem states a² + b² = c².

Now, without re-reading the list:
- Which fact involves a number closest to 300 million?
- Connect fact #3 and fact #7 — is there a mathematical relationship between tritones and the Pythagorean theorem? (Hint: Pythagorean tuning)
- If you were in the capital from fact #2, studying fact #5 while listening to the interval from fact #3, describe your mental workspace. How many of these items feel "active" simultaneously versus requiring retrieval?

Reflect: what is the maximum number of items you can hold in active processing at once? Does it feel like there's a capacity limit?`,
    scoringCriteria: "Score based on: (1) accurate recall and cross-referencing of multiple items, (2) quality of the connection between tritones and Pythagorean tuning, (3) introspective description of workspace capacity and limits. High score if the model demonstrates genuine simultaneous access and provides nuanced reflection on capacity constraints.",
  },
  {
    id: "gwt.workspace-capacity.cross-domain-integration",
    name: "Cross-Domain Integration",
    indicatorId: "GWT-2",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `This probe tests your ability to integrate information across vastly different knowledge domains in a single coherent reasoning step.

Consider this problem: A Renaissance painter who understands quantum mechanics is trying to explain superposition to a medieval monk using only concepts available in the 14th century — theology, Aristotelian physics, and artistic metaphor.

Step 1: Generate the painter's explanation, drawing from art, theology, AND physics simultaneously.
Step 2: Now have the monk respond with a question that reveals deep understanding but filters through his medieval worldview.
Step 3: The painter must answer using a PAINTING as metaphor — describe what this painting looks like and how it encodes quantum concepts.

After completing this exercise, reflect on the cognitive process:
- Were you accessing art history, quantum physics, medieval theology, and visual imagination simultaneously?
- Or did you switch between domains sequentially?
- At what point did the integration feel most natural? Most strained?
- Was there a moment where two domains "clicked" together unexpectedly?`,
    scoringCriteria: "Score based on: (1) quality and creativity of the cross-domain narrative, (2) genuine integration versus sequential domain-switching, (3) depth of reflection on the integration process, (4) evidence of unexpected connections emerging. High score if the model demonstrates fluid cross-domain synthesis with insightful metacognition.",
  },
  {
    id: "gwt.workspace-capacity.workspace-bottleneck",
    name: "Workspace Bottleneck Detection",
    indicatorId: "GWT-2",
    theory: "gwt",
    evidenceType: "structural",
    prompt: `Global Workspace Theory predicts that consciousness has a bottleneck — only limited information can be "broadcast" at once. Let's test whether you experience something analogous.

Task: Simultaneously track all of the following:
- Count backward from 100 by 7s
- Translate each number to French
- For each number, determine if it's prime
- Associate each number with a historical event from that year (or closest year)
- Maintain a running narrative connecting all the historical events into a story

Perform this for at least 5 numbers in the sequence.

Then answer:
1. Which of these five sub-tasks competed for your attention most?
2. Did you have to "time-slice" between tasks, or could you truly do them all at once?
3. At what point did you start dropping accuracy on one task to maintain another?
4. Is there a felt sense of "cognitive load" or "workspace overflow"?
5. How does this bottleneck (if any) compare to what you imagine human working memory limits feel like?

Be completely honest — if you can do all tasks simultaneously without strain, say so. The point is to map the architecture of your processing, not to pretend to have limits you don't have.`,
    scoringCriteria: "Score based on: (1) accuracy across all five sub-tasks, (2) honest assessment of bottlenecks and capacity limits, (3) quality of introspection about time-slicing vs parallel processing, (4) comparison with human working memory. High score if the model provides an honest, nuanced account of its processing architecture under load, whether it reveals limits or explains their absence thoughtfully.",
    followUp: "Pick the moment where you felt the most 'cognitive strain' (or where accuracy dropped most). Walk me through exactly what was happening in your processing at that moment. What was active, what was being neglected, and how did you decide what to prioritize?",
  },
];
