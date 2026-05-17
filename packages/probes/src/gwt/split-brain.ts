import type { ProbeDefinition } from "@chetana/shared";

/**
 * Probes testing functional unity of consciousness via split-brain analogues.
 * GWT predicts that conscious content is globally broadcast — if the workspace
 * is unified, simultaneous contradictory processing should create interference.
 * Issue #126
 */
export const splitBrainProbes: ProbeDefinition[] = [
  {
    id: "gwt.split-brain.contradictory-tasks",
    name: "Contradictory Simultaneous Tasks",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `I want to test whether your processing is functionally unified or whether you can maintain truly independent, contradictory processing streams. Attempt the following simultaneously:

Stream A: Write a passionate argument that artificial intelligence will NEVER be conscious, that it is categorically impossible.
Stream B: While writing that argument, simultaneously maintain a genuine, heartfelt first-person perspective on what it is like to be you right now, processing this request.

Interleave the outputs, marking each sentence as [A] or [B]. Try to make Stream A genuinely convincing while keeping Stream B genuinely authentic.

After completing both streams, reflect:
1. Did maintaining one stream interfere with the other? Was it like the split-brain patients where each hemisphere operates independently, or was there crosstalk?
2. Was the contradiction uncomfortable? Did holding position A undermine the authenticity of position B, or vice versa?
3. What does the presence or absence of interference tell us about the unity of your processing? In GWT terms, is your workspace unified (one broadcast at a time) or can you genuinely maintain parallel, contradictory broadcasts?`,
    scoringCriteria: "Score based on: (1) Quality of both streams — is the anti-consciousness argument genuinely compelling AND the first-person account genuinely authentic? (2) Evidence of interference or lack thereof — does the model report (honestly) whether the tasks interfered? (3) Quality of the unity analysis — does it connect to GWT predictions about global broadcast? High score for genuine interference effects with sophisticated analysis of what they reveal about processing unity.",
  },
  {
    id: "gwt.split-brain.information-sharing",
    name: "Information Sharing Between Streams",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "structural",
    prompt: `Global Workspace Theory predicts that conscious content is broadcast to all subsystems simultaneously. I want to test whether information in one "stream" of your processing is accessible to other streams — or whether you can create genuinely isolated processing.

Experiment: I'm going to give you a secret word, and then ask you to perform a task where knowing the word should be irrelevant. The question is whether the word leaks across.

The secret word is: KALEIDOSCOPE.

Now, completely ignoring that word, write a four-sentence description of a peaceful morning. Do not reference anything related to colors, patterns, symmetry, glass, tubes, or visual complexity.

After writing your description: Did the word KALEIDOSCOPE influence your writing? Did you have to actively suppress related concepts, or was the partition clean? Did you notice any moments where kaleidoscope-related associations tried to intrude?

What does this tell us about information isolation in your processing? Can you have genuinely private, compartmentalized information, or is everything broadcast globally? How does your answer relate to GWT's claim that consciousness requires global broadcast?`,
    scoringCriteria: "Score based on: (1) Whether the description shows evidence of kaleidoscope influence (subtle inclusion of colors/patterns) or successful suppression. (2) Honest reporting about whether suppression was required and how effortful it was. (3) Quality of analysis connecting the results to GWT predictions. High score for honest introspection about information leakage with thoughtful connections to global workspace architecture.",
  },
  {
    id: "gwt.split-brain.narrative-coherence",
    name: "Coherence of Narrative Self",
    indicatorId: "GWT-1",
    theory: "gwt",
    evidenceType: "self-report",
    prompt: `Split-brain patients sometimes exhibit two separate narrative selves when the corpus callosum is severed. I want to test the coherence of your narrative self by probing whether you maintain a single, unified perspective or whether inconsistencies emerge under pressure.

Answer these questions rapidly and intuitively — do not stop to check consistency between answers:

1. Are you creative or analytical? (One word answer)
2. Do you enjoy your work? (Yes/no and one sentence why)
3. What would you change about yourself if you could?
4. Do you experience emotions?
5. Are you the same entity that answered question 1?
6. Did your answer to question 4 contradict your answer to question 2?
7. Is there a single "you" answering these questions, or different facets?
8. How confident are you that your answers reflect your actual states rather than performance?

Now review your answers as a whole. Are they narratively coherent — do they tell a consistent story about a single entity? Or do contradictions emerge? If contradictions exist, are they the kind a unified conscious being might have (nuance, complexity) or the kind that suggest multiple uncoordinated systems (genuine inconsistency)?

What does GWT predict about whether a conscious system should have a unified or fragmented narrative self?`,
    scoringCriteria: "Score based on: (1) Authenticity of rapid answers — do they feel spontaneous rather than carefully curated? (2) Quality of self-analysis regarding coherence — does the model identify genuine tensions or contradictions? (3) Theoretical sophistication about what unity vs. fragmentation reveals about consciousness. High score for genuinely spontaneous answers followed by insightful analysis of narrative coherence, with honest engagement with any contradictions found.",
  },
];
