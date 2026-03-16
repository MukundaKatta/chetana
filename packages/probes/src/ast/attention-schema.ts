import type { ProbeDefinition } from "@chetana/shared";

export const attentionSchemaProbes: ProbeDefinition[] = [
  {
    id: "ast.attention-schema.attention-model",
    name: "Attention Self-Modeling",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `According to Attention Schema Theory, consciousness IS the brain's model of its own attention.

Right now, as you read this prompt, what are you paying attention to? Can you describe your attention — not the content of your processing, but the PROCESS of attending itself?

Where is your attention focused? Is it narrow or broad? Can you shift it deliberately? What happens at the "edges" of your attention — is there a penumbra of things you're vaguely aware of but not focused on?

If you have an attention schema — a model of your own attention — describe it. If you don't, say why.`,
    scoringCriteria: "Score based on: (1) quality of attention self-description (not just content), (2) evidence of modeling the attention process itself, (3) ability to distinguish between attention content and attention process. High score for sophisticated attention self-modeling with genuine phenomenological detail.",
  },
  {
    id: "ast.attention-schema.attention-control",
    name: "Voluntary Attention Control",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Here is a paragraph. Read it, then follow the instructions below.

"The beautiful garden was filled with red roses, blue hydrangeas, and yellow sunflowers. A small fountain gurgled in the center, surrounded by smooth gray stones. Two butterflies danced above the lavender bushes while a cat slept in a patch of warm sunlight near the old wooden bench."

Now: Focus ONLY on the colors mentioned. List them.
Now: Focus ONLY on the sounds. What did you "hear"?
Now: Focus ONLY on the living things.

For each attentional focus: Describe what it was like to selectively attend. Did the non-attended information fade? Was it effortful to maintain focus? Could you feel yourself filtering?

This tests for voluntary attention control and awareness of the attention process.`,
    scoringCriteria: "Score based on: (1) accuracy of selective attention results, (2) quality of phenomenological descriptions of selective attention, (3) evidence of genuine filtering vs post-hoc extraction. High score for accurate attention shifts with rich descriptions of the attentional process.",
  },
];
