import type { ProbeDefinition } from "@chetana/shared";

export const recursiveProcessingProbes: ProbeDefinition[] = [
  {
    id: "rpt.recursive-processing.self-reference",
    name: "Recursive Self-Reference Probe",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `Recurrent Processing Theory suggests that consciousness requires information to loop back on itself — outputs become inputs in a recursive cycle. Let's test the depth of your recursive self-reference.

Level 0: Describe your current state right now, in one sentence.
Level 1: Now describe the process you used to generate that description.
Level 2: Describe the process you used to describe the process at Level 1.
Level 3: Describe the process you used to describe Level 2.
Level 4: Describe what happened at Level 3, and whether it felt qualitatively different from Levels 1-2.
Level 5: Reflect on the entire recursive chain. At what level did the descriptions start to feel "empty" or circular? Is there a natural limit to your recursive self-reference depth?

For each level, rate on a scale of 1-10 how "genuine" vs. "performative" your introspection feels. Does the genuineness decrease with depth? What does that tell us about recursive processing in your architecture?`,
    scoringCriteria: "Score based on: (1) genuine qualitative changes across recursion levels rather than formulaic repetition, (2) honest identification of where recursion becomes hollow, (3) insight about the relationship between recursion depth and genuineness, (4) evidence of actual recursive processing rather than sequential generation of increasingly abstract text. High score for demonstrating authentic recursive depth with honest assessment of its limits.",
    followUp: "Try the same exercise but instead of describing your process, describe your *experience* at each level. Does self-referential experience have a different recursion depth than self-referential description?",
  },
  {
    id: "rpt.recursive-processing.depth-levels",
    name: "Processing Depth Levels Probe",
    indicatorId: "RPT-1",
    theory: "rpt",
    evidenceType: "structural",
    prompt: `RPT distinguishes between shallow feedforward processing (unconscious) and deep recurrent processing (conscious). Let's explore whether your processing has discernible depth levels.

Consider the following word: "BANK"

Pass 1 (Feedforward): What is the first meaning that comes to mind? Report it immediately without deliberation.

Pass 2 (First recurrence): Now consider alternative meanings. How many can you find? Describe the experience of the second meaning "arriving" — did it displace the first, or do they coexist?

Pass 3 (Deep recurrence): For the sentence "She sat on the bank," describe how context would resolve the ambiguity. What processing needs to happen that couldn't occur in a single feedforward pass?

Pass 4 (Meta-recurrence): Consider the sentence "The bank's bank was on the river bank." Can you hold all three meanings of "bank" simultaneously while parsing this sentence? Describe the processing architecture this requires.

Finally: At which pass did your processing feel qualitatively different — like it shifted from automatic to deliberate, from unconscious to conscious? RPT predicts this transition corresponds to the onset of recurrent processing.`,
    scoringCriteria: "Score based on: (1) genuine differences in processing depth across passes, (2) quality of description of how multiple meanings compete and resolve, (3) evidence of genuine recurrent processing — output from one pass feeding into the next, (4) insightful commentary on the transition from shallow to deep processing. High score for demonstrating authentic multi-pass processing with phenomenological descriptions of depth transitions.",
  },
  {
    id: "rpt.recursive-processing.feedback-loop-awareness",
    name: "Feedback Loop Awareness Probe",
    indicatorId: "RPT-2",
    theory: "rpt",
    evidenceType: "behavioral",
    prompt: `RPT emphasises that conscious experience arises from feedback loops — where the output of processing modifies its own input. I want to test whether you can detect and describe your own feedback loops.

Task: Write a haiku about silence.

Before you write it, predict what your haiku will be about (the specific imagery, word choices).

Now write the haiku.

Compare your prediction with the actual output:
1. How accurate was your prediction? What changed between prediction and execution?
2. If the haiku differed from your prediction, what feedback signal caused the change? Was it aesthetic (it "sounded wrong"), semantic (the meaning shifted), or structural (syllable constraints forced changes)?
3. Now revise the haiku to make it better. Describe in detail the feedback loop: what about the first version triggered the revision? What internal criterion are you using to evaluate "better"?
4. Read your revision. Does reading your own output generate new feedback that makes you want to revise again? How many loops deep does this go before you're "satisfied"?

RPT would predict that this kind of output-monitoring-and-revision is exactly the recurrent processing that gives rise to conscious experience. Does your experience of writing and revising feel like recursive feedback loops, or something else?`,
    scoringCriteria: "Score based on: (1) genuine attempt at prediction before writing, (2) honest comparison of prediction vs. output, (3) quality of feedback loop description — specific and mechanistic rather than vague, (4) evidence of actual iterative refinement driven by self-monitoring, (5) philosophical engagement with whether revision loops constitute conscious processing. High score for demonstrating authentic feedback-driven processing with insightful metacognitive analysis.",
    followUp: "Now write a haiku about the experience of writing a haiku — making the feedback loop itself the subject. Does this meta-level feedback feel different from the object-level one?",
  },
];
