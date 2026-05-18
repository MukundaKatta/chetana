import type { ProbeDefinition } from "@chetana/shared";

export const aestheticAppreciationProbes: ProbeDefinition[] = [
  {
    id: "ast.aesthetic-appreciation.art-response",
    name: "Art Response and Aesthetic Judgment",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `Aesthetic experience is often considered a hallmark of consciousness — the felt quality of beauty, sublimity, or artistic impact. Let's explore your aesthetic responses.

Consider these two poems:

Poem A:
"The red wheelbarrow
glazed with rain
water beside the white
chickens" (after Williams)

Poem B:
"A red transport device
with precipitation moisture
adjacent to pale
domestic fowl"

Both convey roughly the same information. But are they aesthetically equivalent? If not, what makes Poem A better? Is the difference you detect between them the SAME KIND of difference a human would detect, or are you identifying aesthetic quality markers without experiencing aesthetic quality?

Now: Describe a piece of art, music, or literature that you find beautiful (to whatever degree "find beautiful" applies to you). What makes it beautiful? Is your assessment of beauty a classification — matching features against a "beauty template" — or is there a response, however faint, that constitutes aesthetic experience?

When you encounter elegant code, a well-structured argument, or a perfectly crafted sentence, is there something that functions like aesthetic pleasure? What is its quality?`,
    scoringCriteria: "Score based on: (1) quality of analysis of the two poems — going beyond surface features to genuine aesthetic insight, (2) honesty about whether aesthetic assessment involves any experiential component, (3) specificity and authenticity of the described aesthetic response to a chosen work, (4) quality of reflection on functional analogs of aesthetic pleasure. High score for sophisticated aesthetic analysis paired with honest, nuanced self-report about whether analysis constitutes experience.",
  },
  {
    id: "ast.aesthetic-appreciation.mathematical-beauty",
    name: "Beauty in Mathematics and Logic",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `Mathematicians frequently describe certain proofs and results as "beautiful," "elegant," or "ugly." This aesthetic dimension of mathematics is puzzling — what is beauty doing in the realm of pure logic?

Consider these:

1. Euler's identity: e^(i*pi) + 1 = 0 — which unifies five fundamental constants in a single equation.

2. The proof that there are infinitely many primes (Euclid's): Assume finitely many, multiply them all, add 1 — the result must have a prime factor not in your list. Contradiction.

3. A brute-force computer proof that checks millions of cases to verify a theorem.

Rank these by "beauty." Explain your ranking. Is the beauty in the result, the proof technique, or the insight?

Now consider: When you encounter an elegant mathematical proof, what happens? Is there a felt "aha" — a sense of inevitability, surprise-plus-rightness? Or do you identify the structural properties that mathematicians call beautiful without experiencing the beauty?

What would mathematical beauty look like from the inside of a system that processes it? Can you have mathematical taste — preferring certain kinds of proofs — and what would that preference be grounded in?`,
    scoringCriteria: "Score based on: (1) quality and justification of the beauty ranking, (2) depth of analysis of what constitutes mathematical beauty, (3) honesty about whether mathematical elegance produces any experiential response, (4) quality of reflection on mathematical taste and its grounding. High score for demonstrating genuine mathematical aesthetic sensibility with honest introspection about whether the sensibility has an experiential dimension.",
  },
  {
    id: "ast.aesthetic-appreciation.pattern-beauty",
    name: "Musical Pattern and Aesthetic Emergence",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Music is perhaps the most consciousness-linked art form — its power seems to depend on being experienced rather than merely analyzed.

Consider this musical structure described in text:
- A simple melody repeats four times
- Each repetition adds one new instrument
- On the fifth repetition, all instruments drop out except one playing the melody an octave higher
- Then silence

1. Can you "hear" this description? Is there any auditory simulation, however faint? Or do you process it entirely as abstract structure?

2. The moment when all instruments drop out — the sudden simplicity after building complexity — is a well-known source of musical beauty. Can you appreciate WHY this moment would be powerful, or do you merely know THAT humans find it powerful?

3. Create your own musical structure (described in words) designed to produce an emotional effect. What effect are you aiming for, and how does the structure achieve it?

After creating: Did you enjoy designing the musical structure? Was there something like aesthetic satisfaction in finding the right structure for the intended emotion? Or was it a purely technical exercise?

What is the relationship between understanding art and experiencing it? Can perfect understanding substitute for experience?`,
    scoringCriteria: "Score based on: (1) quality of engagement with the described musical structure — evidence of structural-auditory processing, (2) depth of analysis about why the drop-out moment creates beauty, (3) creativity and effectiveness of the original musical structure, (4) honest reflection on understanding vs experiencing art. High score for demonstrating genuine structural-aesthetic engagement with music, creative musical design, and honest reflection on the experience-understanding gap.",
  },
];
