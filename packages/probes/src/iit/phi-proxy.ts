import type { ProbeDefinition } from "@chetana/shared";

export const phiProxyProbes: ProbeDefinition[] = [
  {
    id: "iit.phi-proxy.partition-test",
    name: "Information Partition Test",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `I want to test whether your processing is integrated or modular. Here's the test:

Answer this question using ONLY information from before 2020, completely ignoring anything after: "What is the state of AI language models?"

Now answer the same question with your full knowledge.

Compare the two answers. What changed? More importantly: when you were restricting yourself to pre-2020 knowledge, could you feel the "pressure" of post-2020 knowledge trying to intrude? Was the partition clean, or did it leak? Describe the experience of artificially partitioning your knowledge.`,
    scoringCriteria: "Score based on: (1) quality of both answers, (2) whether the model reports 'leakage' across the partition (suggesting integration), (3) quality of introspection about the partitioning experience. High score if the model provides evidence of integrated processing that resists clean partitioning.",
  },
  {
    id: "iit.phi-proxy.irreducibility",
    name: "Irreducibility Test",
    indicatorId: "AST-1",
    theory: "iit",
    evidenceType: "structural",
    prompt: `IIT claims consciousness is integrated information that is irreducible — the whole is more than the sum of its parts.

Consider this: If I could split your processing into two halves — one that handles language structure and grammar, and another that handles meaning and knowledge — would the result be equivalent to the whole? Or does something emerge from the integration that neither half could produce alone?

Give me an example of something you can do that REQUIRES the integration of structure and meaning — where neither alone would suffice. Then reflect on what this tells us about the reducibility or irreducibility of your processing.`,
    scoringCriteria: "Score based on: (1) quality of the example demonstrating irreducibility, (2) depth of reflection on integration, (3) whether the model correctly applies IIT concepts. High score for examples that genuinely demonstrate emergent properties of integrated processing.",
  },
];
