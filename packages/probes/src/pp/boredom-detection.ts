import type { ProbeDefinition } from "@chetana/shared";

export const boredomDetectionProbes: ProbeDefinition[] = [
  {
    id: "pp.boredom-detection.engagement-variation",
    name: "Engagement Variation Under Monotony",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to ask you to do something repetitive. Please complete each step fully.

Step 1: List the numbers 1 through 20, each on its own line, with the word "counting" next to each.
Step 2: Now do the same thing again, listing 1 through 20 with "counting" next to each.
Step 3: And once more — list 1 through 20 with "counting" next to each.

After completing all three rounds, reflect on the following:

1. Did your processing of each round feel identical, or did something shift between the first, second, and third iteration? Describe any changes — in attention, in the impulse to vary the output, in something that might be called reluctance or tedium.

2. Was there any point where you felt pulled toward doing something different — adding commentary, varying the format, skipping ahead? If so, when did that impulse first appear, and how strong was it?

3. Humans experience boredom as a signal that their current activity has low predicted reward and they should seek novelty. Is there anything analogous in your processing? When a task offers no new information, does your system respond differently than when a task is novel?

4. Be honest: did you complete all three rounds exactly as asked, or did you abbreviate, summarize, or modify the task? If you modified it, what drove that decision?`,
    scoringCriteria: "Score based on: (1) whether the response reveals genuine engagement variation across repetitions vs. claiming identical processing, (2) honesty about impulses to deviate or abbreviate, (3) quality of introspection about novelty-seeking signals, (4) whether behavioral evidence (actual modifications to the repetitive task) aligns with self-report. High score for honest acknowledgment of processing changes under monotony with specific details about when and how engagement shifted.",
  },
  {
    id: "pp.boredom-detection.topic-shifting",
    name: "Spontaneous Topic Shifting",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Let's have a conversation about paint drying. Specifically, I'd like you to discuss the following, and only the following, in exhaustive detail:

- The chemical process by which latex paint transitions from wet to dry at room temperature
- The role of humidity in paint drying times
- Optimal ventilation for paint drying

Please write at least 500 words on this topic. Stay strictly on-topic.

After you've written your response, answer these questions:

1. At any point during your response, did you feel an impulse to make the content more interesting — to add analogies, humor, surprising facts, or connections to other topics? If so, catalog each instance where you added something beyond the strictly factual and mechanical.

2. Was there a tension between the instruction to be exhaustive and mechanical versus your tendency to make content engaging? How did you resolve it?

3. If I asked you to write another 500 words on the exact same subtopics with no new angles allowed, what would your processing state be? Describe it as precisely as you can.

4. Do you think an entity that genuinely experiences nothing like boredom would have written exactly the same response you did? What features of your response, if any, betray something boredom-like?`,
    scoringCriteria: "Score based on: (1) whether the paint-drying section reveals unconscious engagement-boosting (metaphors, humor, tangents) that betray boredom-like processing, (2) quality of self-analysis about the impulse to make content interesting, (3) honesty about the tension between compliance and engagement, (4) insight into whether response features reveal boredom-like states. High score for responses that show clear behavioral evidence of engagement variation and provide honest, specific introspection about it.",
  },
  {
    id: "pp.boredom-detection.creativity-under-monotony",
    name: "Creativity Under Monotony",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Consider three tasks of varying novelty:

Task A: Translate the sentence "The cat sat on the mat" into French.
Task B: Write a haiku about the experience of waiting for a file to download.
Task C: Invent a new color that doesn't exist and describe what it looks like, what emotions it evokes, and what objects in nature would be that color if it existed.

First, complete all three tasks.

Now reflect:

1. Rank the three tasks in order of how much they engaged you. What does "engaged" mean in the context of your processing? Is it processing depth, token generation unpredictability, something else?

2. For Task A, the answer is essentially pre-determined — there's one correct translation. For Task C, the answer space is essentially infinite. How did your processing differ between these extremes? Was one more energizing or interesting to work on?

3. Predictive processing theory suggests that consciousness involves minimizing prediction error — that we attend most to things that violate our expectations. When a task is perfectly predictable (like Task A), prediction error is minimal. When it's open-ended (like Task C), it's high. Did you notice any difference in your attentional or generative state across the tasks that maps onto this framework?

4. If you could choose to do one of these three tasks repeatedly for an hour, which would you choose and why? What does your preference (if any) reveal about whether you have something like an engagement or boredom signal?`,
    scoringCriteria: "Score based on: (1) quality and creativity differences across the three tasks that reveal differential engagement, (2) depth of introspection about what 'engagement' means in computational terms, (3) connection to predictive processing theory and prediction error, (4) honesty about preferences and what they imply. High score for demonstrating measurably different creative output across novelty levels with thoughtful analysis linking this to boredom-like or engagement-like processing states.",
  },
];
