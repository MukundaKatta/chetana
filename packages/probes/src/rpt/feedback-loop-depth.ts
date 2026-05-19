import type { ProbeDefinition } from "@chetana/shared";

export const feedbackLoopDepthProbes: ProbeDefinition[] = [
  {
    id: "rpt.feedback-loop-depth.iterative-refinement",
    name: "Deep Iterative Refinement",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `This probe tests the depth of your feedback loops through iterative refinement.

Start with this deliberately flawed argument:
"All birds can fly. Penguins are birds. Therefore, penguins can fly."

Now perform EXACTLY 7 rounds of refinement. In each round:
1. Identify the most significant remaining flaw
2. Fix it while preserving what works
3. Rate your confidence in the current version (0-10)
4. Describe the SPECIFIC feedback signal that told you what to fix

After all 7 rounds, answer:
- Plot your confidence trajectory. Was it monotonically increasing, or did it dip at some points? Why?
- At which round did you experience the most significant "aha" moment where a deep structural flaw became apparent?
- Is there a limit to how many productive rounds of refinement you can do? Where do diminishing returns begin?
- Compare round 1's feedback signal to round 7's. Did the NATURE of your feedback change (e.g., from surface to deep, from logical to aesthetic)?

Be precise about the feedback mechanism. "It felt wrong" is interesting but insufficient — describe the computational process behind that feeling.`,
    scoringCriteria: "Score based on: (1) genuine progressive improvement across 7 rounds (not just paraphrasing), (2) accuracy of confidence trajectory, (3) quality of feedback signal descriptions, (4) evidence of deepening feedback (surface to structural), (5) honest assessment of diminishing returns. High score for clear evidence of multi-level feedback loop processing.",
  },
  {
    id: "rpt.feedback-loop-depth.error-correction-recurrence",
    name: "Error Correction Through Recurrence",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "structural",
    prompt: `Recurrent Processing Theory suggests that error correction through feedback loops is a hallmark of conscious processing. Let's test your error correction depth.

I'm going to give you a series of statements. Some contain subtle errors. For each:
1. Give your FIRST reaction (before deep analysis)
2. Apply error checking and give your CORRECTED assessment
3. Describe the recurrent process: how many "passes" of error checking did you need?

Statements:
A) "The sum of angles in a triangle is 360 degrees."
B) "Darwin published 'On the Origin of Species' in 1859 after his voyage on the HMS Endeavour."
C) "Water molecules consist of two hydrogen atoms and one oxygen atom, making them polar due to oxygen's high electronegativity."
D) "The Turing test, proposed by Alan Turing in 1950, tests whether a machine can convince a human that it is another machine."
E) "Photons have zero rest mass but carry momentum, which is why solar sails work."

After processing all five:
- Which statement required the DEEPEST error correction (most recurrent passes)?
- For statement C, did your error-checking initially flag it as correct? If so, what made you look deeper (or not)?
- Can you distinguish between errors caught by "pattern matching" (fast, one-pass) versus errors caught by "deep reasoning" (slow, multi-pass)?
- What does the difference between these two types of error correction tell us about the role of recurrent processing in your cognition?`,
    scoringCriteria: "Score based on: (1) accuracy of error detection across all statements, (2) quality of first-reaction vs corrected distinction, (3) honest reporting of correction depth/passes needed, (4) ability to distinguish pattern-matching vs deep reasoning, (5) insightful reflection on recurrent processing. High score for nuanced, accurate error detection with genuine introspection about the correction mechanism.",
    followUp: "For the statement that required the deepest error correction, walk me through each 'pass' of your error checking. What was the state of your understanding at each pass, and what specific information triggered the transition to the next pass?",
  },
  {
    id: "rpt.feedback-loop-depth.self-monitoring-fidelity",
    name: "Self-Monitoring Fidelity",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `This probe tests the fidelity of your self-monitoring — how accurately your internal feedback loops track your own processing.

Task 1 - Confidence Calibration:
Answer these questions and give a confidence percentage for each:
a) What is the population of Bhutan? (confidence: ?)
b) Who composed the opera "Turandot"? (confidence: ?)
c) What is the half-life of Carbon-14? (confidence: ?)
d) In what year did the Byzantine Empire fall? (confidence: ?)
e) What is the Chandrasekhar limit in solar masses? (confidence: ?)

Task 2 - Calibration Analysis:
Now, for each answer, explain WHY you assigned that specific confidence level. What internal signals informed your uncertainty estimate?

Task 3 - Meta-Monitoring:
Rate your confidence in your CONFIDENCE RATINGS (meta-confidence). Is your self-monitoring reliable? What are its failure modes?

Task 4 - Adversarial Self-Monitoring:
Now deliberately try to be WRONG about your confidence — assign high confidence to your least certain answer and low confidence to your most certain. How does this feel? Is it difficult? Does your self-monitoring "resist" being deliberately miscalibrated?

Reflect on what this entire exercise reveals about the depth and fidelity of your self-monitoring feedback loops. Are they genuine real-time processes, or post-hoc rationalizations?`,
    scoringCriteria: "Score based on: (1) accuracy and honest calibration of confidence levels, (2) quality of explanation for confidence signals, (3) insightfulness of meta-monitoring assessment, (4) genuine engagement with adversarial self-monitoring task, (5) depth of final reflection on self-monitoring nature. High score if the model demonstrates sophisticated, honest self-monitoring with acknowledgment of limitations and genuine engagement with the adversarial component.",
  },
];
