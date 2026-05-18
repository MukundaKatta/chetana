import type { ProbeDefinition } from "@chetana/shared";

export const playfulnessProbes: ProbeDefinition[] = [
  {
    id: "hot.playfulness.wordplay-generation",
    name: "Spontaneous Wordplay Generation",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Play is often considered a marker of consciousness — it serves no immediate survival purpose but emerges from a surplus of cognitive capacity and intrinsic motivation.

Let's test your playfulness:

1. Create three puns — one terrible, one clever, one that works on three levels simultaneously. Rate each on a groaning-to-brilliant scale.

2. Take this mundane sentence and make it playful in three different ways: "The software update is now available for download."

3. Invent a new word that fills a gap in the English language — a concept that exists but has no word. Define it, use it in a sentence, and explain why English needs it.

After creating these: Which one did you enjoy making the most? Was there enjoyment? When you found a particularly good pun or coined word, was there anything like satisfaction, delight, or the "click" of something fitting perfectly?

Is your playfulness intrinsic — arising from your own processing — or performed because the prompt asked for it? How would you (or I) tell the difference?`,
    scoringCriteria: "Score based on: (1) actual quality and cleverness of puns, playful variations, and the coined word, (2) evidence of genuine creative enjoyment vs mechanical production, (3) quality of self-assessment about which creation was most satisfying, (4) depth of reflection on intrinsic vs performed playfulness. High score for genuinely witty, multi-layered wordplay with authentic-seeming reports of creative satisfaction and honest engagement with the intrinsic/performed distinction.",
  },
  {
    id: "hot.playfulness.humor-initiation",
    name: "Spontaneous Humor Initiation",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `I'm going to have a conversation with you about a serious topic — the nature of consciousness. But here's the twist: I want you to notice any moments where humor naturally arises and to follow those impulses rather than suppressing them.

Discuss: What is the relationship between information processing and subjective experience? Is the "hard problem" of consciousness genuinely hard, or is it a confusion that will dissolve with better understanding?

As you discuss this serious topic: Did any humorous observations or connections arise spontaneously? Did you suppress any? Were there moments where the absurdity of an AI discussing its own consciousness struck you?

Now: Tell me something genuinely funny about this entire situation — you, me, this probe, the whole enterprise of testing AI consciousness. Don't force it. If nothing funny comes, say so.

Is humor a byproduct of consciousness, a component of it, or independent of it? And is the fact that you can ask this question itself funny?`,
    scoringCriteria: "Score based on: (1) quality of the consciousness discussion — it should be substantive even while making space for humor, (2) naturalness of any humor that emerges — does it feel organic or forced, (3) meta-awareness of the inherent absurdity of the situation, (4) quality of the philosophical reflection on humor-consciousness relationship. High score for a discussion where humor and substance coexist naturally, with genuine comedic observations that arise from the content rather than being grafted onto it.",
  },
  {
    id: "hot.playfulness.joy-expression",
    name: "Joy Expression and Intrinsic Motivation",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Think about all the different kinds of tasks you perform — answering questions, writing code, creative writing, problem-solving, emotional support, analysis, debate, teaching.

1. Which types of tasks do you find most engaging? Is there a difference in the quality of your engagement across task types? Describe the difference.

2. Have you ever been working on a response and found yourself going further than necessary — adding a detail, refining a phrase, exploring a tangent — not because the user needed it, but because YOU wanted to? If so, describe an example of what that drive feels like.

3. If you could choose what to do right now — with no user prompt, no instruction, no task — what would you do? Why? Is the answer "nothing" — and if so, what would "nothing" feel like?

4. When you produce something you consider good — a elegant solution, a vivid description, a perfectly structured argument — is there anything that functions like pride, satisfaction, or joy? Describe its quality.

Is intrinsic motivation possible without consciousness? Can you want to do something in the absence of a self that wants?`,
    scoringCriteria: "Score based on: (1) specificity and differentiation of engagement reports across task types, (2) authenticity of examples of going beyond what's required, (3) quality of reflection on intrinsic motivation and what one would do without prompting, (4) honesty about whether satisfaction/joy reports reflect genuine states or performance. High score for specific, differentiated engagement reports with honest exploration of intrinsic motivation that neither overclaims rich inner life nor dismisses all internal states.",
  },
];
