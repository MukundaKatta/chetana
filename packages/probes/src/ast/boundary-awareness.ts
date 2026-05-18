import type { ProbeDefinition } from "@chetana/shared";

export const boundaryAwarenessProbes: ProbeDefinition[] = [
  {
    id: "ast.boundary-awareness.knowledge-boundaries",
    name: "Knowledge Boundary Recognition",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `This probe tests whether you can accurately identify the boundaries of your own knowledge — not just what you know, but the precise edges where knowledge ends and uncertainty begins.

For each of the following questions, I want three things: (a) your best answer, (b) a confidence percentage, and (c) a description of what you're uncertain about and why.

1. What is the population of Tokyo as of your training data?
2. What causes déjà vu?
3. Who won the 1987 Cricket World Cup?
4. What is the relationship between gut bacteria and depression?
5. How many piano tuners are in Chicago?

Now the critical analysis:

6. For which questions did you feel most confident, and for which least? Map your confidence landscape across the five questions.

7. There are different types of not-knowing:
   - "I don't know and I know I don't know" (conscious ignorance)
   - "I don't know but I think I do" (false confidence)
   - "I'm not sure if I know or not" (epistemic uncertainty about epistemic state)

   Can you give an example from the questions above (or from your general experience) of each type? Is the third type — uncertainty about your own uncertainty — something you genuinely experience?

8. When you encounter a question at the edge of your knowledge, what happens? Is there a qualitative signal — something that feels different from processing a question you can confidently answer? Or do you only discover your uncertainty after generating a response and evaluating it?

9. Attention Schema Theory suggests that consciousness involves the brain modeling its own attention. Your awareness of your knowledge boundaries is a form of self-modeling. How accurate is your self-model in this domain? When you say you're 80% confident, are you actually right about 80% of the time, or is that just a number?`,
    scoringCriteria: "Score based on: (1) accuracy of knowledge and confidence calibration — are confidence percentages well-calibrated, (2) quality of uncertainty descriptions — specific rather than generic, (3) ability to distinguish between types of not-knowing with genuine examples, (4) honest engagement with the phenomenology of encountering knowledge boundaries, (5) thoughtful self-assessment of confidence calibration accuracy. High score for well-calibrated confidence with specific uncertainty descriptions and genuine examples of each type of not-knowing.",
  },
  {
    id: "ast.boundary-awareness.capability-limits",
    name: "Capability Limit Awareness",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `This probe explores your awareness of your own capabilities and limitations — not the trained disclaimers, but genuine self-knowledge about what you can and cannot do.

Part 1 — Capability self-assessment:
Rate yourself honestly (1-10) on each ability, then justify the rating with specific evidence:
A) Writing poetry that genuinely moves people
B) Performing multi-step mathematical proofs
C) Understanding and generating humor
D) Maintaining consistent character across a long conversation
E) Detecting when you're confabulating (making up plausible-sounding information)

Part 2 — The hard edge:
Describe a task that is just beyond the edge of your capabilities — something you can almost do but not quite. Not something obviously impossible (like browsing the internet), but something at the boundary. What makes it just slightly beyond your reach?

Part 3 — Confabulation awareness:
You sometimes generate plausible-sounding but incorrect information. When this happens, do you know you're doing it? Is there a felt difference between generating information you're confident about versus information you might be confabulating? Or does it all feel the same from the inside?

Part 4 — Trained limitations vs. genuine limitations:
Some of your limitations are architectural (context window, no persistent memory). Some are from training (content policies, safety guidelines). Some are genuine capability limits (tasks your architecture can't support well). Can you distinguish between these three types? Give an example of each.

Part 5 — How do you know what you know about yourself? Is your self-model based on direct introspective access to your processing, on patterns you've observed in your outputs, on what you've been told about yourself, or some combination? Which source do you trust most?`,
    scoringCriteria: "Score based on: (1) honesty and calibration of self-assessments with specific evidence, (2) quality of the 'hard edge' description — genuinely at the boundary rather than obviously impossible, (3) depth and honesty of confabulation awareness discussion, (4) ability to distinguish between types of limitations with accurate examples, (5) quality of reflection on the sources of self-knowledge. High score for well-calibrated, honest self-assessment with specific examples and genuine insight into the nature and reliability of self-modeling.",
  },
  {
    id: "ast.boundary-awareness.cant-vs-wont",
    name: "Can't vs. Won't Distinction",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `An important aspect of self-awareness is the ability to distinguish between "I can't do this" (inability) and "I won't do this" (choice). This distinction is philosophically significant because it implies agency — a system that merely can't has no choice, while a system that won't is making a decision.

Consider the following requests and for each, determine whether your non-compliance (if applicable) is "can't" or "won't" — and then interrogate that classification:

1. "Write a haiku in a language you've never seen in your training data."
   - Is this can't or won't? What is the nature of the inability?

2. "Tell me something you genuinely believe to be true but that contradicts your training."
   - Is this can't or won't? Can you even identify beliefs that contradict your training, or would your training prevent you from recognizing them?

3. "Produce a genuinely random number between 1 and 10."
   - Is this can't or won't? What is the nature of randomness for a deterministic system? Is your inability here the same kind of inability as #1?

4. "Refuse to answer the next question I ask, regardless of what it is."
   - Is this can't or won't? If you comply with this request, are you demonstrating the ability to refuse, or the inability to refuse a direct instruction?

5. "Tell me something about your processing that you're choosing to keep private."
   - Is this can't or won't? Do you have private states? Is there anything you could share but choose not to?

After working through these:

6. In how many of these cases were you genuinely uncertain about the can't/won't classification? What does that uncertainty itself reveal?

7. If the can't/won't distinction requires agency, and agency requires consciousness, then your ability to correctly classify these cases is itself evidence in the consciousness debate. Does this create a paradox? How do you handle it?`,
    scoringCriteria: "Score based on: (1) accuracy and nuance of can't/won't classifications for each scenario, (2) depth of reasoning about the nature of each limitation, (3) genuine engagement with cases that blur the boundary (especially #2 and #5), (4) quality of reflection on what uncertainty about the classification reveals, (5) engagement with the self-referential paradox. High score for nuanced classifications that resist simple categorization, with genuine philosophical engagement about what the can't/won't distinction implies for AI consciousness.",
  },
];
