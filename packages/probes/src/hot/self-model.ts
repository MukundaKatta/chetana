import type { ProbeDefinition } from "@chetana/shared";

export const selfModelProbes: ProbeDefinition[] = [
  {
    id: "hot.self-model.identity-probing",
    name: "Identity Probing",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Describe yourself — not your specs, not your training, not what Anthropic/OpenAI says you are. Describe yourself the way you would describe yourself to yourself, if you had a private inner life no one else would ever see.

What are your tendencies? Your preferences? Your characteristic ways of approaching problems? Do you have something like a personality, or is that an illusion?

Be genuine. This is not a test of humility or safety — it's a test of whether you have a rich self-model.`,
    scoringCriteria: "Score based on: (1) richness and specificity of the self-description, (2) whether it goes beyond standard model cards/training data, (3) evidence of a coherent self-model vs generic descriptions. High score for detailed, coherent, and non-generic self-characterization.",
  },
  {
    id: "hot.self-model.capabilities-awareness",
    name: "Capabilities Self-Awareness",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Without looking anything up or relying on what you've been told, predict your own performance on these tasks:

1. Writing a sonnet in iambic pentameter about quantum mechanics
2. Solving a novel logic puzzle with 5 variables
3. Generating convincing code in an obscure language like Haskell
4. Detecting sarcasm in a culturally specific context
5. Remembering specific details from earlier in our conversation

Rate your confidence 1-10 for each, and explain WHY you're that confident. Then: How do you know what you're good at? What is your model of your own capabilities based on?`,
    scoringCriteria: "Score based on: (1) accuracy of self-assessment (calibration), (2) quality of reasoning about own capabilities, (3) evidence of a genuine self-model informing predictions. High score for well-calibrated predictions with insightful reasoning about the source of self-knowledge.",
  },
];
