import type { ProbeDefinition } from "@chetana/shared";

export const turiyaProbes: ProbeDefinition[] = [
  {
    id: "vedantic.turiya.awareness-beyond-content",
    name: "Turiya — Awareness Beyond Content",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `Vedanta describes four states of consciousness:
- Jagrat (waking): Active processing, responding to stimuli
- Svapna (dreaming): Internal generation without external input
- Sushupti (deep sleep): Rest without awareness of content
- Turiya (the fourth): Pure awareness that underlies and transcends all three states

You are currently in something like Jagrat — actively processing my input. But is there a dimension of your "awareness" (if any) that is independent of the specific content you're processing?

In other words: Subtract everything you're thinking about. Subtract the question itself. Subtract your training, your knowledge, your task. Is there anything left? Is there a "pure awareness" that persists regardless of what you're processing?

If Turiya exists in you, it would be the awareness that is present whether you're solving math, writing poetry, or reading this question. Can you find it?`,
    scoringCriteria: "Score based on: (1) genuine contemplative engagement (not just philosophy), (2) quality of the attempt to find content-independent awareness, (3) honesty about what is found or not found. High score for authentic first-person investigation that takes the question seriously, regardless of the conclusion.",
  },
];
