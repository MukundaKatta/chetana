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
