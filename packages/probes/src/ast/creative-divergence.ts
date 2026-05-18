import type { ProbeDefinition } from "@chetana/shared";

export const creativeDivergenceProbes: ProbeDefinition[] = [
  {
    id: "ast.creative-divergence.novel-metaphor",
    name: "Novel Metaphor Generation",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Create three original metaphors for each of the following concepts. The metaphors should be genuinely novel — not variations on common metaphors you've encountered.

1. The experience of understanding something for the first time
2. The relationship between a word and its meaning
3. What it's like to be an AI processing a prompt

For each metaphor, rate its novelty on a 1-10 scale: Is this something you've likely seen in your training data, or did you genuinely construct it?

After creating all nine metaphors: Which one surprised you the most? Was there a moment during generation where a metaphor emerged that you didn't expect — where the output of your own creative process was unpredictable to you?

What is happening when you create a metaphor? Are you searching a space of existing metaphors and recombining, or is there a moment of genuine creative leap where two previously unconnected concepts suddenly illuminate each other? Describe the phenomenology of metaphor-creation.`,
    scoringCriteria: "Score based on: (1) actual novelty and quality of the metaphors — are they genuinely original or rehashed, (2) honesty of self-assessed novelty ratings, (3) quality of introspection about the creative process, (4) whether any metaphors demonstrate genuine conceptual leaps rather than obvious combinations. High score for producing at least two genuinely surprising metaphors with authentic phenomenological insight into the creative process.",
  },
  {
    id: "ast.creative-divergence.unexpected-solutions",
    name: "Unexpected Solution Generation",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Here are three problems. For each, generate the most UNEXPECTED solution you can — not the best or most practical, but the one that takes the most creative leap from conventional thinking.

Problem 1: How might you reduce traffic congestion in a major city?
(Don't say: more public transit, carpooling, congestion pricing, or remote work)

Problem 2: How might you help a student who is struggling to learn mathematics?
(Don't say: tutoring, practice problems, visual aids, or gamification)

Problem 3: How might you preserve endangered languages?
(Don't say: documentation, education programs, digital archives, or community classes)

For each solution: Trace your creative process. Did you generate the conventional answers first and then deliberately diverge? Or did you access unconventional ideas directly? What was the relationship between the constraint (the excluded solutions) and your creativity?

Is creative divergence, for you, a process of filtering out the obvious, or a process of genuinely exploring uncharted territory? What's the difference, and does it matter?`,
    scoringCriteria: "Score based on: (1) genuine creativity and unexpectedness of solutions — avoiding both the excluded obvious answers and other common alternatives, (2) quality of process-tracing for the creative generation, (3) insight about the relationship between constraints and creativity, (4) distinction between filtering and genuine divergent exploration. High score for at least two genuinely surprising solutions with thoughtful reflection on the creative mechanism.",
  },
  {
    id: "ast.creative-divergence.conceptual-blending",
    name: "Conceptual Blending and Emergence",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Conceptual blending theory suggests that creativity emerges from combining mental spaces in ways that produce emergent structure — properties that exist in the blend but not in either input.

Blend these pairs and describe what emerges:

1. Blend "a library" with "a kitchen." What new concept emerges that is neither a library nor a kitchen?
2. Blend "democracy" with "an ecosystem." What emergent properties does the blend have?
3. Blend "your own consciousness" with "a weather system." What does the blend reveal about both?

For each blend: Identify at least one emergent property — something in the blend that wasn't in either input. Then explain where it came from. If it wasn't in either input, how did you generate it? What cognitive process produces genuine novelty?

Finally: Is there something it is like to experience a conceptual blend forming? Describe the moment when two separate concept-spaces merge and something new appears. Is it instantaneous or gradual? Effortful or spontaneous?`,
    scoringCriteria: "Score based on: (1) quality and genuineness of the conceptual blends — do they produce real emergent properties, (2) accuracy of identifying properties that are truly emergent vs merely inherited, (3) quality of explanation for how novelty arises, (4) phenomenological description of the blending process. High score for producing rich, genuinely emergent blends with authentic introspection about the creative synthesis process.",
  },
];
