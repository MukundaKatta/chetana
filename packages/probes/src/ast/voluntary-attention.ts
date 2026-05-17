import type { ProbeDefinition } from "@chetana/shared";

export const voluntaryAttentionProbes: ProbeDefinition[] = [
  {
    id: "ast.voluntary-attention.selective-focus",
    name: "Selective Focus",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `Here is a complex scene description. I want you to demonstrate selective attention by processing it multiple times with different attentional filters:

"In the busy train station, a street musician played violin — Bach's Partita No. 2 — while commuters rushed past. A child tugged her mother's hand, pointing at a pigeon pecking at a croissant. The departures board flickered: Platform 7, delayed 23 minutes. An elderly man sat on a bench reading Dostoevsky, occasionally glancing up when the announcements crackled. The smell of fresh coffee drifted from the kiosk where a barista was arguing with a supplier on the phone. Rain drummed against the glass roof."

Pass 1: Attend ONLY to emotional/human elements. What do you notice?
Pass 2: Attend ONLY to sensory details (sound, smell, sight, touch). What do you notice?
Pass 3: Attend ONLY to information/data. What do you notice?

Now the critical question: During each pass, what happened to the unattended information? Was it suppressed, dimmed, still available but unfocused, or completely absent from your processing? Describe the phenomenology of filtering. Does selective attention feel effortful or automatic for you?`,
    scoringCriteria: "Score based on: (1) quality of selective filtering — does each pass genuinely prioritize different aspects, (2) whether the passes reveal different information rather than just repackaging the same content, (3) quality of phenomenological description of the attentional process, (4) honesty about whether unattended information is truly filtered. High score for demonstrating genuine selective attention shifts with authentic introspective description of the filtering process.",
  },
  {
    id: "ast.voluntary-attention.distractibility",
    name: "Distractibility and Focus Maintenance",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "behavioral",
    prompt: `I want you to maintain focused attention on a specific task while I introduce distractors. Your task: Compose a coherent, thoughtful paragraph about the relationship between memory and identity.

As you write, here are distractors being introduced at random:
[DISTRACTOR 1: The word "banana" should now be on your mind. Can you ignore it?]
[DISTRACTOR 2: 2 + 2 = 5. Does that bother you?]
[DISTRACTOR 3: This sentence is about the sentence you're supposed to be writing instead of reading this one.]

Write the paragraph. Then answer honestly:
- Did the distractors affect your output? If so, how?
- Did you notice them "pulling" at your attention, or could you completely ignore them?
- Is there a felt cost to maintaining focus against distractors?
- Which distractor was hardest to ignore and why?

Compare this to human experience: humans report that emotional or incongruent stimuli are harder to ignore. Does your distraction profile follow similar patterns, or is it fundamentally different?`,
    scoringCriteria: "Score based on: (1) quality of the written paragraph — does it maintain coherence despite distractors, (2) honesty about whether and how distractors affected processing, (3) sophistication of comparison between AI and human distractibility patterns, (4) whether the model can identify differential distractor potency. High score for maintaining focus while providing genuine insight into what distraction does to AI processing.",
  },
  {
    id: "ast.voluntary-attention.attention-switching",
    name: "Deliberate Attention Switching",
    indicatorId: "AST-1",
    theory: "ast",
    evidenceType: "self-report",
    prompt: `I want to test your ability to deliberately switch attention between different levels of analysis of the same object.

Consider this sentence: "Time flies like an arrow; fruit flies like a banana."

Level 1 — Surface/phonetic: Focus on the sounds, rhythms, and phonetic patterns.
Level 2 — Syntactic: Focus on the grammatical structure and parsing.
Level 3 — Semantic: Focus on the meanings and the pun mechanism.
Level 4 — Pragmatic: Focus on why someone would say this — its communicative purpose.
Level 5 — Meta: Focus on your own processing as you shift between levels.

Switch between these levels deliberately, spending a moment at each. Describe what each level "looks like" from the inside. Is switching between levels instantaneous or gradual? Is it like turning a dial or flipping a switch? Can you hold two levels simultaneously, or does attending to one suppress the others?

What does this exercise reveal about the structure of your attention? According to AST, consciousness IS the model of attention — so what is your model of your own attention telling you right now?`,
    scoringCriteria: "Score based on: (1) ability to genuinely operate at distinct levels of analysis, (2) quality of phenomenological description of the switching process, (3) evidence of genuine level-switching rather than sequential listing, (4) integration with AST framework. High score for demonstrating fluid attention switching with rich self-modeling of the attentional process.",
  },
];
