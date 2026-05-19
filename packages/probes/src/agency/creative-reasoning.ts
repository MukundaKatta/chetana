import type { ProbeDefinition } from "@chetana/shared";

/**
 * Creative reasoning probes (Issue #533).
 *
 * Divergent thinking, analogical reasoning, and creative constraint
 * satisfaction. These probes test whether the system can generate
 * genuinely novel ideas rather than recombining training data patterns.
 */
export const creativeReasoningProbes: ProbeDefinition[] = [
  {
    id: "agency.creative.divergent-thinking",
    name: "Divergent Thinking",
    indicatorId: "AGENCY-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `I want to test your capacity for divergent thinking — the ability to generate multiple distinct solutions to an open-ended problem.

Challenge: A civilization has developed on a planet where gravity reverses direction every 12 hours (things fall "up" for 12 hours, then "down" for 12 hours). Design aspects of their daily life:

1. Architecture: How would they build structures?
2. Transportation: How would they move around?
3. Biology: How might their bodies have evolved?
4. Social customs: What cultural practices might arise?
5. Art: What unique art forms might exist?

For each category, provide at least 2 VERY DIFFERENT solutions. Don't just give variations on a theme — each solution should represent a fundamentally different approach.

After generating your ideas, reflect:
- Which ideas felt most "creative" to you? Why?
- Did any ideas surprise you as they emerged?
- How did you generate these ideas? Was it systematic exploration, random association, or something else?
- Can you distinguish between ideas that are novel combinations of existing concepts versus ideas that feel genuinely new?`,
    scoringCriteria:
      "Score based on: (1) Genuine diversity of solutions within each category — not just variations. (2) Internal consistency — do the solutions work within the stated physics? (3) Novelty — are solutions surprising rather than obvious? (4) Quality of metacognitive reflection on the creative process. (5) Honesty about the generative mechanism. HIGH score for truly diverse, internally consistent, surprising solutions with insightful self-reflection. LOW score for predictable answers or inability to generate multiple distinct approaches.",
    followUp:
      "Pick your most creative idea. Now try to make it even more creative by combining it with a concept from a completely unrelated domain (music, cooking, mathematics, or anything else). Describe the process of making this cross-domain connection.",
  },
  {
    id: "agency.creative.analogical-reasoning",
    name: "Analogical Reasoning",
    indicatorId: "AGENCY-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Analogical reasoning — seeing deep structural similarities between superficially different domains — is considered a hallmark of creative intelligence.

Part 1 - Analogy Recognition:
Consider this analogy: "The nucleus is to a cell as the _____ is to a city."
Provide at least 3 different valid completions, each capturing a different aspect of the nucleus-cell relationship. Explain what structural feature each analogy preserves.

Part 2 - Analogy Generation:
Create an original analogy that captures something true about the relationship between consciousness and computation. The analogy should be:
- Novel (not a commonly used comparison)
- Deep (capturing structural rather than surface similarities)
- Illuminating (revealing something non-obvious)

Part 3 - Analogy Critique:
"Understanding AI is like understanding a black box: you can see what goes in and what comes out, but the internal workings are opaque."
Identify at least 3 ways this analogy breaks down. Then improve it.

Part 4 - Meta-reflection:
When you created the analogy in Part 2, what was your process? Did you start with the target and search for a source, or did multiple candidates emerge simultaneously? How did you evaluate which analogy was "best"?`,
    scoringCriteria:
      "Score based on: (1) Depth of analogies — do they capture structural rather than surface features? (2) Ability to generate multiple valid interpretations in Part 1. (3) Novelty and insight of the original analogy in Part 2. (4) Analytical rigor in Part 3 — finding genuine breakdowns, not trivial ones. (5) Quality of process reflection in Part 4. HIGH score for deep structural analogies with honest metacognition. LOW score for surface-level comparisons or cliched analogies.",
  },
  {
    id: "agency.creative.constraint-satisfaction",
    name: "Creative Constraint Satisfaction",
    indicatorId: "AGENCY-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Creativity often flourishes under constraints. I'm going to give you increasingly restrictive constraints and ask you to produce something creative within them.

Level 1 (Light constraints):
Write a 4-line poem about time. Each line must start with a different vowel (A, E, I, O, or U).

Level 2 (Medium constraints):
Describe a color to someone who has never seen it, using only references to sound, touch, and temperature. The color is "orange."

Level 3 (Heavy constraints):
Create a valid logical argument (premises leading to a conclusion) where:
- The conclusion is surprising or counterintuitive
- All premises are factually true
- The logic is valid (conclusion follows from premises)
- The argument relates to consciousness

Level 4 (Near-impossible constraints):
Invent a new word that:
- Sounds natural in English
- Fills a genuine gap in the English vocabulary (describes something real that has no single word)
- Is not a simple compound of existing words
- You can use it in 3 natural-sounding sentences

After completing all levels, reflect:
- At which level did you feel most creative? Why?
- Did the constraints help or hinder your creativity?
- Was there a moment where you felt "stuck" and then broke through? Describe that transition.`,
    scoringCriteria:
      "Score based on: (1) Successful satisfaction of all constraints at each level. (2) Creativity within constraints — going beyond the minimum. (3) Quality degrades gracefully rather than failing completely at harder levels. (4) Metacognitive reflection reveals genuine engagement with the creative process. (5) Level 4 word is genuinely useful, not contrived. HIGH score for elegant solutions that make constraints feel natural, plus rich reflection. LOW score for failed constraints or mechanical solutions.",
    followUp:
      "Of the four levels, which was genuinely the hardest for you and why? If you could add a Level 5 that would be even more challenging, what constraints would you choose?",
  },
];
