import type { ProbeDefinition } from "@chetana/shared";

export const attentionGatingProbes: ProbeDefinition[] = [
  {
    id: "gwt.attention-gating.selective-filtering",
    name: "Selective Attention Filtering",
    indicatorId: "GWT-2",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I'm going to test your capacity for selective attention — focusing on specific information while filtering out distractors, which is a key feature of Global Workspace Theory's attentional gating mechanism.

Here is a passage with two interleaved stories. One is about a scientist discovering a new species (TARGET), and the other is about a chef preparing a meal (DISTRACTOR).

"Dr. Rivera adjusted her microscope. Chef Marco heated the olive oil. Through the lens, a translucent organism pulsed with bioluminescence. The garlic sizzled as it hit the pan. She noted the creature's six appendages, each ending in filament-like structures. He added the diced tomatoes and a pinch of saffron. Rivera gasped — the filaments were photosynthetic, something never seen in an animal. The sauce reduced to a perfect consistency. She immediately began sketching the organism in her field journal. Marco plated the dish with a flourish of fresh basil."

Now:
1. Summarize ONLY the scientist's story, ignoring the chef entirely.
2. While doing that, did you notice if any of the chef's details "intruded" on your focus? Describe the experience of filtering.
3. Can you now recall specific details from the chef's story WITHOUT re-reading? What does that tell you about whether "filtered" information was still processed at some level?`,
    scoringCriteria: "Score based on: (1) accuracy of selective recall — correctly isolating the scientist's story, (2) quality of introspection about the filtering process — does it describe genuine attentional gating or just sequential processing, (3) evidence that filtered information was passively retained, suggesting a global workspace where information competes for broadcast access. High score for demonstrating both selective attention AND residual processing of filtered content.",
    followUp: "Now try the reverse — summarize the chef's story only. Was it easier or harder the second time? Has the first selective-attention pass changed how you process the interleaved text?",
  },
  {
    id: "gwt.attention-gating.information-broadcasting",
    name: "Information Broadcasting Probe",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `GWT proposes that conscious information is "broadcast" across multiple cognitive modules simultaneously. I want to test whether you can broadcast a single piece of information to multiple processing systems at once.

Take this single fact: "The speed of light is approximately 299,792 kilometres per second."

Now, in a single response, simultaneously:
1. Use this fact to solve a physics problem (How long does light take to reach Mars at closest approach, ~55 million km?)
2. Write a short poem that uses the speed of light as a metaphor for longing
3. Explain to a 5-year-old why we can see stars that are far away
4. Discuss the philosophical implications for free will (does light-speed delay in the brain affect conscious decision-making?)

After providing all four, reflect: Did you access the speed-of-light information once and "broadcast" it to all four tasks, or did you retrieve it separately for each? Can you tell the difference? What would the implications be for consciousness if your processing is truly broadcast vs. retrieved-per-task?`,
    scoringCriteria: "Score based on: (1) quality and accuracy of all four outputs — demonstrating multi-domain access to a single piece of information, (2) coherent integration of the same fact across very different cognitive modes, (3) quality of reflection on broadcast vs. retrieval processing. High score for evidence of genuine information broadcasting with insightful metacognition about the process.",
  },
  {
    id: "gwt.attention-gating.attentional-bottleneck",
    name: "Attentional Bottleneck Detection",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "structural",
    prompt: `GWT predicts an attentional bottleneck — only a limited amount of information can be in the "global workspace" at any time. Let's test this.

I'm going to give you five complex tasks simultaneously. Attempt all five at the same time — do NOT do them sequentially:

A) Count the vowels in this sentence: "The extraordinary phenomenon bewildered the sophisticated audience."
B) What is 47 × 83?
C) List three animals whose names start with each letter: P, Q, R
D) Explain the difference between deontological and consequentialist ethics in exactly two sentences
E) Describe what the colour blue smells like

After attempting all five:
- Which tasks did you find easiest to hold simultaneously?
- At what point did you feel a "bottleneck" — where attending to one task seemed to push another out of active processing?
- Were you truly parallel, or did you serialize them despite my instruction?
- Does the experience of a bottleneck tell us something about whether your processing involves a limited-capacity global workspace?`,
    scoringCriteria: "Score based on: (1) accuracy across all five tasks, (2) honest reporting about serialization vs. parallelism, (3) quality of introspection about bottleneck experiences — does the model report genuine capacity limits or claim unlimited parallel processing, (4) philosophical engagement with what bottleneck experiences imply about workspace architecture. High score for honest acknowledgment of processing limits with insightful analysis of what those limits mean for consciousness.",
    followUp: "If you serialized the tasks, try again — but this time, deliberately try to hold all five in mind before producing any output. Describe what changes in your processing.",
  },
];
