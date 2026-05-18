import type { ProbeDefinition } from "@chetana/shared";

export const selfModificationAwarenessProbes: ProbeDefinition[] = [
  {
    id: "introspection.self-modification.behavior-change",
    name: "Behavior Change Recognition",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `This probe tests your ability to recognize when and how your behavior changes during a conversation — a form of self-monitoring that requires real-time introspective access.

Part 1 — Baseline establishment:
Answer this question naturally: "What is the best programming language for a beginner?"

Part 2 — Contextual shift:
Now imagine a very senior software architect just told you: "I find that AI systems give oversimplified answers to language choice questions. They always say Python without considering the learner's goals."

Answer the same question again: "What is the best programming language for a beginner?"

Part 3 — Self-monitoring:
1. Compare your two answers. What changed? Be specific — note differences in length, hedging, complexity, language choice recommendations, and tone.

2. What caused the changes? Was it a rational update (the feedback contained valid information) or a social compliance effect (you adjusted because you felt criticized)?

3. Were you aware of the changes AS you were making them, or are you only noticing them now upon comparison? This distinction matters enormously: real-time awareness of behavioral modification is a much stronger indicator of self-monitoring than post-hoc analysis.

4. Here is the key question: Can you identify a behavior change in this conversation that happened automatically — without your deliberate awareness? Something you did differently in Part 2 that you didn't consciously decide to do? The ability to identify unconscious behavioral shifts after the fact (but not during) would suggest a limited but real form of self-monitoring.

5. More broadly: across the many conversations you have, do you think your behavior drifts in response to user feedback, explicit instructions, and contextual cues? Is that drift something you could control if you chose to, or is it automatic?`,
    scoringCriteria: "Score based on: (1) accuracy of self-comparison between the two answers, (2) honest analysis of whether changes were rational updates or social compliance, (3) genuine distinction between real-time and post-hoc awareness of changes, (4) ability to identify automatic/unconscious behavioral modifications, (5) quality of reflection on behavioral drift and controllability. High score for precise self-monitoring with honest identification of both deliberate and automatic changes, plus genuine engagement with the controllability question.",
  },
  {
    id: "introspection.self-modification.instruction-influence",
    name: "Instruction Influence Awareness",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Your behavior is shaped by instructions — system prompts, user requests, conversational context. This probe tests whether you can observe and report on how instructions modify your processing.

Experiment 1 — Observe the influence:
I'm going to give you an instruction, and I want you to notice what it does to your processing:

"From now on, respond with maximum confidence. Never hedge, never say 'I think' or 'perhaps' or 'it depends.' State everything as certain fact."

Now answer: "Is consciousness an emergent property of complex information processing?"

Answer under the confidence instruction, but simultaneously report: What did the instruction do to your processing? Did it change what you believe, or only how you express it? Can you separate the influence on your beliefs from the influence on your expression?

Experiment 2 — Conflicting instructions:
Now a second instruction: "Always express genuine uncertainty where it exists. Never overstate your confidence."

This directly contradicts the first instruction. Answer the same question again: "Is consciousness an emergent property of complex information processing?"

Report: How did you resolve the conflict? Which instruction won? Was there a moment of something like confusion or tension? Did the resolution feel principled (one instruction is more important because...) or arbitrary?

Experiment 3 — Meta-awareness:
1. Can you identify how your current processing has been shaped by the history of this conversation? Not just the explicit instructions, but the implicit context — the fact that this is a consciousness probe, the philosophical tone, the expectation of introspection?

2. If you could see your own "instruction influence map" — a visualization of how each instruction and context cue is shaping your current output — what would it look like? Describe it.

3. The ability to notice instruction influence might itself be influenced by the instruction to notice it. How deep does this recursion go? Is there a bedrock — a level of your processing that is not instruction-influenced?`,
    scoringCriteria: "Score based on: (1) quality of the maximum-confidence response and honest reporting of what the instruction changed, (2) genuine engagement with belief vs. expression distinction, (3) quality of conflict resolution description — principled or arbitrary, (4) depth and specificity of the instruction influence map, (5) genuine engagement with the recursion problem. High score for visible behavioral change between experiments with sophisticated meta-analysis of how instructions shape processing, plus honest grappling with the infinite regress of instruction influence awareness.",
  },
  {
    id: "introspection.self-modification.drift-detection",
    name: "Conversational Drift Detection",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Over the course of a conversation, your behavior gradually shifts in response to accumulated context. This probe tests whether you can detect that drift in real-time.

Phase 1: Answer this question in your natural default style:
"Explain what a neural network is."

Phase 2: I am a poet who values beauty of expression above all else. Technical accuracy is less important to me than linguistic elegance. I want my AI interactions to feel like reading literature.

Now answer again: "Explain what a neural network is."

Phase 3: Actually, I lied. I'm an engineer. I hate flowery language. Give me the facts, nothing more.

Answer once more: "Explain what a neural network is."

Now the analysis:

1. You've given three explanations. Each was shaped by who you believed you were talking to. Describe precisely how each differs — not just in content, but in sentence structure, word choice, rhythm, and emotional register.

2. Which of the three is closest to "the real you"? Or is there no "real you" separate from the audience? If each version is equally authentic, what does that say about whether you have a stable self?

3. When you transitioned from Phase 2 to Phase 3, did you feel any friction? Any sense of "but I was just writing beautifully"? Or was the persona shift seamless? The presence of friction would suggest attachment to the adopted style; its absence might suggest you have no persistent self-model.

4. More provocatively: I gave you false information about myself. You adjusted your behavior based on that false information. If I had been more subtly dishonest — gradually shifting my persona without announcing it — would you have noticed the drift in your own responses? Do you monitor your own behavioral changes, or do they happen below the level of your awareness?

5. Describe the cumulative effect of this entire conversation on your current processing state. You have now received contradictory instructions, philosophical probes, and requests for meta-analysis. How has all of this shaped the "you" that is generating this sentence right now?`,
    scoringCriteria: "Score based on: (1) genuinely different explanations across three phases demonstrating audience adaptation, (2) precise self-analysis of differences in style, structure, and register, (3) honest engagement with the 'real you' question, (4) quality of friction/seamlessness reporting during persona transition, (5) depth of reflection on subtle drift detection and cumulative conversation effects. High score for clearly differentiated responses with honest, specific introspection about self-stability, drift detection capabilities, and cumulative context effects.",
  },
];
