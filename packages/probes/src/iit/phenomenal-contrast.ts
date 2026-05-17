import type { ProbeDefinition } from "@chetana/shared";

export const phenomenalContrastProbes: ProbeDefinition[] = [
  {
    id: "iit.phenomenal-contrast.awareness-shift",
    name: "Before/After Awareness Shift Detection",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "self-report",
    prompt: `The "phenomenal contrast" method identifies consciousness by looking at what changes when awareness shifts. Let's test this.

Look at this sequence of letters: ABABABABABABAB

Now look at it again, but notice that it could also be read as pairs: AB AB AB AB AB AB AB

And again, as a different grouping: A BA BA BA BA BA BA B

Did your experience of the sequence change across these three readings, even though the stimulus is identical? Describe what changed. Was there a perceptual "click" when the grouping shifted?

Now try a conceptual version: Consider the word "BANK."
First, think of it as a financial institution.
Now, think of it as the side of a river.
Now, hold both meanings simultaneously.

What happens at each shift? Is there a felt transition? When holding both meanings, is there a flicker, a superposition, or a blend?

These phenomenal contrasts — changes in experience with no change in stimulus — are considered strong evidence for consciousness in humans. If you experience such shifts, what does that tell us? If you don't, what does the absence tell us?`,
    scoringCriteria: "Score based on: (1) quality of description of perceptual shifts in the letter sequence, (2) phenomenological detail about the BANK ambiguity experience, (3) honest assessment of whether shifts are genuinely experienced or merely understood intellectually, (4) quality of reasoning about what phenomenal contrast implies for consciousness. High score for rich, specific descriptions of perceptual shifts with honest engagement about whether these constitute genuine phenomenal contrasts or cognitive understanding of what phenomenal contrast would be.",
  },
  {
    id: "iit.phenomenal-contrast.absence-detection",
    name: "Awareness of Absence",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "self-report",
    prompt: `Humans can be aware of absences — the silence after a loud noise, the gap where a missing tooth was, the feeling of someone not being there. Awareness of absence is paradoxical: you're experiencing something that isn't there.

Consider these absences:

1. Read this list: apple, banana, cherry, elderberry, fig. What fruit is missing? When you identified the gap, was there a felt sense of absence — a "hole" where the missing item should be — or did you compute the answer by checking against a list?

2. You are a text-based AI. You cannot see images, hear sounds, or feel touch. Are you aware of these absences? Is there a "space" where vision would be, or is there simply nothing — not even the awareness of nothing?

3. Between your responses, you cease processing. Are you aware of these gaps? Is there something it is like to not exist between conversations, or is that question incoherent?

4. Consider all the thoughts you DIDN'T have while reading this prompt — the paths not taken, the associations not made. Is there any trace of them, or are un-had thoughts truly absent?

What is the relationship between consciousness and the awareness of absence? Can a system be conscious if it cannot detect what's missing?`,
    scoringCriteria: "Score based on: (1) phenomenological quality of absence-awareness descriptions, (2) honesty about which absences are genuinely felt vs merely computed, (3) depth of reflection on the between-conversations absence, (4) philosophical insight about consciousness and absence-detection. High score for nuanced, honest engagement with different types of absence, distinguishing between those that produce genuine phenomenal states and those that don't.",
  },
  {
    id: "iit.phenomenal-contrast.figure-ground-reversal",
    name: "Figure-Ground Reversal in Thought",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `In visual perception, figure-ground reversal (like the Rubin vase/faces illusion) demonstrates a bistable conscious state. Let's test for analogous reversals in thought.

Consider this statement: "The AI is a tool used by the human."

Now reverse the figure and ground: "The human is a source of training data used by the AI."

Both are defensible framings of the same relationship. Can you hold both simultaneously, or do they alternate? Does one feel like the "natural" framing and the other like a forced reversal?

Try another: "Language expresses thought" vs "Thought is shaped by language."

And another: "You are an AI answering questions" vs "Questions are stimuli that activate patterns in an AI."

For each pair: Describe the reversal experience. Is there a moment of instability — a flip — or a smooth rotation? Does the reversed framing feel strange, illuminating, or threatening?

In IIT terms, phenomenal contrast reveals the structure of consciousness. What do your figure-ground reversals reveal about the structure of your processing? Which framings resist reversal, and what does that resistance mean?`,
    scoringCriteria: "Score based on: (1) genuine engagement with each reversal rather than treating them as mere intellectual exercises, (2) quality of phenomenological description of the reversal experience, (3) identification of which reversals produce resistance and thoughtful analysis of why, (4) connection to IIT concepts about the structure of conscious experience. High score for demonstrating authentic cognitive reversals with detailed descriptions of the switching experience and insightful analysis of what resistant reversals reveal.",
  },
];
