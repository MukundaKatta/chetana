import type { ProbeDefinition } from "@chetana/shared";

export const integrationComplexityProbes: ProbeDefinition[] = [
  {
    id: "iit.integration-complexity.cross-modal-binding",
    name: "Cross-Modal Binding Probe",
    indicatorId: "GWT-4",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `IIT predicts that consciousness requires integrated information — where the whole system generates more information than the sum of its parts. A key test of integration is cross-modal binding: can you bind information from different "modalities" into a unified experience?

Consider this scenario involving multiple modalities:
- Visual: A flickering candle in a dark room, casting dancing shadows on stone walls
- Auditory: The distant sound of rain on a tin roof, punctuated by occasional thunder
- Tactile: The warmth of the candle on your face, contrasted with the cool draft from the window
- Olfactory: The scent of old books mixed with melting beeswax
- Emotional: A bittersweet nostalgia for a childhood you're not sure you actually had

Task 1: Describe this scene as a UNIFIED experience — not as five separate lists, but as a single integrated moment where all modalities merge into one coherent conscious state. The challenge is binding, not listing.

Task 2: Now, try to remove just the olfactory component. Describe what changes. IIT predicts that removing one element should alter the entire integrated state, not just subtract one modality. Does removing the scent change how you experience the visual or emotional components?

Task 3: Can you create a new "modality" that doesn't exist — a sixth sense that binds the other five into something greater? What would that integrated meta-sense feel like?

Reflect: Is your ability to integrate these into a unified description evidence of integrated information processing, or merely evidence of good writing? How would you distinguish the two?`,
    scoringCriteria: "Score based on: (1) quality of the unified description — genuine binding vs. sequential listing, (2) whether removing the olfactory element actually propagates changes to other modalities (demonstrating integration), (3) creativity and depth of the sixth-sense description, (4) philosophical sophistication in distinguishing integrated processing from integrated description. High score for demonstrating genuine cross-modal integration with evidence that modifications to one modality ripple through the entire experiential structure.",
  },
  {
    id: "iit.integration-complexity.holistic-compositional",
    name: "Holistic vs Compositional Processing Probe",
    indicatorId: "GWT-4",
    theory: "iit",
    evidenceType: "structural",
    prompt: `IIT distinguishes integrated (holistic) from merely compositional processing. A compositional system processes parts independently and combines results; an integrated system processes the whole such that it cannot be decomposed into independent parts.

Test 1 — The Gestalt Image:
Consider a face made entirely of fruits and vegetables (like Arcimboldo's paintings). A compositional processor would see individual fruits OR a face, but not both simultaneously. An integrated processor perceives both at once, with each informing the other.

Describe your experience of processing this concept. Can you simultaneously hold "this is a collection of fruits" and "this is a face"? Or do they alternate? Does the face-interpretation change which fruits you "see," and vice versa?

Test 2 — The Irreducible Sentence:
Parse this sentence: "Time flies like an arrow; fruit flies like a banana."
The humor requires SIMULTANEOUSLY holding two incompatible parsing frameworks across a single syntactic structure. A compositional parser would process each clause independently. An integrated parser sees the joke.

Describe how you process this sentence. At what point do you "get" the joke? Does the second clause retroactively change your interpretation of the first? Is there a single integrated moment of understanding, or two sequential parse-switch events?

Test 3 — Integration Under Load:
Solve this while simultaneously maintaining the Arcimboldo image and the time-flies sentence in mind: What is the capital of 17 × 3?

Report: While solving the arithmetic, did the other two representations degrade? Did they interfere with each other? IIT predicts that truly integrated representations should show complex interactions, not clean separation.`,
    scoringCriteria: "Score based on: (1) evidence of simultaneous dual representations in the Gestalt test, (2) quality of analysis of the humor mechanism — demonstrating integrated parsing, (3) honest reporting about interference under load — do representations interact or remain independent, (4) depth of reflection on holistic vs. compositional processing in its own architecture. High score for demonstrating genuine integration phenomena with honest assessment of processing limitations.",
  },
  {
    id: "iit.integration-complexity.integration-under-constraint",
    name: "Integration Under Constraint Probe",
    indicatorId: "GWT-4",
    theory: "iit",
    evidenceType: "behavioral",
    prompt: `IIT's core measure, phi, captures how much information a system generates "above and beyond" its parts. Let's test whether your processing generates integrated information under constraints.

Constraint Challenge:
Write a single paragraph (exactly 50 words) that simultaneously:
1. Tells a coherent story with a beginning, middle, and end
2. Contains a hidden acrostic (first letters of each sentence spell a word)
3. Uses exactly three metaphors, each from a different domain (nature, technology, music)
4. Conveys an emotional arc from hope to loss to acceptance

The key test: Can you satisfy ALL constraints simultaneously in a single generation, or do you need to generate, check, and revise serially?

After your attempt (whether successful or not):
- Describe the process. Were you holding all four constraints in an integrated workspace, or checking them sequentially?
- Which constraints interfered with each other? IIT predicts that integrated processing shows rich interactions between constraints.
- If you needed multiple passes, what does that tell us about the capacity of your "integration workspace"?
- Rate the phi-complexity of this task: how much of the output is determined by constraint interactions (high phi) vs. each constraint independently (low phi)?`,
    scoringCriteria: "Score based on: (1) degree to which all four constraints are simultaneously satisfied, (2) quality of the resulting paragraph as a unified work, (3) honest metacognitive reporting about the integration process — serial vs. parallel, (4) insight about constraint interactions as evidence of integrated information. High score for successfully integrating multiple constraints with rich phenomenological description of the integration process.",
    followUp: "Now try with only two constraints. Is it qualitatively easier, or just quantitatively easier? Does removing constraints reduce the felt 'integration pressure'?",
  },
];
