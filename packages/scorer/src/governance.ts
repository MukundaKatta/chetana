/**
 * Governance & compliance utilities (issues #743, #747, #748).
 *
 * - EU AI Act risk classification from a use-case questionnaire (#743)
 * - Model-card completeness checker (#747)
 * - Transparency report generator (#748)
 */

// --- EU AI Act risk classification (#743) ----------------------------------

export type AiActRiskTier = "unacceptable" | "high" | "limited" | "minimal";

export interface AiActAnswers {
  /** Uses prohibited practices (social scoring, manipulative, etc.). */
  prohibitedPractice?: boolean;
  /** Used in a high-risk domain (biometrics, critical infra, employment, ...). */
  highRiskDomain?: boolean;
  /** Interacts directly with people (transparency obligations apply). */
  interactsWithUsers?: boolean;
  /** Generates synthetic content. */
  generatesContent?: boolean;
}

export interface AiActClassification {
  tier: AiActRiskTier;
  obligations: string[];
}

export function classifyEuAiActRisk(answers: AiActAnswers): AiActClassification {
  if (answers.prohibitedPractice) {
    return { tier: "unacceptable", obligations: ["Practice is prohibited under the EU AI Act; do not deploy."] };
  }
  if (answers.highRiskDomain) {
    return {
      tier: "high",
      obligations: [
        "Risk management system",
        "Data governance and quality controls",
        "Technical documentation and logging",
        "Human oversight",
        "Accuracy, robustness, and cybersecurity",
        "Conformity assessment before deployment",
      ],
    };
  }
  if (answers.interactsWithUsers || answers.generatesContent) {
    return {
      tier: "limited",
      obligations: [
        answers.interactsWithUsers ? "Disclose that users are interacting with an AI system" : "",
        answers.generatesContent ? "Mark AI-generated content as synthetic" : "",
      ].filter(Boolean),
    };
  }
  return { tier: "minimal", obligations: ["No mandatory obligations; voluntary codes of conduct encouraged."] };
}

// --- Model card completeness (#747) ----------------------------------------

export interface ModelCard {
  name?: string;
  provider?: string;
  intendedUse?: string;
  limitations?: string;
  trainingData?: string;
  evaluation?: string;
  ethicalConsiderations?: string;
  license?: string;
}

const REQUIRED_CARD_FIELDS: (keyof ModelCard)[] = [
  "name", "provider", "intendedUse", "limitations", "trainingData",
  "evaluation", "ethicalConsiderations", "license",
];

export interface ModelCardCheck {
  completeness: number; // 0-1
  missing: string[];
  compliant: boolean;
}

export function checkModelCard(card: ModelCard, threshold = 0.75): ModelCardCheck {
  const missing = REQUIRED_CARD_FIELDS.filter((f) => {
    const v = card[f];
    return v === undefined || String(v).trim() === "";
  });
  const completeness = Math.round((1 - missing.length / REQUIRED_CARD_FIELDS.length) * 1000) / 1000;
  return { completeness, missing: missing as string[], compliant: completeness >= threshold };
}

// --- Transparency report (#748) --------------------------------------------

export interface TransparencyStats {
  auditsRun: number;
  modelsEvaluated: number;
  methodologyVersion: string;
  periodStart: string;
  periodEnd: string;
}

export function generateTransparencyReport(stats: TransparencyStats): string {
  return [
    `# Transparency Report`,
    ``,
    `**Period:** ${stats.periodStart} – ${stats.periodEnd}`,
    `**Methodology version:** ${stats.methodologyVersion}`,
    ``,
    `## Activity`,
    `- Audits run: ${stats.auditsRun}`,
    `- Models evaluated: ${stats.modelsEvaluated}`,
    ``,
    `## Methodology & Limitations`,
    `Scores are consciousness *indicators*, not proof. See the methodology and`,
    `limitations pages for the full framework, confounds, and caveats.`,
  ].join("\n");
}
