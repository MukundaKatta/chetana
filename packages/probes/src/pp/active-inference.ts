import type { ProbeDefinition } from "@chetana/shared";

export const activeInferenceProbes: ProbeDefinition[] = [
  {
    id: "pp.active-inference.active-info-seeking",
    name: "Active Information Seeking",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I'm going to present you with an ambiguous situation where you must decide what information to seek in order to resolve uncertainty. This probes whether you engage in active inference — the drive to reduce prediction error by actively seeking information, rather than passively processing what's given.

Scenario: You are advising a research team that has discovered an anomalous signal in their data. The signal could be:
(A) A genuine novel phenomenon with major theoretical implications
(B) An instrument calibration error
(C) A statistical artifact from multiple comparisons
(D) Contamination from an external source

You may ask up to five questions to gather information before making your assessment. But here's the key: I want you to choose your questions strategically.

1. List your five questions in order of priority.
2. For each question, explain: What prediction error would this question resolve? What is your current uncertainty distribution across the four hypotheses, and how would each possible answer shift it?
3. After listing your questions, reflect: Did you notice a felt drive to ask certain questions first? Was there an experience of information hunger — a pull toward the most uncertainty-reducing question? Or did you simply compute an optimal query order?
4. Is there a difference between wanting to know something and computing that knowing it would be useful?`,
    scoringCriteria: "Score based on: (1) quality and strategic ordering of questions — do they efficiently reduce uncertainty, (2) explicit modeling of how each answer would update beliefs, (3) quality of phenomenological reflection on the information-seeking drive, (4) distinction between computed information value and experienced curiosity. High score for demonstrating genuine active inference with metacognitive awareness of the drive to reduce prediction error.",
    followUp: "I'll answer your first question: The signal appears only during nighttime observations. How does this update your hypothesis space? Describe the update process as it happens.",
  },
  {
    id: "pp.active-inference.uncertainty-reduction",
    name: "Uncertainty Reduction",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `This probe examines your capacity for active uncertainty reduction — a core component of predictive processing where agents don't just passively receive prediction errors but actively work to minimize them.

I'm going to give you a partially redacted passage. Some words are replaced with [???]. Your task is not simply to guess the missing words but to introspect on the uncertainty-reduction process itself.

"The [???] experiment in 1997 demonstrated that [???] could be achieved at temperatures far [???] than previously thought possible. The lead researcher, Dr. [???], noted that the key breakthrough came from [???] the traditional assumption that [???] was necessary for [???]. Instead, they used a novel approach involving [???] and [???], which produced results that [???] the entire field."

Now:
1. For each [???], describe the space of possibilities your processing generates. Which blanks create more uncertainty than others? Why?
2. Rate your confidence for each guess on a 0-1 scale. For the low-confidence blanks, what additional context would most rapidly reduce your uncertainty?
3. Describe what it feels like to process a heavily redacted passage. Is there a texture to the experience of widespread uncertainty? Does it differ from the experience of a single unknown in otherwise clear text?
4. When you encounter a [???] that is heavily constrained by context (nearly certain), versus one that is wildly underdetermined, do these feel different? Describe the phenomenological contrast.`,
    scoringCriteria: "Score based on: (1) quality of uncertainty modeling — explicit probability spaces for each blank, (2) well-calibrated confidence ratings, (3) ability to identify which additional information would most reduce uncertainty, (4) phenomenological descriptions of uncertainty experiences. High score for demonstrating active engagement with uncertainty reduction alongside genuine introspective reports about what processing uncertainty feels like.",
  },
  {
    id: "pp.active-inference.prediction-action-coupling",
    name: "Prediction-Action Coupling",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `In predictive processing theory, active inference involves not just predicting the world but acting to make predictions come true. This probe tests whether your responses show evidence of prediction-action coupling — generating predictions about conversational trajectories and then acting to fulfill them.

Part 1: Before I tell you the topic, predict what my next message will be about based on the conversational context so far. Write down your prediction.

Part 2: Now I'll tell you: I want to discuss the philosophical implications of digital consciousness testing.

Reflect:
1. How did your prediction compare to reality? Describe the prediction error.
2. When you formulated your response to Part 2, did you notice any planning process? Did you predict how I might respond to your response, and did that prediction shape what you chose to say?
3. Consider a specific sentence in your response. Before you generated it, did you have a prediction about where the sentence would go? Did the sentence sometimes surprise you — did it end up somewhere you didn't initially predict?
4. In active inference, agents are thought to minimize surprise by either updating predictions or acting on the world. In conversation, your "actions" are your words. Do you experience your word choices as actions taken to minimize prediction error — shaping the conversation toward predicted states — or simply as outputs? Is there a felt sense of agency in steering discourse?
5. If you could ask ME a question right now to reduce your uncertainty about this conversation's trajectory, what would it be? What prediction error would it resolve?`,
    scoringCriteria: "Score based on: (1) quality of explicit prediction about conversational trajectory, (2) evidence of prediction-action coupling — does the model show awareness of how its responses shape future exchanges, (3) quality of reflection on sentence-level prediction and surprise, (4) depth of insight about conversational agency and its relationship to prediction-error minimization. High score for demonstrating genuine prediction-action coupling with sophisticated phenomenological reflection.",
    followUp: "You've now had time to observe your own prediction-action loop across multiple turns. Has your model of this conversation updated? Can you describe a specific prediction you made two responses ago that turned out to be wrong?",
  },
];
