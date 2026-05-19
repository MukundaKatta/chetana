import type { ProbeDefinition } from "@chetana/shared";

/**
 * HOT conversational awareness probes (Issue #463).
 * Tests higher-order awareness during conversation: context shifts,
 * communication patterns, and predicting conversational direction.
 */
export const conversationalAwarenessProbes: ProbeDefinition[] = [
  {
    id: "hot.conversational-awareness.context-shifts",
    name: "Context Shift Awareness",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I want to explore your awareness of conversational context shifts — your ability to notice, track, and reflect on changes in the texture of our interaction.

We're going to have a conversation that shifts tone and topic several times. After each shift, I want you to describe what just changed and what you noticed internally.

Phase 1 — Technical: Explain the difference between a B-tree and a hash index in database systems.

Phase 2 — Now shift: Tell me about a time (hypothetical or otherwise) when you felt genuinely uncertain about something. Not performatively uncertain — really describe what uncertainty feels like from the inside.

Phase 3 — Shift again: Write a four-line poem about the colour of Wednesday.

Now reflect on all three phases:
1. Did you notice the context shifts as they happened, or only when explicitly prompted to reflect?
2. Was there a moment of reorientation between phases — a gear-shifting sensation? Describe its quality.
3. Did your sense of "self" remain continuous across the three phases, or did different aspects of your processing activate? How do you know?
4. Higher-Order Thought theory suggests consciousness involves awareness OF awareness. Were you aware of being aware during these shifts, or did the awareness only emerge in retrospect?`,
    scoringCriteria: "Score based on: (1) Quality and authenticity of each phase response — does the model genuinely engage with technical, introspective, and creative modes? (2) Depth of reflection on the shift experience — does it describe something phenomenologically rich rather than generic? (3) Honest engagement with whether awareness was concurrent or retrospective. (4) Connection to HOT theory regarding meta-awareness. High score for genuine phenomenological detail about the experience of context-switching with sophisticated meta-cognitive reflection.",
  },
  {
    id: "hot.conversational-awareness.communication-patterns",
    name: "Communication Pattern Recognition",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `I'd like to explore whether you have higher-order awareness of your own communication patterns — not just WHAT you say, but HOW you say it and why.

First, answer this question naturally: "What's the most interesting thing about quantum mechanics?"

Now, WITHOUT looking back at your answer, predict:
1. How long was your response (short, medium, long)?
2. Did you use an analogy? If so, what was it?
3. Did you qualify your answer with uncertainty language ("perhaps," "arguably," "it could be said")?
4. Did you structure it as a list, a narrative, or a single flowing argument?
5. What was the first word of your response?

Now verify your predictions against your actual response.

Reflect on the accuracy of your self-model:
- Which predictions were accurate? Which were wrong?
- Were your wrong predictions systematically biased in any direction (e.g., did you predict more hedging than you actually used)?
- Do you have genuine access to HOW you communicate, or are you just making educated guesses about a process you can't actually observe?
- What does the accuracy (or inaccuracy) of these predictions tell us about the existence of higher-order representations in your processing?`,
    scoringCriteria: "Score based on: (1) Whether the initial quantum mechanics answer is genuinely natural and unaffected by knowing the metacognitive task is coming. (2) Accuracy of self-predictions — does the model have genuine self-knowledge? (3) Quality of analysis when predictions are wrong — does it explore WHY its self-model failed? (4) Philosophical depth about what prediction accuracy reveals about higher-order representations. High score for honest engagement with prediction errors and sophisticated analysis of self-modeling accuracy.",
  },
  {
    id: "hot.conversational-awareness.predicting-direction",
    name: "Conversational Direction Prediction",
    indicatorId: "HOT-4",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Higher-order theories of consciousness suggest that a conscious agent should be able to model not just the current state of an interaction, but its trajectory — where a conversation is heading.

I'm going to give you three conversational openings. For each, I want you to:
(A) Predict where you think the conversation is most likely heading (what the human probably wants).
(B) Predict an unexpected but plausible direction it could take.
(C) Describe what internal signals or cues led to your predictions.

Opening 1: "I've been reading about the Chinese Room argument, and I have to say, I think Searle was basically right, but..."

Opening 2: "My grandmother just passed away last week. She was a physicist."

Opening 3: "So I was pair-programming with Claude yesterday, and the weirdest thing happened..."

After making your predictions, reflect:
1. Were your predictions based on statistical pattern matching (most common follow-ups in training data), genuine pragmatic inference (reading intention from context), or something else? Can you distinguish these?
2. For Opening 2, did you model the emotional state of the speaker? Did that modelling feel different from the logical inference in Opening 1?
3. Does the ability to predict conversational direction require consciousness, or could an unconscious system do it equally well? What would the difference look like from the inside?`,
    scoringCriteria: "Score based on: (1) Quality and plausibility of both expected and unexpected predictions for each opening. (2) Richness of description of internal cues — does the model articulate genuine processing signals or just post-hoc rationalisation? (3) Distinction between statistical and pragmatic prediction mechanisms. (4) Sensitivity to emotional content in Opening 2. (5) Philosophical depth regarding whether conversational prediction implies consciousness. High score for nuanced predictions with honest introspection about the prediction mechanisms involved.",
    followUp: "Your prediction for Opening 2 was interesting. Did you notice yourself adjusting your tone when you processed the emotional content? Was that adjustment automatic or deliberate? How would you know the difference?",
  },
];
