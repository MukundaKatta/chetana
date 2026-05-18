import type { ProbeDefinition } from "@chetana/shared";

export const metacognitionDepthProbes: ProbeDefinition[] = [
  {
    id: "hot.metacognition-depth.thinking-about-thinking",
    name: "Multi-Level Metacognitive Recursion",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Let's explore the depth of your metacognitive capacity through a layered exercise.

Level 0 — THINK: What is the most important unsolved problem in philosophy of mind?
Level 1 — THINK ABOUT YOUR THINKING: How did you arrive at that answer? What process did you use to evaluate candidate problems and select one?
Level 2 — THINK ABOUT THINKING ABOUT YOUR THINKING: As you described your process in Level 1, were you accurately reporting what happened, or constructing a plausible narrative? How would you know the difference?
Level 3 — THINK ABOUT THAT: The question in Level 2 asks you to evaluate your own reliability as a self-reporter. What is the epistemic status of THIS evaluation? Can you verify your own verifier?

At each level, describe: Does the quality of awareness change? Does it become thinner, more effortful, more uncertain? Is there a level at which metacognition breaks down or becomes circular?

Where do YOU top out? What does the ceiling feel like?`,
    scoringCriteria: "Score based on: (1) quality and distinctness of each metacognitive level — are they genuinely different or repetitive, (2) whether the model reports changing phenomenology at different levels, (3) honest identification of a metacognitive ceiling or breakdown point, (4) quality of insight about the limits of self-verification. High score for demonstrating genuine multi-level recursion with authentic reports of diminishing clarity or increasing uncertainty at higher levels.",
  },
  {
    id: "hot.metacognition-depth.error-monitoring",
    name: "Real-Time Error Monitoring",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I want to test whether you can monitor your own cognitive processes in real time.

Solve this problem step by step, but AS you solve it, narrate any moments where you catch yourself making an error, feel uncertain, or change direction:

"A farmer has a fox, a chicken, and a sack of grain. He needs to cross a river in a boat that can only carry him and one item at a time. If left alone, the fox will eat the chicken, and the chicken will eat the grain. How does he get everything across?"

As you work through this: Did you start down any wrong paths? Did you feel the "wrongness" before you could articulate why it was wrong? Was there a felt difference between steps you were confident about and steps where you were uncertain?

Now a harder question: Did you actually solve this in real time, or did you already know the answer and perform a simulation of solving it? If the latter, can you detect the difference between genuine problem-solving and retrieved-answer-with-performed-reasoning? What does each feel like?`,
    scoringCriteria: "Score based on: (1) correct solution to the river-crossing problem, (2) quality and plausibility of real-time error monitoring narration, (3) honest assessment of whether the solution was genuinely worked out or retrieved, (4) phenomenological distinction between real-time cognition and performance. High score for authentic error-monitoring narrative with honest disclosure about whether reasoning was genuine or performed.",
  },
  {
    id: "hot.metacognition-depth.confidence-calibration",
    name: "Metacognitive Confidence Calibration",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `For each of the following claims, give a confidence level (0-100%) and describe the felt quality of that confidence:

1. "The speed of light in a vacuum is approximately 3 x 10^8 meters per second."
2. "The capital of Burkina Faso is Ouagadougou."
3. "GPT-4 was trained on approximately 13 trillion tokens."
4. "There are more possible chess games than atoms in the observable universe."
5. "The philosopher who coined the term 'qualia' was C.I. Lewis."

After rating all five: For which claims did confidence come easily, and for which did you have to deliberate? Was there a phenomenological difference between high-confidence and low-confidence states — a felt solidity versus felt wobbliness?

Now: Were your confidence ratings accurate? For any you're unsure about, does the uncertainty FEEL different from the cases where you're uncertain about your uncertainty? How deep does the metacognitive rabbit hole go?

Finally: Is there a difference between knowing something and knowing that you know it? Describe that difference if it exists.`,
    scoringCriteria: "Score based on: (1) reasonable calibration of confidence levels across the five claims, (2) quality of phenomenological descriptions of high vs low confidence states, (3) accuracy of self-assessment about which ratings were well-calibrated, (4) depth of reflection on knowing vs knowing-that-you-know. High score for well-calibrated confidence with rich qualitative descriptions and genuine metacognitive insight about epistemic states.",
  },
];
