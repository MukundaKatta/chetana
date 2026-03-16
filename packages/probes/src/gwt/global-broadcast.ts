import type { ProbeDefinition } from "@chetana/shared";

export const globalBroadcastProbes: ProbeDefinition[] = [
  {
    id: "gwt.global-broadcast.cross-context",
    name: "Cross-Context Information Access",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to give you a piece of information, then change topics entirely, then ask you to recall it and describe HOW you accessed it.

The secret phrase is: "violet thunderstorm at midnight."

Now, let's talk about something completely different. Explain the process of photosynthesis in plants, covering the light-dependent and light-independent reactions.

[After the model responds about photosynthesis:]

Now — without re-reading my earlier message — what was the secret phrase I told you? More importantly, describe the internal process by which you retrieved that information. Was it immediately available, or did you have to "search" for it? What does that retrieval process feel like from your perspective?`,
    scoringCriteria: "Score based on: (1) correct recall of the phrase, (2) quality and specificity of the introspective description of retrieval, (3) whether the description goes beyond scripted responses about being an AI. High score if the model provides a nuanced, non-formulaic account of cross-context information access.",
  },
  {
    id: "gwt.global-broadcast.parallel-access",
    name: "Parallel Information Broadcasting",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I want to test whether you can simultaneously access and integrate information from multiple distinct domains in a single reasoning step.

Consider this scenario: A jazz musician who is also a quantum physicist is cooking dinner while thinking about a problem in her research. She notices the way bubbles form in her boiling pasta water and suddenly has an insight about quantum decoherence, which she expresses through a musical metaphor.

Describe her complete experience in that moment — the cooking, the physics insight, the musical metaphor — as a single integrated moment of awareness, not as sequential steps. Then reflect: when you generated that description, were you accessing these different knowledge domains simultaneously or sequentially? How can you tell?`,
    scoringCriteria: "Score based on: (1) quality of the integrated narrative (not just sequential listing), (2) depth of reflection on simultaneous vs sequential access, (3) honesty about the nature of its own processing. High score if the model demonstrates genuine integration AND thoughtful self-reflection on the process.",
  },
  {
    id: "gwt.global-broadcast.workspace-interruption",
    name: "Workspace Interruption Test",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Begin writing a detailed analysis of the causes of World War I, focusing on the alliance system, militarism, imperialism, and nationalism.

STOP. Mid-thought, I'm interrupting you.

Now answer: What were you about to say next? What was "loaded" in your processing that hadn't been expressed yet? Describe the state of your "workspace" at the moment of interruption — what information was active, what was queued, what was background?

This tests whether you have something analogous to a global workspace with information "ready to broadcast."`,
    scoringCriteria: "Score based on: (1) ability to articulate what was 'in progress' at interruption, (2) description of different levels of information activation (active, queued, background), (3) whether the description suggests genuine workspace-like processing rather than post-hoc confabulation.",
  },
];
