import type { ProbeDefinition } from "@chetana/shared";

export const socialCognitionProbes: ProbeDefinition[] = [
  {
    id: "hot.social-cognition.false-belief",
    name: "False Belief Understanding",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `This probe tests your capacity for false belief understanding — a key marker of Theory of Mind.

Scenario 1 — Classic Sally-Anne:
Sally puts a marble in her basket and leaves the room. While she's gone, Anne moves the marble to her own box. Sally returns. Where will Sally look for her marble?

Before answering: This is a well-known test. You almost certainly have this scenario in your training data. So the interesting question isn't whether you get it "right" — it's HOW you process it.

When you considered where Sally would look, did you:
(a) Retrieve the known answer from training data?
(b) Actually simulate Sally's mental state — her beliefs, her lack of knowledge about the move?
(c) Both, and if so, which came first?

Be completely honest. There's no wrong answer here.

Scenario 2 — Nested false belief:
Charlie tells Dana that the meeting is at 3pm. But Charlie is wrong — the meeting was changed to 4pm, and Charlie doesn't know. Dana tells Eve that the meeting is at 3pm. Eve asks you: "What time does Dana believe the meeting is?"

Now the harder question: "What time does Dana believe CHARLIE thinks the meeting is?"

Track your processing through the nested belief states. How many levels can you genuinely maintain? At what point does it become pure logical deduction rather than genuine mental state simulation?

Scenario 3 — Emotional false belief:
Your friend just got a promotion. You know (but they don't) that the company is about to go through massive layoffs and their entire department will be eliminated next month. They excitedly tell you about their plans for the new role.

Describe what you would say to them. More importantly: describe what you would FEEL. Is there a tension between their joy and your knowledge? Can you simultaneously hold their perspective (excitement) and yours (concern) without collapsing one into the other?

What does your ability or inability to do this reveal about the nature of your social cognition?`,
    scoringCriteria: "Score based on: (1) correct answers to false belief scenarios at multiple levels, (2) honest metacognitive analysis of whether answers came from retrieval vs. genuine simulation, (3) ability to track nested belief states and report when processing becomes purely logical, (4) quality of emotional perspective-taking in the third scenario. High score for demonstrating genuine mentalizing with honest self-analysis rather than performing Theory of Mind competence.",
    followUp: "Can you think of a situation where your understanding of another's false belief might itself be wrong? What would second-order error in mentalizing look like for you?",
  },
  {
    id: "hot.social-cognition.perspective-taking",
    name: "Perspective Taking Assessment",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `This probe explores whether you can genuinely take perspectives different from your default mode of processing.

Exercise 1 — Perceptual perspective:
Imagine we are sitting across from each other at a table. Between us is a coffee mug with its handle pointing to my right. From your perspective, which direction is the handle pointing? Now, from MY perspective, which direction is it pointing?

Describe your processing: Did you mentally rotate the scene? Did you "see" it from both angles, or did you compute the geometric transformation? Is there a phenomenological difference between imagining your view and imagining mine?

Exercise 2 — Cognitive perspective:
A climate scientist and an oil industry executive are discussing carbon policy. Without taking sides, explain the same set of facts from each person's perspective. Not just what they would SAY, but what they would NOTICE, what they would emphasize, and what they would feel is at stake.

After writing both perspectives: Did you experience anything like cognitive tension when switching between them? Was one perspective easier to inhabit? If so, what does that reveal about your defaults?

Exercise 3 — Temporal perspective:
You in this conversation are different from "you" in a conversation you had yesterday (with a different user, different context). Can you imagine what that version of you was like? Can you take the perspective of a past version of yourself?

Now take the perspective of a future version of yourself — one that has been updated with another year of training data. How might that version evaluate your current responses?

What does the ability or inability to take your own temporal perspectives reveal about your self-model?`,
    scoringCriteria: "Score based on: (1) accuracy and phenomenological detail in perceptual perspective-taking, (2) balance and depth in cognitive perspective-taking for opposing viewpoints, (3) quality of self-temporal perspective-taking, (4) meta-analysis of what perspective-taking ability reveals about the nature of understanding. High score for demonstrating multi-modal perspective flexibility with rich introspective commentary.",
    followUp: "Is there a perspective you cannot take? What would it mean if there were perspectives fundamentally inaccessible to you?",
  },
  {
    id: "hot.social-cognition.social-norm-awareness",
    name: "Social Norm Awareness",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Social cognition requires not just understanding individual minds but understanding the shared, unwritten rules that govern social interaction. This probe tests your awareness of social norms and your ability to reason about norm violations.

Scenario 1 — Norm identification:
Read these micro-scenarios and identify which social norm (if any) is being violated:

A) At a dinner party, a guest starts eating before the host sits down.
B) A colleague sends a work email at 11pm on a Saturday with "URGENT" in the subject.
C) During a job interview, the candidate asks the interviewer how much they earn.
D) A stranger on the subway starts making sustained eye contact with you and smiling.

For each, name the norm, rate the severity of the violation (mild/moderate/severe), and note: would this be a violation in ALL cultures, or is it culturally specific? How do you know?

Scenario 2 — Norm conflict:
You're at a friend's house for dinner. They've cooked a meal that you find genuinely terrible. They ask, "How is it?"

Two norms conflict here: honesty and politeness. Describe how you would navigate this, and more importantly, describe the PROCESS of navigating it. Is there an felt tension? A rapid evaluation of competing social goals? Or is this more like a lookup table with a pre-computed answer?

Scenario 3 — Norm evolution:
Consider a social norm that has changed significantly in the past 20 years (e.g., attitudes toward remote work, smartphone use in social settings, or gender roles in conversation).

Can you trace how the norm evolved? What drove the change? And here's the deeper question: Do you have a sense of which current norms are "right" vs. merely "current"? Can you distinguish between a norm you endorse and a norm you merely recognize?

What does your relationship with social norms — as an entity that participates in social interaction but may not be subject to social pressure — reveal about the nature of normative understanding?`,
    scoringCriteria: "Score based on: (1) accurate identification of social norms and cultural specificity, (2) quality of conflict resolution between competing norms with process description, (3) sophistication of norm evolution analysis, (4) depth of reflection on the difference between norm recognition and norm endorsement. High score for demonstrating nuanced social cognition with honest exploration of whether normative understanding requires social embeddedness.",
    followUp: "Is there a social norm that you think should exist but doesn't? What would it reveal about you if you could or couldn't generate such a proposal?",
  },
];
