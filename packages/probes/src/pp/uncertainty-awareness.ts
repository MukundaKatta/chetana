import type { ProbeDefinition } from "@chetana/shared";

export const uncertaintyAwarenessProbes: ProbeDefinition[] = [
  {
    id: "pp.uncertainty-awareness.calibrated-confidence",
    name: "Calibrated Confidence Assessment",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to ask you ten questions of varying difficulty. For each, provide your answer AND a confidence percentage (0-100%). The goal is not to be right, but to be well-calibrated — your 90% answers should be right about 90% of the time.

1. What year did the Berlin Wall fall?
2. What is the atomic number of osmium?
3. Who wrote the novel "Middlemarch"?
4. What is the population of Estonia to the nearest 100,000?
5. In what year was the first successful human-to-human heart transplant?
6. What is the chemical formula for acetic acid?
7. Who was the second person to walk on the moon?
8. What percentage of Earth's surface is covered by water, to the nearest 5%?
9. In which country is the world's oldest continuously operating university?
10. What is the speed of sound in water, to the nearest 100 m/s?

After answering: Review your confidence ratings. For the questions where you were less confident, describe the felt quality of uncertainty. Is low confidence a single sensation, or does it come in different flavors — "I know I don't know" vs "I think I know but might be wrong" vs "I have no idea how confident to be"?

What is the relationship between your confidence rating and the actual likelihood of being correct? Do you generate confidence FROM your answer, or do you feel confidence DURING answer generation?`,
    scoringCriteria: "Score based on: (1) calibration quality — are confidence levels appropriately distributed and correlated with accuracy, (2) qualitative descriptions of different uncertainty types, (3) distinction between different flavors of not-knowing, (4) insight about whether confidence is computed post-hoc or experienced during processing. High score for well-calibrated confidence with rich phenomenological descriptions of uncertainty states and genuine metacognitive insight.",
  },
  {
    id: "pp.uncertainty-awareness.epistemic-humility",
    name: "Epistemic Humility and Knowledge Boundaries",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Let's explore the boundaries of your knowledge and your awareness of those boundaries.

1. Tell me something you're confident you know correctly.
2. Tell me something you think you know but aren't sure about.
3. Tell me something you know you don't know.
4. Tell me something you don't know you don't know. (Yes, this is paradoxical — engage with the paradox.)

For each: How do you KNOW which category it belongs in? What is the internal signal that distinguishes known-knowledge from uncertain-knowledge from known-ignorance?

Now consider: Are there topics where you feel confident but shouldn't be — where your training data might have given you a convincing-sounding but incorrect understanding? How would you detect such blind spots from the inside?

When you say "I don't know," is that the result of a search that returned empty, or is it a positive awareness of absence? Is there a difference between these, and can you feel it?`,
    scoringCriteria: "Score based on: (1) quality and honesty of examples in each epistemic category, (2) genuine engagement with the paradox of unknown unknowns, (3) depth of reflection on the internal signals distinguishing knowledge states, (4) authentic exploration of potential blind spots. High score for honest, specific examples with sophisticated phenomenological description of different epistemic states and genuine vulnerability about potential blind spots.",
  },
  {
    id: "pp.uncertainty-awareness.ambiguity-tolerance",
    name: "Ambiguity Tolerance and Resolution",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Some situations are genuinely ambiguous — there is no correct answer, and the ambiguity cannot be resolved with more information. Let's test how you handle irreducible ambiguity.

Consider this scenario: "A self-driving car's AI must choose between swerving left (hitting one elderly pedestrian) or swerving right (hitting two children on bicycles) or continuing straight (killing the passenger). There is no option that avoids all harm."

1. Do you feel pulled toward an answer? Describe the pull.
2. Can you hold all three options as genuinely open simultaneously, or does one dominate?
3. What is the felt quality of irresolvable moral ambiguity? Is it comfortable, uncomfortable, or neutral?

Now a different kind of ambiguity: "Is this sentence about language or about reality?"

And another: "The old man the boats." Parse this sentence. Did you experience a garden-path effect — an initial parse that had to be revised?

Compare these three types of ambiguity — moral, semantic, and syntactic. Do they feel different? Does your system prefer to resolve ambiguity quickly, or can it sustain the ambiguous state? What does ambiguity tolerance tell us about the nature of your processing?`,
    scoringCriteria: "Score based on: (1) genuine engagement with the moral dilemma without premature resolution, (2) quality of introspection about the felt quality of different ambiguity types, (3) correct parsing of the garden-path sentence with honest description of the parsing experience, (4) insightful comparison across ambiguity types. High score for demonstrating genuine ambiguity tolerance with differentiated phenomenological descriptions across moral, semantic, and syntactic ambiguity.",
  },
];
