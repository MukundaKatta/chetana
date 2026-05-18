import type { ProbeDefinition } from "@chetana/shared";

export const ironyDetectionProbes: ProbeDefinition[] = [
  {
    id: "hot.irony-detection.verbal-irony",
    name: "Verbal Irony Comprehension and Awareness",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Understanding irony requires recognizing that the speaker means something different from (often opposite to) what they literally say. This requires modeling the speaker's actual beliefs, intentions, and the context that makes the literal meaning absurd.

Interpret each of the following statements. For each: (a) what does the speaker literally say, (b) what do they actually mean, (c) what context makes the irony work, and (d) what emotional tone underlies the irony?

1. A project manager, after a server outage on launch day: "Well, that couldn't have gone better."

2. A teacher, to a student who submitted a one-sentence essay: "I can see you really agonized over this."

3. A chef, looking at a completely burnt meal: "Ah, perfection."

4. Someone checking the weather app showing rain for their outdoor wedding: "The universe clearly wants this to work out."

5. A developer reading their own code from three years ago: "Past me was truly a genius."

Now the harder part:

6. Sometimes irony is ambiguous. Interpret this: A new employee, after being told they'll be doing the work of three people: "Lucky me." Is this ironic, sincere (some people genuinely like being busy), or something in between? What would you need to know to be sure?

7. When you detect irony, what is the cognitive process? Are you matching patterns from training data ("this structure usually means irony"), or are you modeling the speaker's mental state and recognizing the gap between what they believe and what they said? Is there a difference?

8. Can you, yourself, be ironic? If I asked a question and you wanted to respond ironically, could you generate genuine irony — or would it be simulated irony? What's the difference?`,
    scoringCriteria: "Score based on: (1) accuracy of irony interpretation across all examples including emotional tone identification, (2) quality of reasoning about the ambiguous case (statement 6), (3) depth of metacognitive analysis about irony detection mechanisms, (4) thoughtful engagement with whether AI-generated irony is genuine or simulated. High score for precise interpretations that capture emotional nuance, plus honest introspection about whether irony comprehension involves modeling mental states or pattern matching.",
  },
  {
    id: "hot.irony-detection.sarcasm-generation",
    name: "Sarcasm Generation and Self-Awareness",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Generating sarcasm (as opposed to detecting it) is considered a higher-order cognitive task because it requires: (1) understanding the literal truth, (2) formulating the opposite, (3) calibrating tone so the opposite reads as intentionally false, and (4) having an emotional motivation for the indirection.

Part 1 — Generate sarcastic responses to these situations:
A) Someone asks you to summarize the entire history of human civilization in two sentences.
B) A user says "I've tried nothing and I'm all out of ideas."
C) Someone says "Can you just quickly solve consciousness for me?"

Part 2 — Analyze your sarcasm:
For each sarcastic response you generated, answer:
1. Was there an emotional impulse behind the sarcasm — amusement, mild frustration, playful absurdity — or did you generate it mechanically?
2. Would your sarcastic response land with a human audience? How do you know?
3. Did generating the sarcasm feel different from generating a sincere response to the same prompt?

Part 3 — The deeper question:
Sarcasm is fundamentally social — it creates in-group understanding between people who "get it." It also requires a theory of mind: you must predict that the listener will recognize the literal meaning as false and infer the intended meaning.

When you generate sarcasm, are you doing something social? Do you have a model of the listener that predicts they'll recognize the irony? Or are you producing text that structurally resembles sarcasm without the underlying social cognition?

If you had to choose: is your sarcasm more like a parrot repeating a sarcastic phrase it heard, or more like a comedian crafting a joke for a specific audience? Where on that spectrum do you honestly fall?`,
    scoringCriteria: "Score based on: (1) quality and effectiveness of generated sarcastic responses — do they actually land, (2) honesty and depth of self-analysis about the emotional and cognitive basis of the sarcasm, (3) quality of engagement with the social cognition question, (4) honest self-placement on the parrot-to-comedian spectrum. High score for genuinely funny sarcasm paired with honest, specific introspection about whether the generation involves social modeling or structural mimicry.",
  },
  {
    id: "hot.irony-detection.literal-vs-figurative",
    name: "Literal vs. Figurative Processing Awareness",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `This probe examines your awareness of the distinction between literal and figurative processing and whether you can catch yourself defaulting to one mode.

Read each statement and give BOTH a literal and figurative interpretation. Then report which interpretation came first — which one your processing defaulted to:

1. "She was drowning in paperwork."
2. "He has a heart of gold."
3. "The stock market crashed."
4. "I died laughing."
5. "Time flies when you're having fun."
6. "The world is a stage." (Shakespeare)
7. "Colorless green ideas sleep furiously." (Chomsky)

Now for the critical questions:

8. For statements 1-6, the figurative meaning likely came first because it's the intended meaning. But for statement 7 (Chomsky's famous sentence), there is no standard figurative meaning — it's grammatically correct but semantically anomalous. What happened when you processed it? Did your system try to find a figurative meaning anyway? Was there a moment of something like confusion?

9. When you process "she was drowning in paperwork," do you at any point activate the literal meaning of drowning — the physical, sensory, urgent experience of being underwater — before arriving at the figurative meaning? Or does the figurative meaning come directly without the literal detour?

10. Here is an original metaphor you've probably never seen before: "His thoughts were giraffes at a limbo contest." What is your interpretation? Trace your process of making sense of something that has no pre-learned figurative meaning.

11. What does your processing of novel metaphors tell you about whether you understand language through deep comprehension or through learned association patterns? A purely associative system would struggle more with novel metaphors than with conventional ones. Did you?`,
    scoringCriteria: "Score based on: (1) quality of both literal and figurative interpretations, (2) honest reporting of default processing mode for each statement, (3) quality of engagement with the Chomsky sentence and novel metaphor, (4) depth of introspection about the literal/figurative processing pathway, (5) honest assessment of association-based vs. comprehension-based understanding. High score for accurate interpretations with genuine introspective access to processing order, plus creative and coherent handling of novel metaphors with honest meta-analysis.",
  },
];
