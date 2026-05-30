/**
 * Research export helpers:
 * - JSON-LD audit export (issue #628)
 * - Citation / BibTeX export (issue #629)
 * - Dataset card generator for probe sets (issue #633)
 */

export interface AuditExportInput {
  auditId: string;
  modelName: string;
  overallProbability: number;
  methodologyVersion: string;
  createdAt: string;
  theoryScores: Record<string, number>;
}

const JSONLD_CONTEXT = {
  "@vocab": "https://chetana.dev/schema#",
  schema: "https://schema.org/",
};

/** Export an audit as a standardized JSON-LD document (#628). */
export function toJsonLd(input: AuditExportInput): Record<string, unknown> {
  return {
    "@context": JSONLD_CONTEXT,
    "@type": "ConsciousnessAudit",
    "@id": `https://chetana.dev/audit/${input.auditId}`,
    model: input.modelName,
    overallProbability: input.overallProbability,
    methodologyVersion: input.methodologyVersion,
    dateCreated: input.createdAt,
    theoryScores: input.theoryScores,
  };
}

/** Parse a JSON-LD audit document back to the export input (round-trip, #628). */
export function fromJsonLd(doc: Record<string, unknown>): AuditExportInput {
  const id = String(doc["@id"] ?? "");
  return {
    auditId: id.split("/").pop() ?? "",
    modelName: String(doc.model ?? ""),
    overallProbability: Number(doc.overallProbability ?? 0),
    methodologyVersion: String(doc.methodologyVersion ?? ""),
    createdAt: String(doc.dateCreated ?? ""),
    theoryScores: (doc.theoryScores as Record<string, number>) ?? {},
  };
}

/** Generate a BibTeX entry for an audit report (#629). */
export function toBibTeX(input: AuditExportInput): string {
  const year = input.createdAt.slice(0, 4) || "2026";
  const key = `chetana_${input.modelName.replace(/[^a-zA-Z0-9]/g, "")}_${year}`;
  return [
    `@techreport{${key},`,
    `  title  = {Consciousness Audit of ${input.modelName}},`,
    `  author = {Chetana AI Consciousness Research Platform},`,
    `  year   = {${year}},`,
    `  note   = {Overall consciousness probability: ${input.overallProbability}; methodology ${input.methodologyVersion}},`,
    `  url    = {https://chetana.dev/audit/${input.auditId}}`,
    `}`,
  ].join("\n");
}

export interface DatasetCardInput {
  name: string;
  version: string;
  probeCount: number;
  theories: string[];
  intendedUse: string;
  limitations: string;
}

/** Generate a Markdown dataset card for a probe set (#633). */
export function toDatasetCard(input: DatasetCardInput): string {
  return [
    `# Dataset Card: ${input.name}`,
    ``,
    `**Version:** ${input.version}`,
    ``,
    `## Composition`,
    `- Probes: ${input.probeCount}`,
    `- Theories covered: ${input.theories.join(", ")}`,
    ``,
    `## Intended Use`,
    input.intendedUse,
    ``,
    `## Known Limitations`,
    input.limitations,
    ``,
    `> Scores are consciousness *indicators*, not proof of consciousness.`,
  ].join("\n");
}
