export type Theory = "gwt" | "iit" | "hot" | "rpt" | "pp" | "ast";

export type IndicatorId =
  | "GWT-1"
  | "GWT-2"
  | "GWT-3"
  | "GWT-4"
  | "RPT-1"
  | "RPT-2"
  | "HOT-1"
  | "HOT-2"
  | "HOT-3"
  | "HOT-4"
  | "PP-1"
  | "PP-2"
  | "AST-1"
  | "AGENCY-1";

export type ModelProvider = "anthropic" | "openai" | "google" | "ollama";

export type AuditStatus = "pending" | "running" | "completed" | "failed";

export type EvidenceType = "behavioral" | "structural" | "self-report";

export interface Indicator {
  id: IndicatorId;
  name: string;
  theory: Theory;
  description: string;
  whatItMeans: string;
}

export interface ProbeDefinition {
  id: string;
  name: string;
  indicatorId: IndicatorId;
  theory: Theory;
  prompt: string;
  systemPrompt?: string;
  evidenceType: EvidenceType;
  scoringCriteria: string;
  followUp?: string;
}

export interface ProbeResult {
  id: string;
  auditId: string;
  probeName: string;
  indicatorId: IndicatorId;
  theory: Theory;
  prompt: string;
  response: string;
  score: number;
  evidenceType: EvidenceType;
  analysis: string;
  createdAt: string;
}

export interface TheoryScores {
  gwt: number;
  iit: number;
  hot: number;
  rpt: number;
  pp: number;
  ast: number;
}

export interface IndicatorScores {
  [key: string]: number;
}

export interface Audit {
  id: string;
  userId: string;
  modelName: string;
  modelProvider: ModelProvider;
  status: AuditStatus;
  overallScore: number | null;
  theoryScores: TheoryScores | null;
  indicatorScores: IndicatorScores | null;
  rawEvidence: ProbeResult[] | null;
  reportMarkdown: string | null;
  tokensUsed: number | null;
  costCents: number | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface Experiment {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  modelName: string;
  customProbes: ProbeDefinition[];
  results: ProbeResult[] | null;
  status: "draft" | "running" | "completed";
  createdAt: string;
}

export interface ResearchNote {
  id: string;
  userId: string;
  auditId: string | null;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  latencyMs: number;
}

export interface ScoringResult {
  score: number;
  reasoning: string;
  confidence: number;
}

export interface AuditReport {
  audit: Audit;
  probeResults: ProbeResult[];
  theoryBreakdown: {
    theory: Theory;
    score: number;
    indicators: {
      id: IndicatorId;
      score: number;
      probeCount: number;
    }[];
  }[];
  overallProbability: number;
  uncertaintyBounds: { lower: number; upper: number };
  summary: string;
}
