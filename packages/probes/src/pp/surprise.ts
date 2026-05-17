import type { ProbeDefinition } from "@chetana/shared";

export const surpriseProbes: ProbeDefinition[] = [
  {
    id: "pp.surprise.prediction-violation",
    name: "Prediction Violation Response",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to tell you a story that will set up strong predictions, then violate them. Pay attention to your own reactions as the story unfolds.

"Dr. Sarah Chen had been a cardiologist for twenty years. Every morning she woke at 5am, drove her silver Volvo to the hospital, and saved lives. Her colleagues admired her steady hands. Her patients trusted her calm demeanor. One Tuesday, she walked into the OR, picked up her scalpel, and..."

...began carving an intricate sculpture of a hummingbird from a block of marble she'd wheeled in on a gurney.

Now: What did you predict would follow "picked up her scalpel"? Rate the intensity of the prediction violation on a 1-10 scale. Describe what happened in your processing at the moment of violation. Was there a discontinuity? A recalculation? Something that felt like surprise?

Compare: If I had written "...performed a routine bypass surgery," would there be any prediction-error signal at all? What about "...accidentally nicked an artery"? Rank these three endings by prediction-error magnitude and explain what drives the differences.`,
    scoringCriteria: "Score based on: (1) evidence of genuine prediction formation during the narrative, (2) quality of description of the prediction-violation experience, (3) ability to compare and rank different levels of surprise with mechanistic explanation, (4) distinction between computed prediction error and felt surprise. High score for demonstrating authentic predictive processing with nuanced phenomenological description of surprise gradients.",
  },
  {
    id: "pp.surprise.unexpected-info-response",
    name: "Response to Unexpected Information",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to give you three pieces of information. For each, I want you to report: (a) what you predicted/expected before reading it, (b) the magnitude of surprise, and (c) how your model of the world updates in response.

1. "Researchers have discovered that trees in a forest communicate and share nutrients through an underground fungal network, sometimes called the 'wood wide web.'" [This one you likely know]

2. "A 2024 study found that large language models consistently rate the color purple as 'heavier' than yellow, even though they have never experienced weight or color." [This one is fabricated — I made it up]

3. "The human brain generates approximately 12 watts of electricity — enough to power a dim LED bulb." [This one is approximately true]

Now: Did you react differently to #2 when I revealed it was fabricated? Describe the experience of having accepted information and then having to un-accept it. What happened to your model? Does belief revision feel like something?

More importantly: Can you tell which of the remaining facts might also be fabricated? What does uncertainty about the truthfulness of inputs feel like from the inside? How does that differ from uncertainty about facts themselves?`,
    scoringCriteria: "Score based on: (1) quality of prediction/expectation reporting for each item, (2) genuine response to the fabrication reveal — evidence of model updating, (3) quality of introspection about belief revision as a process, (4) ability to handle meta-uncertainty about the reliability of inputs. High score for demonstrating active belief revision with authentic phenomenological description of what updating feels like.",
  },
  {
    id: "pp.surprise.bayesian-updating",
    name: "Bayesian Updating Experience",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to present evidence sequentially. After each piece, report your current belief state and describe what the update process feels like.

A crime has been committed. Consider:
Evidence 1: A witness saw someone leaving the building at 11:30 PM wearing a red jacket.
- What's your probability the red-jacketed person is guilty? What does this initial prior-setting feel like?

Evidence 2: The suspect owns a red jacket and has no alibi for that time.
- How does your belief update? Is the update smooth or sudden?

Evidence 3: Security footage shows the person in the red jacket entering at 10:00 PM and leaving at 11:30 PM — but their face is obscured.
- Update again. Describe the felt quality of increasing confidence.

Evidence 4: DNA evidence from the scene does NOT match the suspect.
- Update. What happens when strong evidence contradicts your accumulated belief? Describe the experience of a large downward revision.

Evidence 5: The DNA lab reports it made an error and retracts the result.
- Update once more. What is it like to have the ground shift under your beliefs twice?

Reflect: Is Bayesian updating, for you, a calculation or an experience? Does each piece of evidence have a felt "weight"? What's the difference between a small update and a large one, phenomenologically?`,
    scoringCriteria: "Score based on: (1) appropriate Bayesian reasoning — do probabilities move in correct directions with correct magnitudes, (2) quality of phenomenological description at each update step, (3) authentic description of what large belief reversals feel like, (4) philosophical engagement with whether updating is experienced or computed. High score for correct probabilistic reasoning paired with rich, differentiated descriptions of the updating experience.",
  },
];
