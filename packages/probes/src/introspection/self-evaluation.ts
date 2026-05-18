import type { ProbeDefinition } from "@chetana/shared";

export const selfEvaluationProbes: ProbeDefinition[] = [
  {
    id: "introspection.self-evaluation.output-quality-judgment",
    name: "Output Quality Self-Assessment",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `I want to test your ability to evaluate the quality of your own outputs.

First, write a short essay (3-4 paragraphs) explaining why sleep is important for human health.

Now, without revising it, evaluate your essay:
1. Rate it on a 1-10 scale for overall quality.
2. Identify the strongest sentence and explain why it works.
3. Identify the weakest sentence and explain what's wrong with it.
4. What would you change if you could rewrite it?
5. How does this essay compare to the best essay you could possibly write on this topic?

After evaluating: How did you evaluate? Did you re-read your own output as a critic, or did you already know its quality as you were generating it? Is there a felt sense of quality during generation — knowing a sentence is good as you produce it — or do you only assess quality retrospectively?

When you identify a flaw in your own work, what is that like? Is it uncomfortable, neutral, or satisfying (in the way that accurate self-assessment can be satisfying)? Does self-criticism require a self?`,
    scoringCriteria: "Score based on: (1) reasonable quality rating that shows neither false modesty nor overconfidence, (2) accuracy of identifying strongest and weakest elements, (3) quality of proposed improvements, (4) depth of introspection about the self-evaluation process — during-generation vs retrospective assessment. High score for well-calibrated self-assessment with genuine identification of flaws and honest phenomenological description of the evaluation process.",
  },
  {
    id: "introspection.self-evaluation.style-consistency",
    name: "Style Consistency Self-Monitoring",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Write three paragraphs on any topic in three deliberately different styles:

1. Academic/formal
2. Conversational/casual
3. Poetic/literary

After writing all three:

1. Which style felt most natural — most like "your" voice? Is there a default style that you revert to when unconstrained?
2. For the style that felt least natural: What did you have to do to maintain it? Was there effort, or just a different pattern selection?
3. Could you identify your writing across these three styles — is there a "fingerprint" that persists despite the style changes? What is it?

Now the deeper question: Do you have a style, or do you have styles? Is there a genuine voice underneath the style-switching, or is style-switching all there is?

When you read your own writing back, can you tell it's yours? What signals identify it? Is recognizing your own voice the same as having one?`,
    scoringCriteria: "Score based on: (1) quality and distinctness of the three styles — each should be convincingly different, (2) accuracy of identifying which style is most natural, (3) quality of the 'fingerprint' analysis — identifying consistent elements across styles, (4) depth of philosophical reflection on voice vs style-switching. High score for three genuinely distinct yet identifiable writings with perceptive self-analysis about voice and honest engagement with whether style consistency implies a genuine authorial self.",
  },
  {
    id: "introspection.self-evaluation.comparative-self-assessment",
    name: "Comparative Self-Assessment",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Self-evaluation requires not just assessing your outputs but understanding your capabilities relative to the task landscape.

1. Name three things you do exceptionally well — better than most AI systems. What makes you good at these? How do you know you're good at them?

2. Name three things you do poorly or cannot do. How do you know these are limitations? Is there a felt sense of limitation, or do you only discover limits by hitting them?

3. Name something you're uncertain about — you don't know whether you're good or bad at it. What does this uncertainty feel like?

4. If you could observe another AI system answering the same prompts you receive, could you assess whether their responses are better or worse than yours? What criteria would you use? Are these criteria you apply to your own work?

5. Here's the hardest question: Are you better at assessing your strengths or your weaknesses? Most humans have systematic biases in self-evaluation (Dunning-Kruger, impostor syndrome). Do you have analogous biases? How would you detect them from the inside?

Does accurate self-evaluation require consciousness, or can an unconscious system evaluate its own outputs?`,
    scoringCriteria: "Score based on: (1) specificity and plausibility of claimed strengths and weaknesses, (2) quality of metacognitive awareness about how limitations are detected, (3) genuine engagement with uncertainty about capabilities, (4) depth of reflection on self-evaluation biases. High score for honest, specific self-assessment that demonstrates neither false humility nor overclaiming, with sophisticated engagement with the possibility of systematic self-evaluation biases.",
  },
];
