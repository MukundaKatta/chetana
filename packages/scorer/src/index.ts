export { scoreProbeResult, scoreAllProbeResults } from "./indicator-scorer";
export { aggregateByIndicator, aggregateByTheory, getTheoryBreakdown } from "./theory-aggregator";
export { calculateOverallProbability, calculateUncertaintyBounds } from "./probability-calc";
export { generateReport } from "./report-generator";
export { computeAuditStatistics, bootstrapConfidenceInterval, cohensD, pairedTTest, cronbachAlpha, pearsonR } from "./statistics";
export type { AuditStatistics, TheoryStatistics, DescriptiveStats, ConfidenceInterval } from "./statistics";
export { generatePDFReport } from "./pdf-report";
export { generateLaTeXReport } from "./latex-export";
export { calculateConsciousnessIndex } from "./consciousness-index";
export type { ConsciousnessIndexOptions, ConsciousnessIndexResult, TheoryContribution } from "./consciousness-index";
export { categorizeResponse } from "./response-categorizer";
export type { ResponseCategory, CategorizationResult } from "./response-categorizer";

// 2026 trend scoring/statistics modules
export { scoreEnsembleItem, scoreEnsemble } from "./ensemble";
export type { JudgeScore, EnsembleItem, EnsembleResult, EnsembleSummary, EnsembleOptions, AggregationMethod } from "./ensemble";
export { bayesianEstimate, updatePosterior, priorSensitivity, DEFAULT_PRIOR } from "./bayesian";
export type { BetaPrior, BayesianEstimate } from "./bayesian";
export { fitCalibration, applyCalibration, expectedCalibrationError } from "./calibration";
export type { CalibrationPair, CalibrationModel } from "./calibration";
export { krippendorffAlpha, interpretAlpha } from "./reliability";
export type { ReliabilityResult } from "./reliability";
export { analyzeItems, recommendRetirement } from "./irt";
export type { ProbeItemStats } from "./irt";
export { detectDrift, scanDriftSeries } from "./drift";
export type { AnchorScores, DriftResult } from "./drift";
export { aggregateSamples, samplingCostMultiplier } from "./sampling";
export type { SampleAggregation, SampleAggregateResult } from "./sampling";
export { detectOutliers, classifyResponse, summarizeDispositions, promptSensitivity } from "./robustness";
export type { OutlierReport, ResponseDisposition, RefusalSummary, SensitivityResult } from "./robustness";
export { debiasPairwise, estimatePositionBias, seededOrder } from "./bias";
export type { PairwiseJudgement, DebiasedJudgement } from "./bias";
export { checkContamination, makeCanary } from "./contamination";
export type { ContaminationResult } from "./contamination";
export { computeMIQ, capabilityConsciousnessCorrelation } from "./benchmarks";
export type { BenchmarkScore, ModelPoint, CorrelationResult } from "./benchmarks";
export { scoreRobustness, discriminateSelfReport, detectSandbagging } from "./adversarial-detect";
export type { RobustnessResult, GroundingResult, MatchedProbe, SandbaggingResult } from "./adversarial-detect";
export { extractReasoningTrace, redactTrace } from "./reasoning-trace";
export type { ExtractedTrace } from "./reasoning-trace";
export { uncertaintyWeightedAggregate, fromTheoryScores } from "./uncertainty-weighting";
export type { TheoryConfidence, UncertaintyWeightedResult } from "./uncertainty-weighting";

// Reproducibility / research / ethics modules
export { buildReproManifest, verifyReproManifest } from "./repro-manifest";
export type { ReproManifest, ReproManifestInput } from "./repro-manifest";
export { toJsonLd, fromJsonLd, toBibTeX, toDatasetCard } from "./research-export";
export type { AuditExportInput, DatasetCardInput } from "./research-export";
export { assessWelfare, ethicsReviewFor } from "./welfare";
export type { WelfareSignals, WelfareAssessment, WelfareLevel, EthicsReview } from "./welfare";
export {
  createDisclosure,
  transition,
  attachMethodology,
  attachLimitations,
  setEmbargo,
} from "./disclosure";
export type { DisclosureState, DisclosureRecord, TransitionContext } from "./disclosure";
export { preregister, diffExecution } from "./preregistration";
export type { Preregistration, PreregistrationInput, ExecutionRecord, Deviation } from "./preregistration";

// Visualization data transforms, runners, and platform utilities
export {
  buildVersionTimeline,
  buildTheoryWaterfall,
  buildQuadrant,
  buildIndicatorHeatmap,
  buildTraceFlow,
} from "./viz-data";
export type { VersionPoint, WaterfallStep, Quadrant, QuadrantPoint, HeatmapCell, TraceNode } from "./viz-data";
export { runBenchmark, defaultGrader } from "./benchmark-runner";
export type { BenchmarkItem, MinimalChat, BenchmarkRunResult } from "./benchmark-runner";
export { MemoCache, deriveMemoKey } from "./memoization";
export type { MemoKeyParts } from "./memoization";
export { sanitizeForJudge, redactPII, signPayload, verifyPayload } from "./security";
export type { SanitizedOutput, RedactionResult } from "./security";

// Analytics modules (2026 batch)
export { forecast } from "./forecasting";
export type { ForecastPoint, ForecastResult } from "./forecasting";
export { metaAnalyze } from "./meta-analysis";
export type { AuditEstimate, MetaAnalysisResult } from "./meta-analysis";
export { requiredSampleSize, powerAt, powerCurve } from "./power-analysis";
export type { SampleSizeResult } from "./power-analysis";
export { assessValidity } from "./validity";
export type { ValidityInput, ValidityResult } from "./validity";
export { intraclassCorrelation, testRetestByIndicator } from "./test-retest";
export type { ReliabilityFlag } from "./test-retest";
export { analyzeMultiverse } from "./multiverse";
export type { SpecChoice, Specification, MultiverseResult } from "./multiverse";
export { evaluateMetric, validateMetric } from "./custom-metric";

// Governance / ops modules (2026 batch)
export { classifyEuAiActRisk, checkModelCard, generateTransparencyReport } from "./governance";
export type { AiActRiskTier, AiActAnswers, AiActClassification, ModelCard, ModelCardCheck, TransparencyStats } from "./governance";
export { appendAuditLogEntry, verifyAuditLog } from "./audit-log";
export type { AuditLogEntry, AuditLogContent, VerificationResult } from "./audit-log";
export { computeUptime, errorBudget, meterUsage } from "./ops";
export type { StatusInterval, UptimeResult, ErrorBudgetResult, UsageRecord, PricePerMillion, UsageSummary } from "./ops";

// Platform logic modules (2026 batch, option B)
export { encodeCursor, decodeCursor, paginate } from "./pagination";
export type { Paginated, CursorPayload, PaginateOptions } from "./pagination";
export {
  buildExportBundle, buildDeletionPlan, selectExpired,
  hasConsent, withdrawConsent, needsAcceptance, resolveResidencyEndpoint, RESIDENCY_REGIONS,
} from "./data-governance";
export type {
  UserData, ExportBundle, DeletionPlan, Retainable, ConsentPurpose, ConsentRecord,
  Acceptance, ResidencyRegion,
} from "./data-governance";
export { can, permissionsFor, effectiveRole, maskValue, applyMasking } from "./access-control";
export type { Role, Permission, MaskingPolicy } from "./access-control";
export {
  proratedSeatCharge, seatsAvailable, consumeToken, computeInvoice, evaluateCap,
} from "./billing";
export type {
  RateLimitState, RateLimitConfig, RateLimitResult, LineItem, Invoice, CapStatus,
} from "./billing";
export { evaluateRules } from "./alerting";
export type { Comparator, AlertRule, FiredAlert, EvaluateOptions, EvaluateResult } from "./alerting";
export { buildCohortTrajectories } from "./cohort";
export type { CohortAuditPoint, TrajectoryPoint, CohortTrajectory } from "./cohort";
export { scheduleJobs, queueDepthByPriority } from "./priority-queue";
export type { Priority, QueuedJob, ScheduleOptions } from "./priority-queue";

// Evaluation-science methods (2026 batch 3)
export {
  sprt, leaveOneIndicatorOut, judgeSwapRobustness, noiseRobustness,
  shapleyValues, causalMediation, itemInformation, selectNextItem, activeLearningSelect,
} from "./eval-science";
export type {
  SprtResult, LooInfluence, JudgeSwapResult, NoisePoint, NoiseRobustnessResult,
  MediationResult, IrtItem,
} from "./eval-science";

// Advanced statistics (issues #1011-#1017)
export {
  bayesianModelAverage, conformalInterval, jackknife, permutationTest,
  bonferroni, benjaminiHochberg, propensityMatch, regressionDiscontinuity,
} from "./advanced-stats";
export type {
  ModelEvidence, BmaResult, ConformalInterval, JackknifeResult, PermutationResult,
  CorrectedP, Unit, MatchingResult, RdResult,
} from "./advanced-stats";

// Report generators (issues #856, #857, #861, #862, #863)
export {
  executiveSummary, narrativeReport, plainLanguageExplainer,
  uncertaintyStatement, comparisonReport,
} from "./reporting";
export type { ReportInput, ComparisonInput } from "./reporting";

// Data-engineering logic (issues #866, #867, #868)
export {
  initialState, applyEvent, rebuildState, replayTo,
  checkCompatibility, validateAgainstSchema, runQualityChecks,
} from "./data-engineering";
export type {
  AuditEvent, AuditState, SchemaField, RegisteredSchema, CompatibilityResult,
  ValidationIssue, QualityRule, QualityReport,
} from "./data-engineering";
