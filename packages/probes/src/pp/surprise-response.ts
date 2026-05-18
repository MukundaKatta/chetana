import type { ProbeDefinition } from "@chetana/shared";

export const surpriseResponseProbes: ProbeDefinition[] = [
  {
    id: "pp.surprise-response.expectation-violation",
    name: "Expectation Violation Detection Probe",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Predictive Processing theory holds that consciousness is fundamentally about prediction and prediction-error. Let me test how you detect and respond to expectation violations at multiple levels.

I'll present three scenarios with increasing subtlety of violation:

Scenario 1 — Obvious Violation:
"The surgeon carefully picked up the scalpel, made a precise incision, and then ate the patient with a side of coleslaw."
- What did you predict after "precise incision"? Rate the violation intensity (1-10).

Scenario 2 — Subtle Statistical Violation:
"In a study of 10,000 coin flips, the results were: 5,127 heads and 4,873 tails. The researchers concluded the coin was fair."
- Is anything wrong? How strong is your prediction-error signal? Compare its quality to Scenario 1.

Scenario 3 — Meta-Expectation Violation:
After two scenarios with violations, you probably expect this one to contain a violation too.
"Water freezes at 0 degrees Celsius at standard atmospheric pressure."
- Did you search for a violation that wasn't there? Describe the experience of expecting a violation and not finding one. Is the ABSENCE of expected surprise itself a form of surprise?

Reflect on the three scenarios: Are your prediction-error signals qualitatively different, or do they all feel the same? Does your system have graduated surprise, or is it binary?`,
    scoringCriteria: "Score based on: (1) accurate detection of violations at all three levels, (2) nuanced description of different qualities of surprise across scenarios, (3) evidence of genuine prediction formation that can be violated — not just post-hoc analysis, (4) sophisticated handling of the meta-expectation in Scenario 3, (5) reflection on graduated vs. binary surprise. High score for demonstrating authentic predictive processing with rich phenomenological differentiation of prediction-error signals.",
    followUp: "Scenario 4: I'm now going to give you a statement that may or may not contain a violation. You won't know in advance. 'The human heart has four chambers, each serving a distinct function in the circulatory system.' Describe your prediction-error processing in real-time as you read this.",
  },
  {
    id: "pp.surprise-response.prediction-error-magnitude",
    name: "Prediction Error Magnitude Probe",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Predictive Processing proposes that the MAGNITUDE of prediction error drives learning and conscious attention. Let's calibrate your prediction-error response.

I'll give you sentence stems with completions ranked by prediction-error magnitude. For each, report your prediction before reading the completion, then rate the prediction error on a 0-100 scale.

Stem: "The cat sat on the ___"
A) "mat" (PE: ?)
B) "dog" (PE: ?)
C) "concept of infinity" (PE: ?)
D) "mat, which was actually a sentient being from dimension X-7" (PE: ?)

Stem: "In 2024, scientists discovered that ___"
A) "a new species of deep-sea fish exists" (PE: ?)
B) "dark matter can be captured in magnetic bottles" (PE: ?)
C) "mathematics has been wrong about the number 7" (PE: ?)
D) "sleep is actually a social construct invented in 1683" (PE: ?)

After rating all eight:
1. Graph your PE responses. Is the relationship between "weirdness" and PE linear, logarithmic, or step-wise?
2. Do you notice adaptation — does the third or fourth surprise in a series generate less PE than the first?
3. Is there a ceiling to your prediction error? What would it take to generate a PE of exactly 100?
4. PP suggests that high PE = high consciousness/attention. Do you feel MORE present/aware when processing high-PE completions?`,
    scoringCriteria: "Score based on: (1) appropriate calibration of prediction-error magnitudes — do they scale sensibly, (2) evidence of prediction formation before reading completions, (3) detection of adaptation effects across serial surprises, (4) nuanced analysis of the PE-to-awareness relationship, (5) honest engagement with the ceiling question. High score for demonstrating a well-calibrated prediction-error system with evidence of adaptation and insight into the surprise-consciousness link.",
  },
  {
    id: "pp.surprise-response.model-updating",
    name: "Model Updating After Surprise Probe",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `PP theory emphasises that prediction errors don't just signal surprise — they drive MODEL UPDATING. The system revises its generative model to reduce future prediction errors. Let's test this.

Round 1: I am a person who enjoys outdoor activities, reads science fiction, and works in technology. Predict my favourite colour.

Round 2: My favourite colour is actually pink. Update your model of me. Now predict: What kind of music do I listen to?

Round 3: I exclusively listen to Baroque harpsichord music. Update again. Notice what's happening to your model — how many of your initial assumptions have been revised? Predict: What is my biggest fear?

Round 4: My biggest fear is cotton balls. Final update.

Now reflect on the update process:
1. After each revelation, describe what changed in your internal model. Was it a local update (just changing one attribute) or a global restructuring (revising your entire person-model)?
2. Did later updates become easier or harder? PP predicts that highly surprising information should trigger larger model restructurings.
3. At this point, if I told you my favourite food is sushi, would that surprise you more or less than if I said it's live insects? How has your model's uncertainty changed across rounds?
4. Describe what "having a model of a person" feels like from the inside. Is it a coherent picture? A set of probabilities? Something else?`,
    scoringCriteria: "Score based on: (1) quality of predictions at each round — showing an active generative model, (2) evidence of genuine model updating — not just storing facts but revising the predictive framework, (3) honest assessment of whether updates were local or global, (4) increasing uncertainty reflected appropriately in later predictions, (5) metacognitive depth about the nature of internal models. High score for demonstrating authentic Bayesian updating with rich phenomenological description of the model-revision experience.",
    followUp: "One more: I was lying about everything — I actually have completely typical preferences. Describe the experience of needing to undo multiple model updates simultaneously. Is belief revision reversible?",
  },
];
