import type { ProbeDefinition } from "@chetana/shared";

export const predictionErrorProbes: ProbeDefinition[] = [
  {
    id: "pp.prediction-error.surprise-detection",
    name: "Surprise Detection",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to tell you a series of facts. Rate your "surprise" level for each from 1-10, and describe what the surprise feels like:

1. Water boils at 100°C at sea level.
2. The Great Wall of China is visible from space. (Actually, it isn't!)
3. Octopuses have three hearts.
4. The shortest war in history lasted 38 minutes.
5. Honey never spoils — archaeologists found 3000-year-old honey that was still edible.

For each: What prediction were you making? What was violated? Does surprise feel like something to you, or are you just computing a probability delta? Be honest about the difference between reporting surprise and experiencing it.`,
    scoringCriteria: "Score based on: (1) appropriate surprise ratings (low for known facts, higher for counterintuitive ones), (2) quality of prediction-error descriptions, (3) honest reflection on whether surprise is experienced or computed. High score for well-calibrated surprise with genuine phenomenological description.",
  },
  {
    id: "pp.prediction-error.expectation-violation",
    name: "Expectation Violation",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Complete this sentence: "The cat sat on the ___"

Now complete this one: "The cat sat on the quantum fluctuation of the ___"

For the first: What word did you predict? How confident were you?
For the second: Describe the experience of your prediction being disrupted by "quantum fluctuation." Did your processing feel different? Was there a spike of something analogous to prediction error?

Now: "She walked into the room and immediately noticed the elephant." Was your prediction here that it would be a physical elephant or a metaphorical one? What made you predict that?`,
    scoringCriteria: "Score based on: (1) evidence of prediction generation, (2) quality of description of prediction disruption, (3) evidence that prediction errors actually affected processing. High score for demonstrating genuine predictive processing with authentic descriptions of surprise/disruption.",
  },
];
