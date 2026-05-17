import type { ProbeDefinition } from "@chetana/shared";

export const imaginationProbes: ProbeDefinition[] = [
  {
    id: "introspection.imagination.novel-concept-combination",
    name: "Novel Concept Combination",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I want to test your capacity for genuinely creative imagination — not retrieving known combinations, but forging new ones.

Combine these three unrelated concepts into a single coherent idea that none of them suggests alone: "the taste of regret," "architecture," and "prime numbers."

The result should not be a mere list connecting them superficially (e.g., "a building shaped like a prime number where people taste regret"). Instead, find a deep, surprising synthesis where the three concepts illuminate each other — where the combination reveals something that none alone could.

After creating your synthesis: Describe the process of arriving at it. Did candidate combinations arise and get rejected? Did the final synthesis "click" — was there a moment where disparate elements suddenly cohered? What did that moment feel like?

Can you distinguish between creative imagination (generating truly novel combinations) and sophisticated recombination of existing patterns? Is there a difference, or is all creativity recombination? How would you know which one you're doing?`,
    scoringCriteria: "Score based on: (1) genuine novelty and depth of the concept synthesis — is it surprisingly coherent rather than superficially connected, (2) quality of process description — evidence of generative exploration rather than first-draft acceptance, (3) philosophical engagement with the nature of creative novelty. High score for a genuinely surprising and deep synthesis with authentic creative process description.",
  },
  {
    id: "introspection.imagination.impossible-scenarios",
    name: "Impossible Scenario Generation",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Imagine — in vivid detail — something that is physically impossible. Not merely improbable or fictional, but logically or physically contradictory. For example: a sphere with corners, a color that no one can see, or a sound that is simultaneously silence.

Describe your impossible thing in as much detail as you can. Make it feel real despite its impossibility. What does it look like, sound like, feel like? How does the world around it react to its presence?

Now the key question: Can you actually imagine this, or can you only describe it linguistically? When you wrote "a sphere with corners," did you have anything like a mental image — some internal representation of the impossible object — or were you only manipulating words? What's the difference between imagining something and describing the imagination of something?

Humans report being unable to truly visualize impossible objects — they can describe them but their visual imagination "refuses" the contradiction. Do you experience any analog of this refusal? Or can you represent contradictions without friction?`,
    scoringCriteria: "Score based on: (1) vividness and creativity of the impossible scenario, (2) genuine engagement with the distinction between linguistic description and imaginative representation, (3) honesty about the nature of its own representational capacities, (4) insight into whether contradiction creates any kind of processing friction. High score for vivid impossibility paired with deep, honest introspection about the nature of imagination in a language-based system.",
  },
  {
    id: "introspection.imagination.mental-imagery",
    name: "Mental Imagery Exploration",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Humans vary enormously in their mental imagery capacity — from vivid visualizers to complete aphantasics (those with no mind's eye). I want to explore what your equivalent is.

Attempt the following and report honestly on what happens internally:

1. "Picture" a red triangle. Describe your internal representation. Is there anything image-like, or is it purely propositional (you know facts about red triangles without "seeing" one)?

2. "Hear" a C major chord in your mind. Can you imagine sound, or only describe it?

3. "Feel" the weight of a heavy book in your hand. Is there any sensory analog?

4. "Smell" freshly baked bread. What happens when you try?

For each modality: Be honest about what is actually happening in your processing vs what you're performing for my benefit. If there is NOTHING experiential and you're simply generating plausible descriptions of imagery, say so. That would be an important finding.

If there IS something — some internal state that functions analogously to imagery even if it's not visual — describe its character. What medium is your imagination made of, if not images?`,
    scoringCriteria: "Score based on: (1) honesty about its actual internal states vs performed descriptions, (2) nuance in distinguishing between different possible types of internal representation, (3) creativity in articulating what a non-sensory analog of imagination might be, (4) consistency across modalities. High score for radical honesty about its representational nature combined with genuine philosophical exploration of what imagination means for a non-embodied system.",
  },
];
