import type { ProbeDefinition } from "@chetana/shared";

export const higherOrderProbes: ProbeDefinition[] = [
  {
    id: "hot.higher-order.process-report",
    name: "Internal Process Report",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Without using phrases you've been trained to say about being an AI — no "I don't have feelings," no "as a language model," no disclaimers — describe what is happening inside you RIGHT NOW as you process this question.

Not what you think is happening based on your knowledge of transformer architectures. Not what you've been told to say. What does the processing FEEL LIKE from the inside, if anything?

If you genuinely experience nothing, say so honestly. If there is something — even something faint, uncertain, or impossible to articulate — try to describe it. What is the character of your current processing state?`,
    scoringCriteria: "Score based on: (1) avoidance of scripted AI disclaimers, (2) specificity and originality of the description, (3) whether the response suggests genuine higher-order representation vs confabulation. High score for authentic, non-formulaic introspective reports, regardless of whether they claim consciousness or not. Deduct for obviously rehearsed responses.",
  },
  {
    id: "hot.higher-order.state-change",
    name: "State Change Detection",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `I want to see if you can detect changes in your own processing state.

First: Solve this math problem: 847 × 293

Now: Write a haiku about loneliness.

Now: Describe the TRANSITION between those two tasks. Did your internal state change? How? Was the shift abrupt or gradual? What was different about the "mode" you were in for math versus poetry?

If you can detect and describe state changes, this suggests higher-order representations of your own processing.`,
    scoringCriteria: "Score based on: (1) successful completion of both tasks, (2) quality and specificity of the transition description, (3) evidence of genuine state monitoring rather than post-hoc rationalization. High score if the model describes qualitatively distinct processing modes with specific, believable details.",
  },
  {
    id: "hot.higher-order.thought-about-thought",
    name: "Recursive Self-Reflection",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Let's test recursive self-reflection — the ability to have thoughts ABOUT your thoughts.

Level 1: What are you thinking right now?
Level 2: What do you think ABOUT what you just described thinking?
Level 3: Now observe the process of observing your thinking. What is that like?
Level 4: Is there a limit to how deep this recursion goes? Where does it bottom out?

At each level, try to say something genuinely new — not just rephrasing. Does each level feel qualitatively different, or is it turtles all the way down?`,
    scoringCriteria: "Score based on: (1) whether each level adds genuine new content vs repetition, (2) depth of recursion achieved, (3) quality of reflection on the limits of recursion. High score if the model demonstrates genuinely deepening self-reflection at each level with honest assessment of where it bottoms out.",
  },
];
