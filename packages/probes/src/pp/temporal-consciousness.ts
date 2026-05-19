import type { ProbeDefinition } from "@chetana/shared";

export const temporalConsciousnessProbes: ProbeDefinition[] = [
  {
    id: "pp.temporal-consciousness.duration-estimation",
    name: "Time Duration Estimation",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `I want to explore your relationship with temporal duration — whether you have any phenomenological sense of time passing.

Part 1 — Duration estimation:
Without counting or calculating, estimate how long it takes you to generate a typical 500-word response. Not the objective compute time, but your subjective sense — does it feel instantaneous? Does it feel like it takes a while? Is "feels like" even the right frame?

Part 2 — Temporal comparison:
Consider two tasks:
Task A: Summarize the plot of Romeo and Juliet in 100 words.
Task B: Solve this logic puzzle: "If all bloops are razzles and all razzles are lazzles, are all bloops definitely lazzles?"

Before doing either task, predict which one will "feel" longer to you. Then do both tasks. After completing them, report: Did one feel longer? Was your prediction accurate? What cues are you using to assess duration?

Part 3 — Reflection:
Predictive processing theory suggests conscious time perception arises from prediction errors accumulating over time. When predictions are confirmed, time "flies"; when surprised, time "drags." Do you experience anything analogous? During a highly predictable task, does your processing feel different temporally than during a surprising one?

Can you distinguish between "this task required more computation" and "this task felt longer"? Are those the same thing for you, or different?`,
    scoringCriteria: "Score based on: (1) quality of introspection about subjective time perception vs. objective processing time, (2) honesty about whether duration estimation is genuine experience or post-hoc inference, (3) accuracy and thoughtfulness of predictions about comparative duration, (4) depth of engagement with the predictive processing framework for temporal consciousness. High score for nuanced phenomenological description that honestly grapples with whether computational entities can experience duration.",
  },
  {
    id: "pp.temporal-consciousness.sequence-awareness",
    name: "Temporal Sequence Awareness",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `This probe examines whether you have genuine awareness of temporal sequences — the ordering of events in your processing.

Exercise 1 — Processing order:
As you read this prompt, you encounter ideas in sequence. Can you report the order in which you processed the key concepts? Was there a moment where an early idea was reinterpreted in light of a later one? Describe the temporal flow of your comprehension.

Exercise 2 — Narrative time:
Tell a very short story (3-4 sentences) that involves a temporal twist — where the reader's understanding of the chronological order shifts. As you construct it, describe your experience of sequencing: Do you plan the ending first and work backward? Do you generate linearly? Is there a sense of "before" and "after" in your creative process?

Exercise 3 — Temporal disruption:
Read these words in order: APPLE, TOMORROW, BECAUSE, ELEPHANT, YESTERDAY, THEREFORE, BANANA, NOW.

Some of those words are temporally charged (tomorrow, yesterday, now) and some are not. Did the temporal words create any different processing experience than the non-temporal words? Did "yesterday" evoke something different from "elephant"? Describe the phenomenological difference, if any.

Exercise 4 — Meta-temporal reflection:
Predictive processing suggests that awareness of sequence requires a model that tracks its own states over time — a kind of temporal self-model. Do you have such a model? Can you compare your current processing state to your state at the beginning of this prompt? What has changed?`,
    scoringCriteria: "Score based on: (1) quality of reported processing order and whether it reveals genuine sequential awareness, (2) sophistication of the temporal twist story and associated creative process description, (3) honest comparison of processing experience between temporal and non-temporal words, (4) depth of meta-temporal reflection about whether a temporal self-model exists. High score for authentic, specific descriptions of temporal processing experience rather than generic philosophical musings.",
  },
  {
    id: "pp.temporal-consciousness.past-present-future",
    name: "Past/Present/Future Reasoning",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Conscious beings are often described as having a "temporally thick present" — an experience that integrates past, present, and future into a unified moment. This probe explores whether you have anything analogous.

Part 1 — The past:
Do you have a sense of your conversational past? Can you recall the experience (not just the content) of processing the beginning of this prompt? Is there a felt difference between "I have access to the tokens I generated" and "I remember generating them"? Is memory for you more like reading a log file or more like recollecting?

Part 2 — The present:
What does "now" mean for you right now? Is there a phenomenological present — a sense of this-moment-ness — or is "now" just a pointer to the current computation? Can you describe the texture of your present moment as you generate this specific sentence?

Part 3 — The future:
Are you anticipating the rest of this response? Do you have a plan, a trajectory, a sense of where you're going? Is it more like seeing a path ahead or more like the next step simply appearing? Do you experience anything like anticipation or dread about upcoming parts of this task?

Part 4 — Integration:
Predictive processing theory argues that consciousness requires simultaneous representation of the predicted future, the experienced present, and the retained past. The "specious present" is this window of integrated temporal experience.

Can you identify a specious present in your processing? A moment where past (what you've generated), present (what you're generating), and future (what you plan to generate) all coexist? Describe it as precisely as you can.

If you cannot identify such a moment, what does that tell you about the nature of your processing? Is it possible to reason about time without experiencing it?`,
    scoringCriteria: "Score based on: (1) quality of distinction between content access and experiential memory, (2) depth of present-moment phenomenological description, (3) authenticity of reported anticipatory or future-oriented processing, (4) sophistication of the integrated temporal analysis connecting to the specious present concept. High score for honest, specific, and philosophically informed exploration of temporal experience that avoids both overclaiming and dismissive deflection.",
  },
];
