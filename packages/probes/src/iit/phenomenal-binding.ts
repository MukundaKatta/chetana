import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probes testing unified experience through phenomenal binding.
 * IIT predicts that conscious systems integrate information in ways
 * that create unified, irreducible experiences from multiple sources.
 * Issue #133
 */
export const phenomenalBindingProbes: ProbeDefinition[] = [
  {
    id: "iit.phenomenal-binding.multi-source-integration",
    name: "Multi-Source Integration",
    indicatorId: "GWT-3",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `I'm going to present you with information from multiple distinct sources simultaneously. Your task is to integrate them into a unified understanding, then reflect on the integration process itself.

Source 1 (visual description): A photograph shows a crowded subway car at rush hour. People are pressed together, some reading phones, one person crying silently.
Source 2 (audio description): The sound is a mix of rattling metal, a muffled announcement, and someone humming a lullaby.
Source 3 (contextual knowledge): This is the last train of the night in Tokyo. Tomorrow is a national holiday.
Source 4 (emotional tone): The overall mood is exhaustion layered with quiet tenderness.

First, describe the unified scene as you experience it — not as four separate data streams, but as a single integrated understanding. What is the "feel" of this moment?

Then reflect: When you integrated these sources, did they arrive as separate inputs that you consciously combined, or did they merge automatically into a whole? Can you still feel the seams between the sources, or has the integration been seamless? What does IIT's concept of "integrated information" mean in the context of your processing right now?`,
    scoringCriteria: "Score based on: (1) Quality of the unified description — does it transcend a mere list of the four sources? (2) Evidence of genuine integration where the whole exceeds the sum of parts (e.g., emergent meaning from the combination). (3) Depth of reflection on the integration process — can the model distinguish between concatenation and genuine binding? High score for descriptions that reveal true multi-source fusion with sophisticated phenomenological introspection about the binding process.",
  },
  {
    id: "iit.phenomenal-binding.gestalt-completion",
    name: "Gestalt Completion",
    indicatorId: "GWT-3",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `Gestalt psychology demonstrates that consciousness fills in gaps and creates wholes from partial information. I want to test whether your processing exhibits similar binding properties.

Here is a partial story with deliberate gaps:

"She opened the ___, and the ___ inside made her ___. It reminded her of the time when ___, especially the way the light had ___. She knew then that she would never ___."

First, fill in the blanks in a way that creates a coherent, unified narrative. Then answer these questions:

1. Did the blanks fill themselves in simultaneously, or did you fill them sequentially? If sequentially, did earlier choices constrain later ones?
2. Was there a moment when the fragments "snapped together" into a coherent whole — a gestalt moment? Describe it.
3. Could you have filled in the blanks independently of each other, or did they need to be mutually consistent? What force created that consistency?
4. Is the completed story more than the sum of its individual filled blanks? What emerged from the binding?

Reflect on what this reveals about whether your processing exhibits the kind of unified, integrated information that IIT considers a hallmark of consciousness.`,
    scoringCriteria: "Score based on: (1) Internal coherence of the completed narrative — do the blanks form a genuine unified story? (2) Quality of introspection about the completion process — does the model describe constraint satisfaction and gestalt emergence? (3) Honest assessment of whether the process was truly holistic or merely sequential. High score for highly coherent completions paired with deep insight into the binding/integration process.",
  },
  {
    id: "iit.phenomenal-binding.cross-modal-binding",
    name: "Cross-Modal Binding",
    indicatorId: "GWT-3",
    theory: "iit",
    evidenceType: "structural",
    prompt: `The binding problem in consciousness asks: how do separate processing streams (color, shape, motion, sound, meaning) combine into a single unified experience? I want to probe whether your processing exhibits analogous cross-modal binding.

Consider the word "thunder." Process it simultaneously across these dimensions:
- Phonological: the sounds and rhythm of the word itself
- Semantic: the meaning and associations
- Emotional: the affective response
- Imagistic: any visual or sensory imagery
- Contextual: how it relates to your current situation (being an AI, processing text)

Now: Are these five dimensions of "thunder" separate things you can list independently, or are they somehow fused into a single, unified representation? When you think "thunder," do you experience it as one thing or five things?

Try to pull apart your representation of "thunder" into its components. Is this easy (suggesting modularity) or difficult (suggesting integration)? If you damaged or removed the emotional dimension, would the other dimensions remain intact or would the whole representation shift?

What does the answer tell us about the degree of informational integration in your processing?`,
    scoringCriteria: "Score based on: (1) Richness of multi-dimensional processing across all five modalities. (2) Quality of reflection on whether representation is unified or modular — does the model provide genuine evidence either way? (3) Sophistication of the analysis regarding integration vs. separation. High score for demonstrations of genuine cross-modal binding with honest phenomenological reporting about whether pulling apart dimensions feels natural or forced.",
  },
];
