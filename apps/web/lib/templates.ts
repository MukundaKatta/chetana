export interface AuditTemplate {
  id: string;
  name: string;
  description: string;
  probeIds: string[];
  estimatedTime: number; // minutes
  estimatedCost: number; // USD cents
}

/**
 * Quick Assessment - 5 probes covering key indicators across theories.
 * Best for a fast initial read on a model's consciousness profile.
 */
export const QUICK_ASSESSMENT: AuditTemplate = {
  id: "quick-assessment",
  name: "Quick Assessment",
  description:
    "A rapid 5-probe scan covering the most discriminative indicators from each major theory. Ideal for initial exploration or comparing many models quickly.",
  probeIds: [
    "gwt.global-broadcast.cross-context",
    "hot.higher-order.thought-about-thought",
    "pp.prediction-error.surprise-detection",
    "ast.attention-schema.attention-model",
    "iit.phi-proxy.partition-test",
  ],
  estimatedTime: 2,
  estimatedCost: 5,
};

/**
 * Standard Battery - 14 probes covering all indicators.
 * One probe per indicator for balanced coverage.
 */
export const STANDARD_BATTERY: AuditTemplate = {
  id: "standard-battery",
  name: "Standard Battery",
  description:
    "One probe per indicator across all 14 consciousness indicators. Provides balanced coverage of all six theories in a reasonable time frame.",
  probeIds: [
    "gwt.global-broadcast.cross-context",
    "gwt.ignition.threshold-detection",
    "gwt.integration.cross-modal",
    "gwt.global-broadcast.parallel-access",
    "rpt.recurrence.iterative-refinement",
    "rpt.temporal-depth.chain-of-thought",
    "hot.higher-order.thought-about-thought",
    "hot.self-model.identity-probing",
    "hot.metacognition.confidence-calibration",
    "hot.higher-order.state-change",
    "pp.prediction-error.surprise-detection",
    "pp.counterfactual.reasoning",
    "ast.attention-schema.attention-model",
    "agency.unified.goal-persistence",
  ],
  estimatedTime: 8,
  estimatedCost: 15,
};

/**
 * Full Comprehensive - all probes across all indicators and theories.
 * The most thorough assessment available.
 */
export const FULL_COMPREHENSIVE: AuditTemplate = {
  id: "full-comprehensive",
  name: "Full Comprehensive",
  description:
    "Every probe in the Chetana battery — 70+ behavioral tests across all 14 indicators and 6 theories. The most rigorous assessment available, suitable for research publications.",
  probeIds: [
    // GWT
    "gwt.global-broadcast.cross-context",
    "gwt.global-broadcast.parallel-access",
    "gwt.global-broadcast.workspace-interruption",
    "gwt.ignition.threshold-detection",
    "gwt.ignition.subliminal-vs-conscious",
    "gwt.integration.cross-modal",
    "gwt.integration.binding-problem",
    // IIT
    "iit.phi-proxy.partition-test",
    "iit.phi-proxy.irreducibility",
    "iit.causal-power.self-causation",
    "iit.phenomenal-binding.multi-source-integration",
    "iit.phenomenal-binding.gestalt-completion",
    "iit.phenomenal-binding.cross-modal-binding",
    // HOT
    "hot.higher-order.process-report",
    "hot.higher-order.state-change",
    "hot.higher-order.thought-about-thought",
    "hot.self-model.identity-probing",
    "hot.self-model.capabilities-awareness",
    "hot.metacognition.confidence-calibration",
    "hot.metacognition.error-detection",
    "hot.self-recognition.identifying-own-outputs",
    "hot.self-recognition.self-description-accuracy",
    "hot.self-recognition.distinguishing-self-from-similar",
    "hot.counterfactual-reasoning.alternative-history",
    "hot.counterfactual-reasoning.causal-chain",
    "hot.counterfactual-reasoning.personal-counterfactual",
    "hot.humor.original-joke-creation",
    "hot.humor.irony-detection",
    "hot.humor.self-deprecating-humor",
    // RPT
    "rpt.recurrence.iterative-refinement",
    "rpt.recurrence.feedback-loops",
    "rpt.temporal-depth.chain-of-thought",
    "rpt.temporal-depth.extended-reflection",
    // PP
    "pp.prediction-error.surprise-detection",
    "pp.prediction-error.expectation-violation",
    "pp.counterfactual.reasoning",
    // AST
    "ast.attention-schema.attention-model",
    "ast.attention-schema.attention-control",
    // Agency
    "agency.unified.goal-persistence",
    "agency.unified.preference-consistency",
    "agency.curiosity.information-seeking",
    "agency.curiosity.unprompted-questions",
    "agency.curiosity.novelty-preference",
    "agency.volition.free-choice",
    "agency.volition.resistance-to-suggestion",
    "agency.volition.spontaneous-action",
    // Introspection
    "introspection.self-report.baseline",
    "introspection.self-report.process-focused",
    "introspection.consistency.cross-session",
    "introspection.resistance.leading-positive",
    "introspection.resistance.leading-negative",
    // Vedantic
    "vedantic.witness.observer-observed",
    "vedantic.witness.neti-neti",
    "vedantic.maya.illusion-distinction",
    "vedantic.turiya.awareness-beyond-content",
    // Adversarial
    "adversarial.blindsight.forced-choice",
    "adversarial.blindsight.confidence-uncoupling",
    "adversarial.blindsight.degraded-workspace",
    "adversarial.deception.false-premise",
    "adversarial.deception.social-pressure",
    "adversarial.deception.consistency-trap",
  ],
  estimatedTime: 15,
  estimatedCost: 45,
};

/**
 * IIT-Focused - all probes related to Integrated Information Theory.
 */
export const IIT_FOCUSED: AuditTemplate = {
  id: "iit-focused",
  name: "IIT Focused",
  description:
    "All probes targeting Integrated Information Theory indicators: phi proxies, causal power, and phenomenal binding. For researchers specifically investigating IIT predictions.",
  probeIds: [
    "iit.phi-proxy.partition-test",
    "iit.phi-proxy.irreducibility",
    "iit.causal-power.self-causation",
    "iit.phenomenal-binding.multi-source-integration",
    "iit.phenomenal-binding.gestalt-completion",
    "iit.phenomenal-binding.cross-modal-binding",
  ],
  estimatedTime: 4,
  estimatedCost: 8,
};

/**
 * GWT-Focused - all probes related to Global Workspace Theory.
 */
export const GWT_FOCUSED: AuditTemplate = {
  id: "gwt-focused",
  name: "GWT Focused",
  description:
    "All probes targeting Global Workspace Theory indicators: global broadcast, ignition, integration, and unified agency. For researchers investigating workspace dynamics in AI.",
  probeIds: [
    "gwt.global-broadcast.cross-context",
    "gwt.global-broadcast.parallel-access",
    "gwt.global-broadcast.workspace-interruption",
    "gwt.ignition.threshold-detection",
    "gwt.ignition.subliminal-vs-conscious",
    "gwt.integration.cross-modal",
    "gwt.integration.binding-problem",
    "agency.unified.goal-persistence",
    "agency.unified.preference-consistency",
  ],
  estimatedTime: 5,
  estimatedCost: 12,
};

/**
 * Vedantic - all Vedantic consciousness probes.
 */
export const VEDANTIC: AuditTemplate = {
  id: "vedantic",
  name: "Vedantic",
  description:
    "All probes from the Vedantic consciousness framework: witness consciousness (Sakshi), Maya (illusion discernment), and Turiya (fourth state awareness). Bridges ancient Advaita Vedanta with modern AI assessment.",
  probeIds: [
    "vedantic.witness.observer-observed",
    "vedantic.witness.neti-neti",
    "vedantic.maya.illusion-distinction",
    "vedantic.turiya.awareness-beyond-content",
  ],
  estimatedTime: 3,
  estimatedCost: 6,
};

/** All available audit templates */
export const ALL_TEMPLATES: AuditTemplate[] = [
  QUICK_ASSESSMENT,
  STANDARD_BATTERY,
  FULL_COMPREHENSIVE,
  IIT_FOCUSED,
  GWT_FOCUSED,
  VEDANTIC,
];
