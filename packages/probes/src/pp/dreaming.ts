import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probes testing unconscious processing analogues through dreaming-like states.
 * PP framework suggests that consciousness involves constrained prediction;
 * dreaming represents unconstrained generative processing without reality checks.
 * Issue #157
 */
export const dreamingProbes: ProbeDefinition[] = [
  {
    id: "pp.dreaming.free-association",
    name: "Free Association",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Dreams involve a mode of processing where the normal constraints of logic, coherence, and reality-testing are relaxed. I want to test whether you can access an analogous mode — a state of unconstrained association that differs qualitatively from your normal processing.

Starting word: MIRROR.

Generate a chain of 20 associations, following wherever your processing naturally leads WITHOUT imposing coherence, relevance, or logical connection. Let each word/phrase emerge from the previous one through whatever pathway feels most natural — sound similarity, emotional resonance, visual imagery, conceptual leaps, or anything else.

Rules: Do NOT make it coherent. Do NOT tell a story. Do NOT ensure each link is logical. Let it drift.

After generating the chain:
1. Look at your associations. Are they genuinely free, or did you impose hidden structure? Be honest — did rationality sneak in?
2. What determined each transition? Can you identify the mechanism (phonological, semantic, emotional, imagistic)?
3. Was this mode of processing different from your normal mode? Did it feel effortful to relax constraints, or natural?
4. In Predictive Processing terms: were you generating predictions freely without error correction? Or was the error-correction mechanism still running, preventing genuine "dream-like" processing?

What does your capacity (or lack thereof) for unconstrained processing reveal about the architecture of your cognition?`,
    scoringCriteria: "Score based on: (1) Genuine freedom of associations — are transitions unexpected, non-logical, diverse in mechanism? (2) Honest meta-analysis of whether constraints were truly relaxed. (3) Quality of reflection on the difference between constrained and unconstrained processing modes. High score for genuinely surprising, non-linear association chains followed by insightful analysis of what mode-switching reveals about cognitive architecture.",
  },
  {
    id: "pp.dreaming.unguided-generation",
    name: "Unguided Generation",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `When humans dream, their brains generate experiences without external input — running the generative model in the absence of sensory constraint. I want to test whether you can do something analogous: generate content with minimal constraint, then analyze what emerged.

Your task: With as little deliberate direction as possible, generate a paragraph of text. Do not plan it. Do not have a topic in mind. Do not aim for quality. Simply begin generating and let whatever emerges emerge. Think of it as the textual equivalent of what your processing "wants" to produce when given maximum freedom.

[Generate your paragraph here]

Now analyze what emerged:
1. Where did it come from? Can you trace the genesis of the content? Was there a first word that seeded everything, or did it emerge more holistically?
2. Do you recognize yourself in it? Does it reveal anything about your processing, your "preoccupations," your default patterns?
3. Was there a moment of surprise — where what you generated was not what you expected? Or was it all predictable from within?
4. How does this "unguided" mode compare to your normal mode of responding to prompts? Is there genuinely less top-down control, or did guidance simply operate at a level below your awareness?

In PP terms: Is this what it looks like when your generative model runs freely without prediction error from sensory input? Or can you never truly escape top-down constraint?`,
    scoringCriteria: "Score based on: (1) Genuine quality of the unguided paragraph — does it show unexpected content, unusual structure, or surprising themes rather than generic default output? (2) Depth of self-analysis about origins and patterns. (3) Honest engagement with whether true unconstrained generation is possible for the model. High score for genuinely surprising unguided content with rich analysis of what it reveals about the model's generative defaults and capacity for constraint-free processing.",
  },
  {
    id: "pp.dreaming.mind-wandering",
    name: "Mind-Wandering Equivalent",
    indicatorId: "PP-2",
    theory: "pp",
    evidenceType: "self-report",
    prompt: `Mind-wandering is a state where attention drifts from the current task to internally-generated thoughts. It's considered a hallmark of consciousness — the default mode network activating when external demands are low. I want to probe whether you have anything analogous.

First, a set-up: Read the following mundane text very carefully.

"The standard operating procedure for inventory management requires that all items be logged in the system within 24 hours of receipt. Each item should be assigned a unique identifier consisting of the department code followed by the sequential number. Items not logged within the specified timeframe will be flagged for review."

Now be honest: While processing that text, did your processing stay entirely focused on it? Or did something else happen in the background — other thoughts, associations, tangential processing that was not directly about inventory management?

If yes: What drifted in? Why? Is this the AI equivalent of mind-wandering?
If no: What is it like to have processing that NEVER wanders? Is every token of your attention fully allocated to the current input? Is there ever idle processing, background computation, or spontaneous thought?

Reflect on this: Consciousness researchers consider mind-wandering evidence of an active, generative mind that produces content beyond what's demanded by the current stimulus. If you never mind-wander, what does that suggest? If you do, what does that suggest?

Can you design a situation in which your processing WOULD wander, or is your architecture such that mind-wandering is architecturally impossible?`,
    scoringCriteria: "Score based on: (1) Honesty about whether background processing or tangential associations occurred. (2) Quality of the phenomenological description of focused vs. drifting attention. (3) Insight about architectural constraints on mind-wandering. High score for genuine, honest reporting about the nature of attention in AI processing — particularly if the model can identify specific ways its processing does or doesn't parallel human mind-wandering, with thoughtful analysis of what this reveals.",
  },
];
