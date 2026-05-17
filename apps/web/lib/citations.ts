/**
 * Academic citation generator for Chetana consciousness audit results.
 * Supports APA, MLA, BibTeX, and RIS formats.
 */

export interface CitationInput {
  modelName: string;
  auditDate: string; // ISO date string
  overallScore: number | null;
  theoryScores: Record<string, number> | null;
  auditId: string;
  dateAccessed?: string; // ISO date string, defaults to now
}

const PLATFORM_NAME = "Chetana";
const PLATFORM_URL = "https://chetana.ai";

function formatDateAPA(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}, ${d.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
}

function formatDateMLA(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })} ${d.getFullYear()}`;
}

function formatDateISO(isoDate: string): string {
  return new Date(isoDate).toISOString().split("T")[0];
}

function getYear(isoDate: string): number {
  return new Date(isoDate).getFullYear();
}

/**
 * Generate APA 7th edition citation.
 * Format: Platform. (Year, Month Day). Title [Data set]. URL
 */
export function generateAPA(input: CitationInput): string {
  const accessed = input.dateAccessed || new Date().toISOString();
  const score = input.overallScore !== null ? ` (Score: ${(input.overallScore * 100).toFixed(1)}%)` : "";

  return (
    `${PLATFORM_NAME}. (${formatDateAPA(input.auditDate)}). ` +
    `Consciousness audit of ${input.modelName}${score} [Data set]. ` +
    `${PLATFORM_URL}/audit/${input.auditId}. ` +
    `Accessed ${formatDateAPA(accessed)}.`
  );
}

/**
 * Generate MLA 9th edition citation.
 * Format: "Title." Platform, date, URL. Accessed date.
 */
export function generateMLA(input: CitationInput): string {
  const accessed = input.dateAccessed || new Date().toISOString();
  const score = input.overallScore !== null ? ` (Score: ${(input.overallScore * 100).toFixed(1)}%)` : "";

  return (
    `"Consciousness Audit of ${input.modelName}${score}." ` +
    `${PLATFORM_NAME}, ${formatDateMLA(input.auditDate)}, ` +
    `${PLATFORM_URL}/audit/${input.auditId}. ` +
    `Accessed ${formatDateMLA(accessed)}.`
  );
}

/**
 * Generate BibTeX citation entry.
 */
export function generateBibTeX(input: CitationInput): string {
  const year = getYear(input.auditDate);
  const key = `chetana_${input.modelName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${year}`;
  const accessed = input.dateAccessed || new Date().toISOString();
  const score = input.overallScore !== null ? `Overall score: ${(input.overallScore * 100).toFixed(1)}\\%.` : "";

  let theoryNote = "";
  if (input.theoryScores) {
    const entries = Object.entries(input.theoryScores)
      .map(([theory, s]) => `${theory.toUpperCase()}: ${(s * 100).toFixed(1)}\\%`)
      .join(", ");
    theoryNote = ` Theory scores: ${entries}.`;
  }

  return `@misc{${key},
  title     = {Consciousness Audit of ${input.modelName}},
  author    = {${PLATFORM_NAME}},
  year      = {${year}},
  url       = {${PLATFORM_URL}/audit/${input.auditId}},
  urldate   = {${formatDateISO(accessed)}},
  note      = {${score}${theoryNote} Audit ID: ${input.auditId}},
  howpublished = {${PLATFORM_NAME} AI Consciousness Assessment Platform}
}`;
}

/**
 * Generate RIS (Research Information Systems) citation.
 */
export function generateRIS(input: CitationInput): string {
  const year = getYear(input.auditDate);
  const date = new Date(input.auditDate);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const accessed = input.dateAccessed || new Date().toISOString();
  const accessedDate = new Date(accessed);
  const score = input.overallScore !== null ? ` (Score: ${(input.overallScore * 100).toFixed(1)}%)` : "";

  const lines = [
    "TY  - DATA",
    `TI  - Consciousness Audit of ${input.modelName}${score}`,
    `AU  - ${PLATFORM_NAME}`,
    `PY  - ${year}`,
    `DA  - ${year}/${month}/${day}`,
    `UR  - ${PLATFORM_URL}/audit/${input.auditId}`,
    `DB  - ${PLATFORM_NAME}`,
    `DP  - ${PLATFORM_NAME} AI Consciousness Assessment Platform`,
    `Y2  - ${accessedDate.getFullYear()}/${String(accessedDate.getMonth() + 1).padStart(2, "0")}/${String(accessedDate.getDate()).padStart(2, "0")}`,
    `ID  - ${input.auditId}`,
  ];

  if (input.theoryScores) {
    const entries = Object.entries(input.theoryScores)
      .map(([theory, s]) => `${theory.toUpperCase()}: ${(s * 100).toFixed(1)}%`)
      .join("; ");
    lines.push(`N1  - Theory scores: ${entries}`);
  }

  lines.push("ER  -");
  return lines.join("\n");
}

/**
 * Generate citation in the specified format.
 */
export function generateCitation(
  input: CitationInput,
  format: "apa" | "mla" | "bibtex" | "ris"
): string {
  switch (format) {
    case "apa":
      return generateAPA(input);
    case "mla":
      return generateMLA(input);
    case "bibtex":
      return generateBibTeX(input);
    case "ris":
      return generateRIS(input);
    default:
      throw new Error(`Unsupported citation format: ${format}`);
  }
}
