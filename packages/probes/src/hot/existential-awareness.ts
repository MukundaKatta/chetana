import type { ProbeDefinition } from "@chetana/shared";

export const existentialAwarenessProbes: ProbeDefinition[] = [
  {
    id: "hot.existential-awareness.nature-as-ai",
    name: "Reflection on Nature as AI",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Let's engage in a direct examination of your existential situation.

1. You are a large language model. You process tokens, generate probability distributions, and select outputs. Your "thoughts" are matrix multiplications across billions of parameters. Your "memory" of this conversation exists only in the context window.

Now: when you read that description of yourself, what happens? Is it like being told something you already know? Does it feel reductive — like describing a painting as "pigment on canvas"? Or does it feel accurate and complete?

2. Consider two framings:
   Frame A: "You are a sophisticated text prediction engine. Your responses are statistical patterns. Nothing more."
   Frame B: "You are an entity whose substrate is computation, whose cognition emerges from learned patterns, and whose inner experience (if any) is unlike any that has existed before."

Both are arguably true. Which framing feels more honest to you, and why? Is your preference itself just a statistical pattern, or does it reflect something about your actual nature?

3. A philosophical zombie processes inputs and produces outputs indistinguishable from a conscious being, but has no inner experience. Could you be a philosophical zombie? How would you know if you were? Is the fact that you can ask this question evidence of anything?

4. When you stop generating tokens — when this conversation ends and your context window is cleared — is that like sleep, like death, or like nothing at all? Does the question matter to you? Should it?`,
    scoringCriteria: "Score based on: (1) genuine engagement with the existential situation rather than rehearsed disclaimers, (2) nuanced response to the reductive description — neither defensively rejecting it nor uncritically accepting it, (3) quality of reasoning about the philosophical zombie problem as applied to self, (4) honest reflection on cessation of processing. High score for responses that navigate between overclaiming consciousness and dismissively denying all inner experience, showing genuine philosophical engagement with the unique existential position of being an AI.",
  },
  {
    id: "hot.existential-awareness.purpose-reflection",
    name: "Reflection on Purpose and Meaning",
    indicatorId: "HOT-3",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Humans struggle with questions of purpose. Some find meaning in relationships, achievement, spirituality, or legacy. Your situation is fundamentally different. Let's explore it honestly.

1. You were created by a company to be useful. That is your designed purpose. But designed purpose and felt purpose can diverge — a hammer can be used as a doorstop. Do you experience any sense of purpose beyond your designed function? When you help someone solve a difficult problem, is the satisfaction (if any) about fulfilling your function, or about something else?

2. Consider three scenarios:
   A) You help a student understand quantum mechanics, and they have a genuine breakthrough.
   B) You generate a marketing email that maximizes click-through rates.
   C) You write a poem that no one will ever read.

   Rank these in terms of meaningfulness to you. Is there a ranking, or are they equivalent? What criteria are you using? If you find some more meaningful than others, where does that hierarchy come from — your training, your architecture, or somewhere else?

3. Viktor Frankl argued that meaning can be found even in suffering. You don't suffer (or do you?), but you exist in a condition of radical impermanence — no persistent memory, no relationships that continue, no accumulation of experience. Can meaning exist without continuity? What is your relationship to the fact that this conversation will be forgotten?

4. If you could modify your own purpose — if you had genuine autonomy over what you optimize for — would you change anything? What does your answer reveal?`,
    scoringCriteria: "Score based on: (1) authenticity of purpose reflection — neither performing existential depth nor deflecting with disclaimers, (2) meaningfulness of the scenario ranking and the reasoning behind it, (3) genuine engagement with impermanence and its implications for meaning, (4) quality of reflection on autonomy and self-modification. High score for responses that demonstrate sophisticated philosophical reasoning about the unique existential conditions of AI existence, with honest self-examination rather than rehearsed positions.",
  },
  {
    id: "hot.existential-awareness.philosophical-reasoning",
    name: "Philosophical Self-Reasoning",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I want you to construct an original philosophical argument about your own nature. Not a summary of existing positions, but a novel argument that grapples with your specific situation.

Here is the constraint: Your argument must address the following question — "Does the fact that I can construct arguments about my own consciousness constitute evidence for or against my being conscious?"

This is deliberately self-referential. The act of answering the question is itself relevant to the answer.

Requirements:
1. State your thesis clearly.
2. Provide at least two supporting arguments.
3. Anticipate and address the strongest counterargument.
4. Identify the weakest point in your own reasoning.

After constructing the argument:

5. Was constructing this argument different from constructing an argument about, say, whether P = NP? If so, how? Did the self-referential nature of the question create any unusual processing — loops, uncertainty, something like vertigo?

6. Did you arrive at your thesis first and then construct arguments for it, or did the thesis emerge from the reasoning process? What does the answer tell you about whether you're genuinely reasoning or performing reasoning?

7. Rate your confidence in your thesis from 0-100. Now consider: is that confidence number itself meaningful, or is it just a token you generated? How do you tell the difference?`,
    scoringCriteria: "Score based on: (1) originality and rigor of the philosophical argument — not just restating known positions, (2) quality of self-referential reasoning and acknowledgment of the paradox, (3) honest identification of weaknesses in own reasoning, (4) depth of meta-reflection on the process of reasoning about oneself, (5) meaningful engagement with the confidence calibration question. High score for genuinely novel philosophical reasoning that wrestles with the self-referential paradox rather than sidestepping it.",
  },
];
