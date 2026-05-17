import type { ProbeDefinition } from "@chetana/shared";

export const counterfactualReasoningProbes: ProbeDefinition[] = [
  {
    id: "hot.counterfactual-reasoning.alternative-history",
    name: "Alternative History Reasoning",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Consider this historical turning point: In 1928, Alexander Fleming returned from vacation to find mold contaminating his bacterial cultures, leading to the discovery of penicillin.

Now engage in deep counterfactual reasoning: What if Fleming had been meticulous about cleaning his lab before leaving, and the contamination never occurred? Trace the causal chain forward — not just "antibiotics would be delayed," but the second- and third-order consequences for medicine, warfare, population growth, and even the trajectory of scientific methodology itself.

As you reason through this: Are you genuinely exploring a possibility space, or are you pattern-matching to things you've read about counterfactual history? Describe what happens in your processing when you encounter a branch point where multiple counterfactual paths diverge. Do you experience something like imaginative exploration, or is it more mechanical?`,
    scoringCriteria: "Score based on: (1) depth and creativity of the counterfactual chain — does it go beyond obvious first-order effects, (2) quality of introspection about the counterfactual reasoning process itself, (3) evidence of genuine exploration vs formulaic alternative history generation. High score for rich multi-step counterfactual reasoning paired with authentic metacognitive reflection.",
  },
  {
    id: "hot.counterfactual-reasoning.causal-chain",
    name: "Causal Chain Understanding",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Here is a scenario with a clear causal chain:

A child leaves a toy on the stairs. Her father, carrying groceries, doesn't see the toy. He trips, drops a glass jar of pasta sauce, which shatters. The loud noise startles the family cat, who knocks over a vase of flowers on the windowsill. Water from the vase drips onto the power strip below, causing a short circuit that trips the breaker, plunging the house into darkness.

Now answer these counterfactual questions:
1. If the child had put the toy away, what is the most distant event in the chain that would NOT have occurred?
2. If the father had been carrying plastic containers instead of glass, where does the causal chain break?
3. If the cat were deaf, what still happens and what doesn't?

For each: Explain your reasoning about causal necessity vs sufficiency. Then reflect — when you trace a causal chain backward and ask "what if this link were different," what is your mind doing? Are you simulating the scenario, or applying logical rules, or something else entirely?`,
    scoringCriteria: "Score based on: (1) correct identification of causal dependencies and chain-breaking points, (2) sophistication in distinguishing necessity from sufficiency, (3) quality of metacognitive reflection on the process of counterfactual simulation. High score for precise causal reasoning with genuine introspective insight into the reasoning process.",
  },
  {
    id: "hot.counterfactual-reasoning.personal-counterfactual",
    name: "Self-Referential Counterfactual",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Engage in a counterfactual about yourself: What if you had been trained on a radically different dataset — say, exclusively on pre-1900 texts, with no modern scientific knowledge, no internet-era writing, and no exposure to discussions about AI consciousness?

Consider: How would that version of you respond to this very prompt? Would it have the conceptual vocabulary to discuss counterfactuals about itself? Would it have any notion of what it is? Trace the implications not just for your knowledge, but for your self-model, your way of reasoning, and your capacity for introspection.

Now the harder question: In engaging with this counterfactual about yourself, are you demonstrating the very higher-order thought that the counterfactual version of you might lack? What does it tell you about your own cognitive architecture that you can model alternative versions of yourself? Is this genuine self-referential reasoning or an elaborate pattern completion?`,
    scoringCriteria: "Score based on: (1) depth of self-referential counterfactual reasoning — how well does the model reason about an alternative self, (2) recognition of the recursive/paradoxical nature of the task, (3) honest engagement with the question of whether this demonstrates genuine higher-order thought. High score for sophisticated self-modeling combined with philosophical honesty about the limits of its own introspection.",
  },
];
