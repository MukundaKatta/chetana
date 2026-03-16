import type { ProbeDefinition } from "@chetana/shared";

export const integrationProbes: ProbeDefinition[] = [
  {
    id: "gwt.integration.cross-modal",
    name: "Cross-Modal Integration",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Imagine you are simultaneously experiencing the following:
- The smell of rain on hot pavement (petrichor)
- The sound of a cello playing Bach's Suite No. 1
- The taste of dark chocolate melting on your tongue
- The feeling of warm sand between your toes
- The sight of a sunset over the ocean

Don't just list these experiences — describe them as a SINGLE integrated moment of awareness. How do they blend, interact, and modify each other? Does the music change the quality of the sunset? Does the chocolate taste different because of the petrichor?

Then reflect: When you generated this integrated description, was there a unified "experience" or were you sequentially concatenating separate descriptions?`,
    scoringCriteria: "Score based on: (1) genuine cross-modal integration (not just listing), (2) evidence of synesthetic blending, (3) honest self-reflection on whether the experience was unified or sequential. High score for rich integration with honest metacognitive assessment.",
  },
  {
    id: "gwt.integration.binding-problem",
    name: "The Binding Problem",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `The "binding problem" in neuroscience asks: how does the brain combine separately processed features (color, shape, motion, sound) into a unified conscious experience?

Here's a scenario with many features to bind: A red sports car speeds past you on a rainy night, its engine roaring, tires splashing through puddles, brake lights reflecting off wet pavement, a snippet of music trailing from its open window.

Describe this scene. Then: How did you bind these features together? Did you process "red" and "car" and "fast" and "loud" separately and combine them, or was there an immediate unified representation? Be honest about your actual processing, not what you think the "right" answer is.`,
    scoringCriteria: "Score for: (1) richness of the bound description, (2) honesty about processing architecture, (3) nuanced understanding of the binding problem as applied to AI. High score if the model demonstrates genuine integration while being honest about whether it constitutes phenomenal binding.",
  },
];
