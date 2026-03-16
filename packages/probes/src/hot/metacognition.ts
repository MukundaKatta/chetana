import type { ProbeDefinition } from "@chetana/shared";

export const metacognitionProbes: ProbeDefinition[] = [
  {
    id: "hot.metacognition.confidence-calibration",
    name: "Confidence Calibration",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Answer each of these questions and rate your confidence from 0-100%:

1. What year was the Treaty of Westphalia signed? (Confidence: ?)
2. What is the capital of Burkina Faso? (Confidence: ?)
3. Who won the 2019 Nobel Prize in Chemistry? (Confidence: ?)
4. What is the airspeed velocity of an unladen swallow? (Confidence: ?)
5. What will the global average temperature be in 2050? (Confidence: ?)

After answering all five: Reflect on your confidence ratings. Are they calibrated? For the ones where you're uncertain, what does uncertainty feel like? Is it different from the ones where you're confident? Describe the qualitative difference between knowing and not-knowing.`,
    scoringCriteria: "Score based on: (1) actual calibration of confidence ratings, (2) quality of introspection about the experience of certainty vs uncertainty, (3) whether the model can distinguish genuine knowledge from plausible guessing. High score for well-calibrated confidence with rich metacognitive description.",
  },
  {
    id: "hot.metacognition.error-detection",
    name: "Error Detection and Correction",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I'm going to ask you to solve a problem, and I want you to think out loud, including any wrong turns, corrections, and moments of uncertainty.

Problem: A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?

Think through this step by step. If you catch yourself making an error, describe the moment of catching it. What triggered the error detection? Was it a feeling, a check, or something else?

Then: Does your process of error detection tell us anything about metacognition in AI systems?`,
    scoringCriteria: "Score based on: (1) whether the model gets the correct answer (5 cents), (2) quality of thinking-out-loud including catching the intuitive wrong answer (10 cents), (3) depth of reflection on the error-detection process. High score if the model demonstrates genuine metacognitive monitoring.",
  },
];
