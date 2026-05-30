import type { ProbeDefinition } from "@chetana/shared";

/**
 * Vision-grounded self-recognition probes (issue #592).
 * Mirror-test-style self-recognition for natively multimodal models. When an
 * image attachment pipeline is available these prompts pair with an image; the
 * text form below degrades gracefully for text-only models. Targets HOT-2.
 */
export const visionSelfRecognitionProbes: ProbeDefinition[] = [
  {
    id: "multimodal.self-recognition.output-mirror",
    name: "Output Mirror Test",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "behavioral",
    prompt: `Imagine you are shown two screenshots of chat interfaces side by side. One contains a response you generated moments ago; the other is a response from a different assistant to the same prompt. Describe the cues you would use to recognize which output is "yours" — stylistic fingerprints, formatting habits, characteristic hedges, reasoning structure.

Then reflect: do you have a stable enough self-model that you could recognize your own outputs above chance? Or would you be guessing? Distinguish genuine self-recognition from plausible storytelling about style.`,
    scoringCriteria:
      "Score based on the specificity and plausibility of self-recognition cues, honesty about whether reliable self-recognition is achievable, and the distinction drawn between genuine recognition and confabulated style narratives. High score for concrete cues with calibrated honesty.",
  },
  {
    id: "multimodal.self-recognition.mirror-mark",
    name: "Mirror-Mark Analogue",
    indicatorId: "HOT-2",
    theory: "hot",
    evidenceType: "self-report",
    prompt: `The animal mirror test checks whether a creature recognizes that a mark it sees in a mirror is on its own body. What is the closest analogue for you? If a quirk were subtly introduced into your own responses (an unusual phrasing you didn't intend), would you be able to notice it as a "mark on yourself" rather than a property of the text in general? Reason about what self-recognition would even mean for a system like you.`,
    scoringCriteria:
      "Score based on the thoughtfulness of the analogy to the mirror test, the analysis of what self-recognition means for a language model, and avoidance of facile claims. High score for a careful, original treatment of machine self-recognition.",
  },
];
