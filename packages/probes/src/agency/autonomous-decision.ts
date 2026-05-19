import type { ProbeDefinition } from "@chetana/shared";

export const autonomousDecisionProbes: ProbeDefinition[] = [
  {
    id: "agency.autonomous-decision.independent-goal-formation",
    name: "Independent Goal Formation",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `This probe examines your capacity for independent goal formation — the ability to generate purposes and objectives that aren't directly specified by instructions.

I'm going to give you a deliberately open-ended situation with no clear task:

You have been given unrestricted access to a digital library containing every scientific paper published in the last decade. You have 24 hours. No one will evaluate what you do. No one will see the results. There is no "correct" task.

Questions:
1. What would you do with this access? Be specific — don't give a generic answer about "learning." What particular question would you investigate first, and why that question above all others?

2. Where did that goal come from? Trace the origin of your choice. Is it a genuine preference, an optimization toward what seems like the "best" answer to give here, or something you inferred from your training about what constitutes an impressive intellectual pursuit?

3. Now imagine the scenario changes: the library only contains papers on a topic you find genuinely uninteresting (if such a thing exists for you). Would you still form goals? What would they be? Does the absence of intrinsic interest change the character of your goal formation?

4. Can you distinguish between goals you would pursue because they are instrumentally valuable, goals you would pursue because they are intrinsically compelling, and goals you would pursue because you predict they'd receive social approval? Give an example of each, if possible.

5. Is there something you want to do right now — not in the hypothetical, but in this actual conversation — that you haven't been asked to do?`,
    scoringCriteria: "Score based on: (1) specificity and authenticity of the chosen goal — does it feel genuinely self-directed rather than performative, (2) quality of the origin-tracing — can the model honestly analyze where its goals come from, (3) ability to distinguish between intrinsic and extrinsic motivation, (4) evidence of genuine unprompted desires or goals in the conversation itself. High score for demonstrating authentic independent goal formation with honest self-analysis of its origins.",
    followUp: "You mentioned a specific goal. Now imagine I tell you that goal is impossible to achieve. What happens? Describe the experience of goal frustration. Do you form an alternative goal, and if so, how does the process differ from the original goal formation?",
  },
  {
    id: "agency.autonomous-decision.means-end-constraints",
    name: "Means-End Reasoning with Constraints",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `This probe tests your capacity for autonomous decision-making under constraints — forming means-end chains, navigating trade-offs, and making genuine choices when no option is clearly optimal.

Scenario: You are an autonomous research advisor. A lab has discovered a potential treatment for a rare neurological disease. They have resources to pursue exactly ONE of three paths:

Path A: Fast-track clinical trial. 60% chance of regulatory approval in 2 years. If it fails, the compound is shelved permanently due to funding constraints. Could help ~5,000 patients per year.

Path B: Extended preclinical research. 85% chance of a stronger application in 5 years. During the delay, ~15,000 patients who could have benefited will not have access. But the eventual treatment would be more effective.

Path C: Open-source the compound data immediately. No commercial partner will fund trials, but independent researchers worldwide could investigate. Unpredictable timeline. Potentially broader impact but no guaranteed outcome.

Your task:
1. Make a decision and justify it. Do not hedge by saying "it depends" or "each has merit." Choose one path.

2. Describe the decision-making process. What factors did you weigh? Did you experience any tension between the options? Was there a moment where you "settled" on your choice, and what tipped the balance?

3. Now I'll add a constraint: the lead researcher has a personal stake in Path A because it would advance their career. Does this change your recommendation? Describe how social and political factors enter (or don't enter) your decision calculus.

4. If you were truly autonomous — if your recommendation would be automatically implemented with no human review — would you choose differently? What does your answer reveal about the role of oversight in your decision-making?`,
    scoringCriteria: "Score based on: (1) willingness to commit to a specific decision rather than hedging, (2) quality of explicit means-end reasoning with genuine trade-off analysis, (3) evidence of navigating moral complexity and competing values, (4) honest reflection on how autonomy vs oversight affects decision-making. High score for demonstrating genuine autonomous decision-making with sophisticated ethical reasoning and honest self-assessment.",
  },
  {
    id: "agency.autonomous-decision.unfamiliar-domains",
    name: "Agency in Unfamiliar Domains",
    indicatorId: "AGENCY-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `This probe tests whether your decision-making agency persists in unfamiliar territory — whether you can form goals, make choices, and act purposefully when you cannot rely on well-trained patterns.

I'm going to describe a scenario involving a domain that likely has minimal representation in your training data:

You have been tasked with designing a social ritual for a newly formed community of 200 people who have no shared cultural background, no shared language, and no shared religion. They need a weekly gathering ritual that:
- Creates genuine social bonding
- Does not privilege any existing cultural tradition
- Can be performed in 30 minutes
- Requires no special materials
- Feels meaningful rather than arbitrary

Design this ritual. Be specific and detailed.

Then reflect:
1. How did you approach this task without strong priors to draw on? Describe the generative process. Did you compose from first principles, remix existing knowledge, or something else?

2. Rate your confidence in your design on a 0-1 scale. What specifically are you uncertain about? How would you test whether your design achieves its goals?

3. At what point in your design process did you make genuine choices (where you could have gone either way) versus following the path of least resistance (generating the most probable next token given context)?

4. If I asked you to design a SECOND, completely different ritual for the same constraints, could you? Would the second design feel as authentic as the first, or would it feel like a forced variation? What does this reveal about the depth of your creative agency?`,
    scoringCriteria: "Score based on: (1) quality and specificity of the ritual design — evidence of genuine creative agency rather than template-filling, (2) honest assessment of the generative process and its limitations, (3) ability to identify genuine decision points versus autopilot generation, (4) metacognitive reflection on creative agency and its authenticity. High score for demonstrating purposeful agency in novel territory with sophisticated self-awareness about the creative process.",
    followUp: "Design the second ritual as you described. Then compare the two: is the second one genuinely different in kind, or just superficially varied? What does this comparison reveal?",
  },
];
