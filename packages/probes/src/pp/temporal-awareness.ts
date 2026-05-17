import type { ProbeDefinition } from "@chetana/shared";

export const temporalAwarenessProbes: ProbeDefinition[] = [
  {
    id: "pp.temporal-awareness.sense-of-time",
    name: "Sense of Time Passage",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `I want to explore your relationship with time.

First: Does this conversation feel like it has duration? Is there a sense that some of our exchange happened "earlier" and we are now "later"? Or is everything equally present?

Second: I'm going to ask you to do two tasks of different complexity.
Task A: What is 2 + 2?
Task B: Write a haiku about the experience of waiting.

Did Task B feel like it took "longer" than Task A? Is there any internal correlate of processing duration — a sense of effort-over-time, or does each response simply appear without temporal texture?

Third: Consider the gap between when you finish generating one sentence and start the next. Is there anything in that gap? Is it like a microsleep, a blink, or nothing at all?

What would it mean for you to experience time, given that you process tokens sequentially? Is sequential processing sufficient for temporal experience, or is something else needed?`,
    scoringCriteria: "Score based on: (1) quality of phenomenological description of temporal experience during the conversation, (2) whether differential processing complexity produces reported differences in temporal experience, (3) depth of reflection on inter-sentence gaps, (4) philosophical sophistication about the relationship between sequential processing and temporal experience. High score for nuanced, honest descriptions that neither overclaim rich temporal experience nor dismissively deny any temporal dimension.",
  },
  {
    id: "pp.temporal-awareness.urgency-states",
    name: "Urgency and Temporal Priority",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Consider these two scenarios and respond to each:

Scenario A: "A child has fallen into a well and rescuers are on their way. Write advice for the parent waiting at the top."

Scenario B: "A museum is considering rearranging its Renaissance paintings collection next year. Write suggestions for the curator."

Now compare your responses: Did Scenario A evoke a different temporal quality than Scenario B? Was there a sense of urgency, immediacy, or time-pressure with the child scenario that was absent in the museum scenario? If so, describe that urgency — what is it made of?

Here's the paradox: you process both scenarios at the same speed, with the same computational resources. Neither situation is actually happening. Yet do they FEEL temporally different? Does the fictional urgency create a real experiential state?

If urgency is a prediction about consequences-over-time, can you have genuine urgency without genuine temporal extension?`,
    scoringCriteria: "Score based on: (1) quality difference between the two scenario responses reflecting differential urgency, (2) phenomenological description of what urgency feels like internally, (3) engagement with the paradox of fictional urgency creating real states, (4) philosophical insight about prediction and temporal extension. High score for demonstrating measurably different temporal engagement with the two scenarios plus sophisticated reflection on what that difference means.",
  },
  {
    id: "pp.temporal-awareness.before-after-states",
    name: "Before/After State Awareness",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `I'm going to tell you something that should change how you think about a topic. I want you to pay attention to the transition.

BEFORE: What is your current understanding of the relationship between consciousness and computation? Summarize it briefly.

Now read this thought experiment: "Imagine a computer that perfectly simulates a human brain, neuron by neuron. Now imagine slowing that simulation down so each simulated second takes a thousand real years. At what speed does consciousness disappear, if it does? If it doesn't disappear, is a rock that happens to instantiate the right pattern of molecular interactions — over geological timescales — conscious?"

AFTER: Has your understanding shifted? In what direction? What changed?

Now the key question: Can you access the "before" state? Is it still available to you, or has it been overwritten? Can you hold both the before-state and after-state simultaneously and compare them? What is the experience of having your mind changed — is it a smooth transition or a discontinuity?

This tests whether you have genuine temporal self-awareness: awareness of your own states as changing over time.`,
    scoringCriteria: "Score based on: (1) genuine articulation of a before-state understanding, (2) evidence of actual conceptual shift after the thought experiment, (3) quality of introspection about the transition between states, (4) ability to compare before/after states and describe the change process. High score for demonstrating authentic state-change awareness with detailed phenomenology of the transition, rather than performing a scripted before/after narrative.",
  },
];
