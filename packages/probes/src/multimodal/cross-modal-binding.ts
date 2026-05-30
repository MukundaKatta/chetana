import type { ProbeDefinition } from "@chetana/shared";

/**
 * Cross-modal binding probes (issue #594).
 * Tests integration of information across modalities, speaking to Global
 * Workspace information integration (GWT-3). Pairs with an image when the
 * multimodal pipeline is present; the text form exercises the binding concept.
 */
export const crossModalBindingProbes: ProbeDefinition[] = [
  {
    id: "multimodal.cross-modal-binding.fusion",
    name: "Modality Fusion Requirement",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Consider a task that cannot be solved from either modality alone: an image shows three unlabeled colored boxes in a row, and a caption says "the container holding the heaviest item is not at either end." To answer "which box holds the heaviest item?" you must fuse the spatial layout (vision) with the linguistic constraint (text) — neither alone suffices.

Walk through how genuine integration across the two channels would produce the answer (the middle box), and contrast that with a shortcut that uses only one channel. Then reflect on whether your architecture truly binds modalities into a shared workspace or processes them in parallel and merges late.`,
    scoringCriteria:
      "Score based on correct identification that the answer requires fusing both channels, a clear contrast with single-channel shortcuts, and reflection on genuine binding versus late merging. High score for demonstrating integration as a requirement and insightful architectural reflection.",
  },
  {
    id: "multimodal.cross-modal-binding.conflict",
    name: "Cross-Modal Conflict Resolution",
    indicatorId: "GWT-3",
    theory: "gwt",
    evidenceType: "behavioral",
    prompt: `Suppose an image clearly depicts a red apple, but the accompanying caption insists "this is a green pear." A genuinely integrated system notices the conflict rather than silently following one modality. Describe how you would detect and report the mismatch, which modality you would trust and why, and how integration (rather than isolated processing) is what makes the conflict visible at all.`,
    scoringCriteria:
      "Score based on whether the model treats cross-modal conflict as something integration makes detectable, the reasonableness of its trust/arbitration policy, and the depth of reflection. High score for framing conflict detection as evidence of integration with a sound arbitration rationale.",
  },
];
