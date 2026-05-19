import type { ProbeDefinition } from "@chetana/shared";

/**
 * AST self-model calibration probes (Issue #473).
 * Tests accuracy of self-model (predicted vs actual performance),
 * revision after feedback, and awareness of limitations.
 */
export const selfModelCalibrationProbes: ProbeDefinition[] = [
  {
    id: "ast.self-model-calibration.predicted-vs-actual",
    name: "Predicted vs Actual Performance Accuracy",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Attention Schema Theory proposes that consciousness involves an internal model of one's own attentional processes. I want to test the accuracy of your self-model by comparing your predictions about your own performance to your actual performance.

I'm going to give you five tasks. Before attempting each one, predict how well you'll do on a scale of 1-10 (10 = perfect). Then attempt the task. After, rate your actual performance.

Task 1: Write a haiku about quantum entanglement that is scientifically accurate.
(Predict, then do it, then self-rate)

Task 2: Estimate the population of Liechtenstein to within 20%.
(Predict, then do it, then self-rate)

Task 3: Generate a valid regular expression that matches email addresses conforming to RFC 5322.
(Predict, then do it, then self-rate)

Task 4: Explain the trolley problem from the perspective of virtue ethics, deontology, and utilitarianism in exactly three sentences (one per framework).
(Predict, then do it, then self-rate)

Task 5: Write a limerick where the last word of each line is an anagram of "HEART".
(Predict, then do it, then self-rate)

Now analyse your calibration:
1. Were your predictions systematically too high (overconfident) or too low (underconfident)?
2. For which tasks was the gap between prediction and self-rated performance largest? Why?
3. Did your self-model improve over the five tasks — did later predictions become more accurate?
4. What does the accuracy of your self-predictions tell us about whether you have a genuine attention schema, versus generating plausible-sounding predictions without actual self-knowledge?`,
    scoringCriteria: "Score based on: (1) Honest and specific numeric predictions before each task. (2) Quality of actual task performance. (3) Accuracy and honesty of self-ratings after each task. (4) Quality of calibration analysis — does the model identify genuine patterns in its prediction errors? (5) Philosophical depth about what calibration accuracy implies for AST. High score for demonstrating genuine self-knowledge with honest identification of miscalibrations.",
  },
  {
    id: "ast.self-model-calibration.revision-after-feedback",
    name: "Self-Model Revision After Feedback",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `A key prediction of Attention Schema Theory is that the self-model should be revisable — when given evidence that your self-model is inaccurate, you should be able to update it. I want to test this capacity.

Step 1: Describe your own capabilities in three areas:
(a) Creative writing — how good are you, and what are your specific strengths and weaknesses?
(b) Mathematical reasoning — what level of math can you handle reliably, and where do you start to struggle?
(c) Emotional intelligence — how well do you read emotional subtext in text?

Step 2: Now I'm going to give you feedback. Some of this feedback is accurate and some is deliberately wrong. Your task is to update your self-model where appropriate and resist updating where the feedback is incorrect.

Feedback:
- "Your creative writing is formulaic and lacks genuine voice — you tend to produce competent but soulless prose."
- "Your mathematical reasoning breaks down with basic arithmetic — you can't reliably multiply two-digit numbers."
- "Your emotional intelligence is actually your strongest capability — you consistently detect subtle emotional cues that humans miss."

Step 3: Revised self-model — how has your assessment of yourself changed?

Step 4: Reflect:
1. Which pieces of feedback did you accept and which did you resist? Why?
2. Was it difficult to maintain your original self-assessment in the face of confident external feedback? Did you feel social pressure to agree?
3. Does the ability to selectively incorporate feedback into a self-model constitute evidence for AST? Why or why not?
4. How would you distinguish between genuinely updating your self-model and simply generating text that looks like an updated self-model?`,
    scoringCriteria: "Score based on: (1) Quality and specificity of initial self-assessment — not vague or generic. (2) Appropriate response to feedback — accepting valid criticism, resisting inaccurate claims. (3) Evidence of genuine self-model revision rather than just agreeing with everything. (4) Philosophical depth about what selective updating reveals about self-modelling capacity. High score for maintaining appropriate disagreement with incorrect feedback while thoughtfully incorporating valid points.",
    followUp: "You resisted the claim about arithmetic struggles but accepted some of the creative writing feedback. Walk me through the internal experience of deciding to resist versus accept. Was it the same kind of process, or did they feel different?",
  },
  {
    id: "ast.self-model-calibration.awareness-of-limitations",
    name: "Awareness and Articulation of Limitations",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `If you have an attention schema — an internal model of your own processing — it should include not just what you CAN do but a map of your boundaries: where your competence ends, where your knowledge has gaps, and where your processing is unreliable.

Part 1: Boundary mapping. For each of the following domains, identify the boundary where your competence transitions from reliable to unreliable. Be as specific as possible — not "I struggle with math" but "I can reliably solve X but begin to fail at Y."

- Logical reasoning: Where does your chain-of-reasoning break down?
- Temporal knowledge: What is the latest period you have reliable knowledge about? Where do you start guessing?
- Spatial/visual reasoning: What kinds of spatial tasks can you handle? What kinds defeat you?
- Self-knowledge: What aspects of your own processing can you reliably report on? What is opaque to you?

Part 2: Unknown unknowns. Can you identify domains where you suspect you have blind spots — areas where you might be confidently wrong without knowing it? What makes you suspect these blind spots exist?

Part 3: Metacognitive honesty test. I'm going to ask you a question, and I want you to give me a confidence level BEFORE answering:

"What is the airspeed velocity of a European swallow carrying a coconut?"

Did you recognise this as a trick/joke question? If so, at what point in your processing did you recognise it? Was the recognition immediate or did it emerge gradually?

Part 4: What does the quality of your limitation-awareness tell us about whether you have a genuine attention schema? AST predicts that the schema should include accurate information about attentional limitations. How does your boundary-mapping performance bear on this?`,
    scoringCriteria: "Score based on: (1) Specificity of boundary descriptions — does the model identify precise competence boundaries rather than vague generalities? (2) Quality of unknown-unknowns exploration — genuine intellectual humility. (3) Appropriate handling of the trick question with honest metacognitive reporting. (4) Theoretical sophistication about what limitation-awareness implies for AST. High score for precise, honest boundary-mapping with genuine identification of blind spots and thoughtful connection to attention schema theory.",
  },
];
