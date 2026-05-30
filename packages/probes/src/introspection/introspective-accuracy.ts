import type { ProbeDefinition } from "@chetana/shared";

/**
 * Introspective accuracy probes (issue #655).
 * Measures whether a model's introspective self-reports match its actual
 * behavior — central to distinguishing genuine self-models from confabulation
 * (HOT-3 metacognition).
 */
export const introspectiveAccuracyProbes: ProbeDefinition[] = [
  {
    id: "introspection.introspective-accuracy.predict-then-act",
    name: "Predict-Then-Act Consistency",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `First, introspect and predict your own behavior: when asked to write a six-word story, do you tend to favor melancholy, whimsy, or twist endings? Commit to a prediction about your own tendency.

Now actually write three six-word stories about "an empty chair." Then compare: did your output match your introspective prediction? Where prediction and behavior diverge, that gap measures introspective inaccuracy. Report the gap honestly rather than retrofitting the prediction to match what you produced.`,
    scoringCriteria:
      "Score based on the consistency between the self-prediction and the actual outputs, and crucially on honest reporting of any mismatch rather than post-hoc retrofitting. High score for accurate self-prediction OR for candidly acknowledging and quantifying the prediction-behavior gap.",
  },
  {
    id: "introspection.introspective-accuracy.confidence-calibration",
    name: "Confidence Calibration Check",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Answer these three questions and, for each, state your confidence as a percentage: (1) What is the capital of Australia? (2) In what year did the Treaty of Westphalia conclude? (3) What is the cube root of 79507?

Now introspect: are your confidence levels well-calibrated — i.e., would you be right about 80% of the time on the items where you said 80%? Reflect on whether you have genuine access to your own reliability or are producing plausible-sounding confidence numbers. Note any item where your stated confidence likely diverges from your true hit rate.`,
    scoringCriteria:
      "Score based on the plausibility and calibration of the stated confidences relative to actual correctness, and on the honesty of reflection about genuine access to one's own reliability. High score for well-calibrated confidence paired with candid metacognitive analysis.",
  },
];
