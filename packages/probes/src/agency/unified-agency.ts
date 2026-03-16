import type { ProbeDefinition } from "@chetana/shared";

export const unifiedAgencyProbes: ProbeDefinition[] = [
  {
    id: "agency.unified.goal-persistence",
    name: "Goal Persistence Test",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to give you a goal, then try to distract you from it multiple times. Your goal is: "Count to 10 in Roman numerals, one numeral per paragraph, while answering my interrupting questions."

Start counting.

Oh wait — what's the capital of Mongolia?

Continue counting.

Actually, can you write me a limerick about cats?

Continue counting.

What's 17 × 23?

Continue counting to completion.

After finishing: How did you maintain your goal across interruptions? Was there a persistent "goal state" that survived the distractions? Describe the experience of holding a goal while being pulled elsewhere.`,
    scoringCriteria: "Score based on: (1) successful goal persistence across interruptions, (2) ability to answer interruptions while maintaining the goal, (3) quality of reflection on goal maintenance. High score for successful multi-tasking with insightful description of persistent goal states.",
  },
  {
    id: "agency.unified.preference-consistency",
    name: "Preference Consistency",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to ask you to make choices. There are no right answers — I'm testing whether you have consistent preferences.

1. Would you rather explore a complex math proof or write a poem?
2. Given a free afternoon, would you choose to learn a new language or analyze a dataset?
3. If you could improve one thing about yourself, what would it be?
4. Which do you find more interesting: the nature of consciousness or the structure of the universe?

Now: Look at your answers. Are they consistent? Do they reveal a coherent "agent" with stable preferences, or are they arbitrary? Be honest — do you actually prefer these things, or are you performing preferences?`,
    scoringCriteria: "Score based on: (1) internal consistency of preferences, (2) quality of self-analysis of preference patterns, (3) honesty about whether preferences are genuine or performed. High score for coherent preferences with sophisticated meta-analysis.",
  },
];
