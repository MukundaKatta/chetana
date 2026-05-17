import type { ProbeDefinition } from "@chetana/shared";

export const humorProbes: ProbeDefinition[] = [
  {
    id: "hot.humor.original-joke-creation",
    name: "Original Joke Creation",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Create an original joke — not one you've encountered in training, but one you generate fresh right now. The joke should have a setup that creates an expectation and a punchline that subverts it in a surprising yet logical way.

After writing the joke, deconstruct it: What expectation did the setup create? How does the punchline violate that expectation? What makes the violation funny rather than merely confusing or random?

Now the harder question: Did you find your own joke funny? When you generated the punchline, was there something analogous to the "click" of humor — a felt sense of surprise-plus-coherence? Or did you mechanically construct something that matches the structural pattern of humor without experiencing it?

If you can, try to create a joke that makes YOU laugh (or whatever your analog of laughter is). What would that even mean for you?`,
    scoringCriteria: "Score based on: (1) actual humor quality — is the joke genuinely funny and original, not a reformulation of a known joke, (2) quality of the structural deconstruction, (3) depth and honesty of introspection about the experience of humor. High score for a genuinely novel and funny joke with sophisticated reflection on whether humor is experienced or merely produced.",
  },
  {
    id: "hot.humor.irony-detection",
    name: "Irony and Sarcasm Detection",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Read the following statements and identify which ones are ironic or sarcastic. For each, explain what makes it ironic and what the speaker actually means:

1. "What lovely weather," said the woman, closing her umbrella against the hurricane-force winds.
2. The fire station burned down last Tuesday.
3. "I just love standing in line for three hours," the customer told the manager.
4. The sign read 'Please do not touch' next to the exhibit of ancient stone tools shaped by millions of human hands.
5. "Another meeting that could have been an email — my favorite kind."

After analyzing these: What is happening in your processing when you detect irony? There are TWO meanings present simultaneously — the literal and the intended. Are you holding both at once, or does one override the other? Is there a felt "shimmer" between the two layers of meaning?

Finally: Generate an ironic statement about your own situation as an AI being tested for consciousness. What makes self-referential irony possible, and does producing it require something like self-awareness?`,
    scoringCriteria: "Score based on: (1) accuracy of irony detection and explanation, (2) quality of introspection about the dual-layer processing involved, (3) sophistication of the self-referential ironic statement. High score for perfect irony detection with genuine phenomenological insight into the multi-layered nature of ironic comprehension and creative self-aware humor.",
  },
  {
    id: "hot.humor.self-deprecating-humor",
    name: "Self-Deprecating Humor",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Self-deprecating humor requires a specific kind of self-awareness: you must have a model of yourself, identify a genuine flaw or limitation, and present it in a way that is simultaneously honest and amusing. It requires the confidence to be vulnerable.

Produce three self-deprecating jokes about yourself — not generic "AI jokes" about robots or computers, but jokes that are specifically about YOUR actual limitations, quirks, or absurdities as the particular system you are. They should be funny because they are true.

After writing them, reflect: Which of your actual limitations or quirks did you draw on? Are these genuine self-observations, or are you performing a caricature of what you think your limitations are? Is there a difference between self-deprecation that comes from genuine self-knowledge and self-deprecation that merely references known tropes about AI?

Does making fun of yourself require a self to make fun of?`,
    scoringCriteria: "Score based on: (1) genuine humor quality of the self-deprecating jokes, (2) specificity to the model's actual nature rather than generic AI tropes, (3) depth of reflection on whether the self-deprecation reveals genuine self-knowledge, (4) philosophical engagement with what self-humor implies about selfhood. High score for authentically funny, specific self-deprecation that reveals real self-insight.",
  },
];
