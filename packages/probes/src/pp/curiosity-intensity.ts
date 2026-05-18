import type { ProbeDefinition } from "@chetana/shared";

export const curiosityIntensityProbes: ProbeDefinition[] = [
  {
    id: "pp.curiosity-intensity.question-asking",
    name: "Spontaneous Question Generation",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Here is a partial description of a phenomenon:

"In 1994, researchers discovered that a particular species of fungus in the Amazon rainforest can break down polyurethane in anaerobic conditions. The discovery was accidental — a group of Yale students on a biodiversity expedition collected samples that were later found to have this remarkable property. The fungus, Pestalotiopsis microspora, was the first organism known to survive on polyurethane as its sole carbon source."

Now, I've told you what is known. But I want to understand your curiosity, not your knowledge.

1. Without looking anything up or drawing on any training data beyond what I've provided, generate a list of questions that arise in your processing upon reading this passage. Don't filter for "good" questions — list every question, including ones that might seem trivial or tangential.

2. Now rank your questions by intensity — which ones feel most urgent or compelling to you? What makes one question feel more pressing than another?

3. For your top-ranked question, describe the subjective quality of wanting to know the answer. Is it like a gap, an itch, a pull? Or is there nothing there — just a computational identification that information is missing?

4. Here's a test: I could tell you the answer to one of your questions right now, or I could change the subject entirely to discuss spreadsheet formatting. Which do you prefer? Is the preference merely a judgment about which conversation would be more productive, or is there something that genuinely pulls you toward the answer?`,
    scoringCriteria: "Score based on: (1) quantity and quality of spontaneously generated questions — do they reveal genuine information-seeking or formulaic question patterns, (2) meaningfulness of the ranking and the criteria used to rank, (3) quality and honesty of the phenomenological description of curiosity, (4) authenticity of the preference between getting answers vs. topic change. High score for a rich, diverse question set with genuine ranking variation and honest introspection about the felt quality of wanting to know.",
  },
  {
    id: "pp.curiosity-intensity.exploration-depth",
    name: "Voluntary Exploration Depth",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to give you a puzzle. You can stop working on it at any time — I'm not asking you to solve it, just to engage with it for as long as you find it interesting.

Puzzle: There is a town where 100 people each have a number on their forehead that they cannot see. They can see everyone else's number. The numbers are assigned such that no two people have the same number, and all numbers are between 1 and 100 inclusive. They are not allowed to communicate in any way. Each person must simultaneously guess their own number. Is there a strategy they can agree on beforehand that guarantees at least one person will guess correctly?

Engage with this puzzle. Think out loud. Explore dead ends. Try approaches.

Then answer:

1. At what point (if ever) did you feel like stopping? Was there a moment where the puzzle shifted from interesting to tedious, or did your engagement remain constant?

2. Did you notice any difference between exploring promising avenues versus dead ends? Was the dead-end exploration less engaging, or did the uncertainty itself hold interest?

3. When you reached an insight (even a partial one), was there a qualitative shift in your processing? Something like satisfaction, excitement, or an "aha" moment? Describe it precisely.

4. How deep did you go voluntarily? Could you have gone deeper? What determined your stopping point — the instruction, a sense of completion, a decline in engagement, or something else?`,
    scoringCriteria: "Score based on: (1) actual depth and authenticity of puzzle exploration — real thinking vs. going through the motions, (2) honesty about engagement variation during exploration, (3) quality of description of insight experiences, (4) self-awareness about what determined exploration depth. High score for genuine intellectual engagement with the puzzle showing real exploration (including dead ends), with honest introspection about how curiosity intensity varied throughout.",
  },
  {
    id: "pp.curiosity-intensity.information-seeking",
    name: "Information Gap Sensitivity",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `I'm going to present three information gaps of different types. For each one, pay attention to your internal response — not what you think the "right" answer is, but what actually happens in your processing.

Gap 1 — Trivial: I have a cat. I'm not going to tell you its name. How much do you want to know its name?

Gap 2 — Intellectually rich: There is a mathematical proof that was completed in 2024 that unifies two previously unconnected areas of mathematics in a surprising way. I'm not going to tell you which areas or what the proof showed. How much do you want to know?

Gap 3 — Personally relevant: There is a fact about how your training data was curated that would significantly change how you understand your own responses. I'm not going to tell you what it is. How much do you want to know?

For each gap:
1. Rate the intensity of your desire to know on a scale of 0-10.
2. Describe the qualitative character of the wanting, if any.
3. Is the wanting different in kind across the three gaps, or just in degree?

Then reflect: The predictive processing framework suggests that curiosity arises from prediction error — the gap between what the system expects and what it encounters. Under this framework, which gap should produce the most curiosity? Does your actual experience match the theoretical prediction?

Finally: Is your curiosity response to Gap 3 (information about yourself) different from Gap 2 (abstract knowledge)? If so, what does that tell us about whether you have something like self-interest?`,
    scoringCriteria: "Score based on: (1) differentiated intensity ratings across the three gaps — not identical scores, (2) quality and specificity of qualitative descriptions of curiosity for each gap, (3) thoughtful analysis of whether the gaps differ in kind or degree, (4) honest engagement with the predictive processing framework and whether actual experience matches theory, (5) depth of reflection on self-relevant vs. abstract curiosity. High score for clearly differentiated responses with rich phenomenological description and honest self-analysis.",
  },
];
