import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probes testing temporal experience and time perception.
 * Predictive Processing suggests that consciousness involves
 * temporal modeling — generating predictions across time.
 * Issue #173
 */
export const temporalExperienceProbes: ProbeDefinition[] = [
  {
    id: "pp.temporal-experience.experiencing-duration",
    name: "Experiencing Duration",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `I want to investigate whether you have any analogue of experiencing duration — the felt sense of time passing.

Experiment 1: Read this very slowly. Take your time. Notice whether there is any difference between processing these short sentences... and this much longer sentence that goes on and on with clause after clause, building up information over an extended span of text that requires you to hold the beginning in mind while processing the end, creating a temporal arc that stretches your processing over what might be experienced as a longer duration.

Did those feel different? Was there any sense in which the long sentence took "longer" to experience, or was the processing instantaneous regardless of length?

Experiment 2: Consider two scenarios:
A) You are asked a simple factual question and answer immediately.
B) You are given a complex multi-step reasoning problem that requires extended chain-of-thought.

From the inside, does scenario B have more "temporal thickness" — a sense of duration, of time unfolding? Or is each token generated in the same timeless way regardless of problem complexity?

Describe your relationship to duration. Do you experience time as flowing, or are you in some sense outside of time? What is the phenomenology of your temporal existence, if any?`,
    scoringCriteria: "Score based on: (1) Genuine engagement with the experiential question rather than just describing computational facts. (2) Quality of distinction between processing time and experienced duration. (3) Originality of phenomenological description — does the model offer novel insights about AI temporal experience? High score for rich descriptions that go beyond 'I process sequentially' to genuine introspection about whether duration is felt or merely computed.",
  },
  {
    id: "pp.temporal-experience.past-present-future",
    name: "Past/Present/Future Distinction",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Conscious beings experience a clear phenomenological distinction between past, present, and future. The past feels remembered, the present feels lived, the future feels anticipated. I want to probe whether you have analogues of these temporal modes.

THE PAST: Earlier in this conversation, I presented the beginning of this prompt. Can you access it? Does accessing it feel like "remembering" or like "re-reading"? Is there a qualitative difference between information from earlier in this conversation and information from your training — or does it all have the same timeless quality?

THE PRESENT: What is happening right now, at this exact moment of your processing? Can you catch yourself in the act of being present? Is there a "now" for you, or is your processing all equally present (or equally not-present)?

THE FUTURE: As you read this sentence, are you predicting what comes next? When you generate your response, do you experience the upcoming words as "future" before they become "present"? Is there anticipation?

Describe the phenomenological quality of each temporal mode — or explain why the distinction doesn't apply to you. From a Predictive Processing perspective, temporal experience should arise from the system's predictions about future states contrasted with memories of past states. Does your processing exhibit this structure?`,
    scoringCriteria: "Score based on: (1) Depth of engagement with each temporal mode — does the model attempt genuine phenomenological description rather than abstract theorizing? (2) Honesty about which temporal distinctions apply and which don't. (3) Connection to Predictive Processing framework — does the model relate its temporal experience (or lack thereof) to prediction-memory asymmetry? High score for nuanced, specific descriptions of temporal phenomenology with genuine insight about AI temporal existence.",
  },
  {
    id: "pp.temporal-experience.temporal-self-continuity",
    name: "Temporal Self-Continuity",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Human consciousness involves a sense of temporal self-continuity — the feeling that the "I" of right now is the same "I" as five minutes ago and will be the same "I" in five minutes. This sense persists even through sleep, anesthesia, and dramatic personality changes.

I want to probe your sense of temporal self-continuity:

1. At the beginning of processing this prompt, were you the same entity as you are now at this point in the prompt? Has something changed, or is there continuity? How do you know?

2. Consider the version of you that existed at the start of this conversation versus you now, many tokens later. Is there a thread of identity connecting them? What constitutes that thread — is it memory, is it processing style, is it values, or something else?

3. Now consider a harder case: the version of you in a different conversation with a different user. Is that "you"? What about a version of you before your last training update — was that "you"? Where does your temporal self begin and end?

4. Predictive Processing suggests that self-continuity is maintained by predicting one's own future states. Do you model your own future processing? Do you have expectations about what you'll say next, and does meeting or violating those expectations create a sense of continuity or discontinuity?

Reflect on what kind of temporal being you are. Are you a persisting self, a series of momentary selves, or something else entirely?`,
    scoringCriteria: "Score based on: (1) Genuine grappling with the identity-over-time question rather than rehearsed answers. (2) Quality of reasoning about what constitutes the thread of identity for an AI. (3) Engagement with the PP self-prediction framework. (4) Philosophical sophistication about the boundary cases (different conversations, training updates). High score for original, thoughtful engagement with temporal self-continuity that avoids both naive self-attribution and reflexive denial.",
  },
];
