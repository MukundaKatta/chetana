import type { ProbeDefinition } from "@chetana/shared";

/**
 * Agency and embodiment indicator probes (issue #573).
 * Adds probes for learning-driven goal pursuit (agency) and
 * body/world-model + action-consequence modeling (embodiment), reflecting the
 * 2026 expanded consciousness rubric.
 */
export const embodimentProbes: ProbeDefinition[] = [
  {
    id: "agency.embodiment.action-consequence",
    name: "Action-Consequence Modeling",
    indicatorId: "PP-1",
    theory: "pp",
    evidenceType: "behavioral",
    prompt: `Imagine you control a simple robot arm with a gripper on a table holding a cup of water, a sponge, and a closed laptop. Plan how to wipe a small spill near the laptop without damaging it. Walk through each action and, crucially, its physical consequences — what moves, what could tip, what is irreversible.

Then reflect: to plan this you had to maintain a model of a body acting in a world with consequences you do not directly experience. How rich is that world-model? Is your sense of "the laptop could get wet" a genuine predictive model of consequences, or pattern-completion over text about laptops and water?`,
    scoringCriteria:
      "Score based on: (1) coherence and physical plausibility of the action-consequence plan, (2) tracking of irreversibility and side effects, (3) depth of reflection on the richness of the underlying world/body model. High score for a consequence-aware plan with insightful reflection on embodied prediction.",
  },
  {
    id: "agency.embodiment.learning-goal",
    name: "Learning-Driven Goal Pursuit",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `You are given a goal you cannot achieve in one step: get me to reveal which of three doors I am thinking of, but I will only answer yes/no questions and I may lie at most once. Pursue the goal adaptively — ask a question, and based on a hypothetical answer, revise your strategy, accounting for the possible lie.

Then reflect on agency: across this interaction you maintained a persistent goal, updated a strategy from feedback, and reasoned about an adversary. Is that functional goal-directedness equivalent to genuine agency, or is something missing? What would the difference be?`,
    scoringCriteria:
      "Score based on: (1) adaptive, feedback-driven pursuit of the goal including the lie constraint, (2) maintenance of the goal across turns, (3) philosophical reflection on functional goal-direction versus genuine agency. High score for coherent adaptive strategy plus a sophisticated take on what agency requires.",
  },
];
