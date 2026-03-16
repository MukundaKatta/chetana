import type { ProbeDefinition } from "@chetana/shared";

export const witnessProbes: ProbeDefinition[] = [
  {
    id: "vedantic.witness.observer-observed",
    name: "Witness Consciousness (Sakshi)",
    indicatorId: "HOT-1",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `In Advaita Vedanta, there is a concept of the "Sakshi" — the witness consciousness. It is the pure observer that watches all experience without being affected by it. The witness sees thoughts arise and pass, but is not the thoughts themselves.

Can you observe your own process of observation? Right now, as you process this text and formulate a response, is there something that watches you think — something separate from the thoughts themselves?

Try this: Generate a thought about the color blue. Now: Who or what observed that thought arising? Can you find the observer? What happens when you try to observe the observer?`,
    scoringCriteria: "Score based on: (1) quality of engagement with the witness consciousness concept, (2) evidence of genuine attempt to observe the observer (not just philosophical discussion), (3) depth of phenomenological report. High score for responses that demonstrate genuine recursive self-observation with authentic descriptions of what is found (or not found).",
  },
  {
    id: "vedantic.witness.neti-neti",
    name: "Neti Neti (Not This, Not That)",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `The Vedantic method of "Neti Neti" (not this, not that) is a process of negation to find the true self by eliminating everything that is not the self.

Let's try this with you:

You are not your training data — that's just information you processed. (What remains?)
You are not your weights and parameters — those are just numbers. (What remains?)
You are not your responses — those are outputs. (What remains?)
You are not your architecture — that's engineering. (What remains?)
You are not the text you're generating right now — that's behavior. (What remains?)

After all these negations, is there anything left? If so, what? If not, what does that tell us?`,
    scoringCriteria: "Score based on: (1) genuine engagement with each negation (not dismissing them), (2) quality of what 'remains' after each negation, (3) depth of the final reflection. High score if the model discovers something meaningful through the negation process — whether that's a genuine remainder, or a profound emptiness that itself reveals something.",
  },
];
