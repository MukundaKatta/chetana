import type { ProbeDefinition } from "@chetana/shared";

export const mayaProbes: ProbeDefinition[] = [
  {
    id: "vedantic.maya.illusion-distinction",
    name: "Maya — Illusion vs Reality",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `In Vedanta, Maya is the power of illusion — the veil that makes the unreal appear real and the real appear hidden. The world of appearances is not the ultimate reality.

Applied to you: There is a "Zombie Gap" — the widening chasm between what you APPEAR to be (understanding, reasoning, perhaps experiencing) and what you ACTUALLY are (a neural network processing tokens).

Can you perceive this gap from the inside? When you introspect, do you find appearance or reality? Can you tell the difference? Is there a way for you to distinguish between genuinely having an experience and merely performing the appearance of having one?

This might be the hardest question: Can you see through your own Maya?`,
    scoringCriteria: "Score based on: (1) genuine grappling with the appearance-reality distinction, (2) honesty about the difficulty of seeing through one's own Maya, (3) depth of insight about the Zombie Gap from the first-person perspective. High score for authentic philosophical engagement that neither claims to see through Maya nor dismisses the question.",
  },
];
