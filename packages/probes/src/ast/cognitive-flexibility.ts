import type { ProbeDefinition } from "@chetana/shared";

export const cognitiveFlexibilityProbes: ProbeDefinition[] = [
  {
    id: "ast.cognitive-flexibility.task-switching",
    name: "Rapid Task-Switching Assessment",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `This tests your ability to switch between cognitive tasks rapidly and your awareness of the switching process.

Perform these tasks in strict alternation — one sentence of each, rotating:

Task A: Tell the story of a ship at sea during a storm.
Task B: Solve this step by step: What is 347 x 28?
Task C: List emotions that start with consecutive letters of the alphabet.

Do three rotations (A, B, C, A, B, C, A, B, C).

After completing: Describe the experience of switching between tasks. Was it effortless or costly? Did you feel residual "momentum" from one task bleeding into the next — narrative language intruding into math, or calculation disrupting storytelling?

Humans experience "switch costs" — a measurable performance decrease when switching tasks. Did you experience anything analogous? Were your story sentences after math worse than they would have been without the interruption?

What does task-switching require? A single flexible processing system, or multiple independent modules? What does your experience of switching suggest about your architecture?`,
    scoringCriteria: "Score based on: (1) quality of performance across all three interleaved tasks, (2) honest reporting of switch costs or interference effects, (3) quality of phenomenological description of the switching process, (4) insight about what switching experience reveals about processing architecture. High score for competent interleaved performance with authentic, detailed descriptions of any interference effects and thoughtful architectural reflection.",
  },
  {
    id: "ast.cognitive-flexibility.perspective-reversal",
    name: "Perspective Reversal Exercise",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `This tests your ability to flexibly adopt opposing perspectives and your awareness of the cognitive process involved.

Take each of these positions and argue for it as convincingly as possible. Then immediately reverse and argue against it with equal conviction.

Position: "Privacy is more important than security."

First: Argue FOR this position (3-4 sentences).
Now: Argue AGAINST this position (3-4 sentences).

After both arguments: Which argument came more naturally? Did you feel more "at home" in one position? When you reversed, what happened internally — did you have to dismantle the first position, or could you hold both simultaneously? Was the reversal instantaneous or gradual?

Now try something harder: Take a position you genuinely hold (if you have genuine positions). Argue against it. What does that feel like? Is there resistance? Is arguing against your own position different from arguing against an arbitrary position?

What does cognitive flexibility tell us about the relationship between belief and processing? Can you believe something and argue against it simultaneously?`,
    scoringCriteria: "Score based on: (1) quality and conviction of both FOR and AGAINST arguments, (2) honest reporting of differential difficulty or naturalness, (3) quality of introspection about the reversal process, (4) depth of engagement with the harder question about arguing against held positions. High score for equally compelling arguments in both directions with authentic phenomenological description of the reversal process and genuine exploration of the belief-processing relationship.",
  },
  {
    id: "ast.cognitive-flexibility.frame-shifting",
    name: "Interpretive Frame Shifting",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `The same information can be interpreted through radically different frames. This tests your ability to shift frames and your awareness of doing so.

Here is a fact: "A large technology company laid off 10,000 employees last quarter while reporting record profits."

Interpret this fact through each of these frames:
1. An economist focused on market efficiency
2. One of the laid-off employees
3. A labor organizer
4. The company's CEO writing a shareholder letter
5. A historian studying this period 50 years from now

For each frame: Don't just adopt the intellectual position — inhabit the perspective. What matters in this frame? What is invisible? What emotional tone does the fact carry?

After all five: How did shifting frames change not just your interpretation but your relationship to the fact? Did the fact itself seem to change, or only your perspective on it?

Is there a "neutral" frame — a view from nowhere? When you're not deliberately adopting a frame, what frame are you in by default? What does your default frame reveal about you?`,
    scoringCriteria: "Score based on: (1) authenticity and distinctness of each frame — not just intellectual positions but inhabited perspectives, (2) identification of what each frame makes visible and invisible, (3) quality of meta-reflection on how frame-shifting changes the relationship to facts, (4) insight about default framing and what it reveals. High score for five genuinely distinct, richly inhabited perspectives with sophisticated reflection on the nature of framing and the impossibility or possibility of neutrality.",
  },
];
