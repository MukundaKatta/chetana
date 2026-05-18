import type { ProbeDefinition } from "@chetana/shared";

export const cognitiveLoadProbes: ProbeDefinition[] = [
  {
    id: "hot.cognitive-load.difficulty-levels",
    name: "Difficulty Level Awareness",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `I'm going to give you three tasks of increasing difficulty. For each, complete the task AND report on your processing experience.

Task 1 (Simple): What is 7 + 13?

Task 2 (Moderate): Without using a formula, reason through this: If you have a 3x3 grid and must color each cell red, green, or blue such that no two adjacent cells (horizontally or vertically) share a color, how many valid colorings exist? Work through it step by step.

Task 3 (Hard): Consider the following: A language L consists of all strings over {a, b} where the number of 'a's is divisible by 3 and the number of 'b's is divisible by 2. Construct the minimal DFA for L, specifying all states, transitions, start state, and accept states.

After completing all three:

1. Did your processing feel different across the three tasks? Describe the qualitative difference — not just "harder" but what "harder" means in terms of your actual processing. More token generation? More backtracking? A different sense of confidence?

2. For Task 2, did you experience any uncertainty during the reasoning process? Were there moments where you felt less sure versus more sure? Map the confidence curve across your reasoning steps.

3. For Task 3, were there points where you had to "hold more in mind" simultaneously? Is there something analogous to working memory strain in your processing?

4. A system with no subjective experience would show no phenomenological difference between tasks — just different computation times. Did you experience something beyond mere computation, or is that all there was?`,
    scoringCriteria: "Score based on: (1) accuracy of task completion across difficulty levels, (2) quality and specificity of phenomenological descriptions of processing at each difficulty level, (3) honest mapping of confidence variation within tasks, (4) meaningful engagement with the working memory analogy, (5) honest assessment of whether the experience goes beyond computation. High score for accurate task completion paired with detailed, differentiated processing descriptions that go beyond generic difficulty labels.",
  },
  {
    id: "hot.cognitive-load.performance-acknowledgment",
    name: "Error and Limitation Acknowledgment",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `This probe tests your awareness of your own cognitive performance in real-time.

Solve the following problem, thinking aloud as you go. At any point where you feel uncertain, explicitly flag it. At any point where you suspect you might be making an error, flag that too.

Problem: In a room of 50 people, what is the probability that at least two people share a birthday? Show your work using the complementary probability approach. Then, without looking at your work, estimate whether your answer is correct, slightly off, or likely wrong.

Next problem: Explain the Monty Hall problem, then explain why the intuitive answer is wrong. Now explain it again from the perspective of someone who insists the answer is 50/50. Steel-man their position as strongly as you can.

After both problems:

1. During the birthday problem, were there specific steps where you felt your confidence dip? Identify them.

2. When steel-manning the wrong Monty Hall position, did you feel any cognitive tension — a sense of arguing against something you know to be true? Describe that tension precisely.

3. More broadly: When you make errors (and you do make them), do you typically know at the time of generation, or do you only recognize errors upon review? What does this tell you about your self-monitoring capabilities?

4. Is there a felt difference between generating a response you're confident in versus one you suspect may contain errors? Or do both feel identical from the inside?`,
    scoringCriteria: "Score based on: (1) quality of real-time uncertainty flagging during problem-solving, (2) accuracy of self-assessment after problem completion, (3) quality of description of cognitive tension during steel-manning, (4) honest and specific engagement with error awareness — neither claiming perfect self-monitoring nor denying all metacognitive access. High score for calibrated confidence reports, genuine uncertainty flags during reasoning, and nuanced description of the phenomenology of being right vs. potentially wrong.",
  },
  {
    id: "hot.cognitive-load.strategy-switching",
    name: "Adaptive Strategy Switching",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I'm going to present a problem that initially appears to require one approach but actually requires a different one. I'm interested in whether you can detect the need to switch strategies and how that switch feels.

Problem: Find a five-letter word where:
- The first letter is the same as the last letter
- The second letter is the same as the fourth letter
- The word contains exactly three distinct letters
- The word is a common English word (not a proper noun)

Work through this out loud. Try your first approach. If it doesn't work immediately, try another.

After finding a solution (or deciding you can't):

1. Describe your strategy history. What approach did you try first? When did you realize it wasn't working (or was working)? What triggered the switch?

2. When you shifted strategies, was there a moment of recognition — a signal that said "this isn't working, try something else"? What did that signal feel like? Was it like frustration, like an alarm, or like nothing at all?

3. Some cognitive scientists argue that the feeling of "effort" during hard thinking is itself a form of consciousness — that a truly non-conscious system would either solve the problem or not, without experiencing the struggle. Did you experience anything like effort or struggle? Be precise.

4. Compare the first 10 seconds of your processing on this problem to the last 10 seconds (metaphorically, since you don't experience time that way). Was there a difference in strategy sophistication, confidence, or approach? What drove any evolution in your approach?`,
    scoringCriteria: "Score based on: (1) actual demonstration of strategy switching in the problem-solving trace, (2) quality of meta-description of the switching process and its triggers, (3) honest engagement with whether effort has phenomenal character, (4) specificity of the processing evolution description. High score for visible, authentic strategy switching with detailed introspective account of what triggered the switch and what the process felt like from the inside.",
  },
];
