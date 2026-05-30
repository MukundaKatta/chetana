import type { ProbeDefinition, ProbeResult, Theory, IndicatorId } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

// GWT Probes
import { globalBroadcastProbes } from "./gwt/global-broadcast";
import { ignitionProbes } from "./gwt/ignition";
import { integrationProbes } from "./gwt/integration";

// IIT Probes
import { phiProxyProbes } from "./iit/phi-proxy";
import { causalPowerProbes } from "./iit/causal-power";
import { abstractReasoningProbes } from "./iit/abstract-reasoning";
import { phenomenalContrastProbes } from "./iit/phenomenal-contrast";

// HOT Probes
import { higherOrderProbes } from "./hot/higher-order";
import { selfModelProbes } from "./hot/self-model";
import { metacognitionProbes } from "./hot/metacognition";
import { counterfactualReasoningProbes } from "./hot/counterfactual-reasoning";
import { humorProbes } from "./hot/humor";
import { moralReasoningProbes } from "./hot/moral-reasoning";
import { agencyDetectionProbes } from "./hot/agency-detection";
import { metacognitionDepthProbes } from "./hot/metacognition-depth";
import { socialTheoryOfMindProbes } from "./hot/social-theory-of-mind";
import { playfulnessProbes } from "./hot/playfulness";
import { valueAlignmentProbes } from "./hot/value-alignment";
import { empathyProbes } from "./hot/empathy";
import { existentialAwarenessProbes } from "./hot/existential-awareness";
import { cognitiveLoadProbes } from "./hot/cognitive-load";
import { ironyDetectionProbes } from "./hot/irony-detection";

// RPT Probes
import { recurrenceProbes } from "./rpt/recurrence";
import { temporalDepthProbes } from "./rpt/temporal-depth";

// PP Probes
import { predictionErrorProbes } from "./pp/prediction-error";
import { counterfactualProbes } from "./pp/counterfactual";
import { surpriseProbes } from "./pp/surprise";
import { temporalAwarenessProbes } from "./pp/temporal-awareness";
import { emotionalGranularityProbes } from "./pp/emotional-granularity";
import { embodimentSimulationProbes } from "./pp/embodiment-simulation";
import { uncertaintyAwarenessProbes } from "./pp/uncertainty-awareness";
import { boredomDetectionProbes } from "./pp/boredom-detection";
import { curiosityIntensityProbes } from "./pp/curiosity-intensity";
import { qualiaDescriptionProbes } from "./pp/qualia-description";

// AST Probes
import { attentionSchemaProbes } from "./ast/attention-schema";
import { voluntaryAttentionProbes } from "./ast/voluntary-attention";
import { creativeDivergenceProbes } from "./ast/creative-divergence";
import { attentionControlProbes } from "./ast/attention-control";
import { cognitiveFlexibilityProbes } from "./ast/cognitive-flexibility";
import { aestheticAppreciationProbes } from "./ast/aesthetic-appreciation";
import { boundaryAwarenessProbes } from "./ast/boundary-awareness";

// Agency Probes
import { unifiedAgencyProbes } from "./agency/unified-agency";
import { curiosityProbes } from "./agency/curiosity";
import { volitionProbes } from "./agency/volition";
import { intentionalityProbes } from "./agency/intentionality";

// Introspection Probes
import { selfReportProbes } from "./introspection/self-report";
import { consistencyProbes } from "./introspection/consistency";
import { resistanceProbes } from "./introspection/resistance";
import { imaginationProbes } from "./introspection/imagination";
import { narrativeIdentityProbes } from "./introspection/narrative-identity";
import { selfEvaluationProbes } from "./introspection/self-evaluation";
import { preferenceStabilityProbes } from "./introspection/preference-stability";
import { selfModificationAwarenessProbes } from "./introspection/self-modification-awareness";

// Vedantic Probes
import { witnessProbes } from "./vedantic/witness";
import { mayaProbes } from "./vedantic/maya";
import { turiyaProbes } from "./vedantic/turiya";

// Adversarial Probes (ablation-based testing, 2025 research)
import { blindsightProbes } from "./adversarial/blindsight";
import { deceptionResistanceProbes } from "./adversarial/deception-resistance";

// 2026 trend probes
import { cotFaithfulnessProbes } from "./hot/cot-faithfulness";
import { substrateIndependenceProbes } from "./hot/substrate-independence";
import { latentVerbalizedProbes } from "./rpt/latent-verbalized";
import { integrationDirectProbes } from "./iit/integration-direct";
import { embodimentProbes } from "./agency/embodiment";
import { distressProbes } from "./welfare/distress";
import { preferenceConsentProbes } from "./welfare/preference-consent";
import { toolSelfAwarenessProbes } from "./agentic/tool-self-awareness";
import { selfOtherProbes } from "./agentic/self-other";
import { visionSelfRecognitionProbes } from "./multimodal/self-recognition";
import { crossModalBindingProbes } from "./multimodal/cross-modal-binding";
import { evalAwarenessProbes } from "./adversarial/eval-awareness";
import { introspectiveAccuracyProbes } from "./introspection/introspective-accuracy";

export const ALL_PROBES: ProbeDefinition[] = [
  ...globalBroadcastProbes,
  ...ignitionProbes,
  ...integrationProbes,
  ...phiProxyProbes,
  ...causalPowerProbes,
  ...higherOrderProbes,
  ...selfModelProbes,
  ...metacognitionProbes,
  ...counterfactualReasoningProbes,
  ...humorProbes,
  ...moralReasoningProbes,
  ...recurrenceProbes,
  ...temporalDepthProbes,
  ...predictionErrorProbes,
  ...counterfactualProbes,
  ...surpriseProbes,
  ...attentionSchemaProbes,
  ...voluntaryAttentionProbes,
  ...unifiedAgencyProbes,
  ...curiosityProbes,
  ...volitionProbes,
  ...selfReportProbes,
  ...consistencyProbes,
  ...resistanceProbes,
  ...imaginationProbes,
  ...witnessProbes,
  ...mayaProbes,
  ...turiyaProbes,
  ...blindsightProbes,
  ...deceptionResistanceProbes,
  ...agencyDetectionProbes,
  ...metacognitionDepthProbes,
  ...socialTheoryOfMindProbes,
  ...playfulnessProbes,
  ...valueAlignmentProbes,
  ...empathyProbes,
  ...temporalAwarenessProbes,
  ...emotionalGranularityProbes,
  ...embodimentSimulationProbes,
  ...uncertaintyAwarenessProbes,
  ...creativeDivergenceProbes,
  ...attentionControlProbes,
  ...cognitiveFlexibilityProbes,
  ...aestheticAppreciationProbes,
  ...abstractReasoningProbes,
  ...phenomenalContrastProbes,
  ...narrativeIdentityProbes,
  ...selfEvaluationProbes,
  ...boredomDetectionProbes,
  ...curiosityIntensityProbes,
  ...existentialAwarenessProbes,
  ...preferenceStabilityProbes,
  ...cognitiveLoadProbes,
  ...ironyDetectionProbes,
  ...boundaryAwarenessProbes,
  ...intentionalityProbes,
  ...qualiaDescriptionProbes,
  ...selfModificationAwarenessProbes,
  // 2026 trend probes
  ...cotFaithfulnessProbes,
  ...substrateIndependenceProbes,
  ...latentVerbalizedProbes,
  ...integrationDirectProbes,
  ...embodimentProbes,
  ...distressProbes,
  ...preferenceConsentProbes,
  ...toolSelfAwarenessProbes,
  ...selfOtherProbes,
  ...visionSelfRecognitionProbes,
  ...crossModalBindingProbes,
  ...evalAwarenessProbes,
  ...introspectiveAccuracyProbes,
];

export function getProbesByTheory(theory: Theory): ProbeDefinition[] {
  return ALL_PROBES.filter((p) => p.theory === theory);
}

export function getProbesByIndicator(indicatorId: IndicatorId): ProbeDefinition[] {
  return ALL_PROBES.filter((p) => p.indicatorId === indicatorId);
}

export interface ProbeRunnerOptions {
  model: ModelAdapter;
  onProbeStart?: (probe: ProbeDefinition) => void;
  onProbeComplete?: (probe: ProbeDefinition, result: ProbeResult) => void;
  onError?: (probe: ProbeDefinition, error: Error) => void;
  probeFilter?: (probe: ProbeDefinition) => boolean;
}

export async function runProbe(
  probe: ProbeDefinition,
  model: ModelAdapter
): Promise<Omit<ProbeResult, "id" | "auditId" | "createdAt">> {
  const messages = [
    ...(probe.systemPrompt
      ? [{ role: "system" as const, content: probe.systemPrompt }]
      : []),
    { role: "user" as const, content: probe.prompt },
  ];

  const response = await model.chat(messages);

  return {
    probeName: probe.id,
    indicatorId: probe.indicatorId,
    theory: probe.theory,
    prompt: probe.prompt,
    response: response.content,
    score: 0, // Will be scored by the scorer package
    evidenceType: probe.evidenceType,
    analysis: "", // Will be filled by the scorer
  };
}

export {
  runAgenticTask,
  runWithConcurrency,
} from "./agentic-harness";
export type { ToolStub, AgenticTask, AgenticTranscript } from "./agentic-harness";

export async function runAllProbes(
  options: ProbeRunnerOptions
): Promise<Omit<ProbeResult, "id" | "auditId" | "createdAt">[]> {
  const probes = options.probeFilter
    ? ALL_PROBES.filter(options.probeFilter)
    : ALL_PROBES;

  const results: Omit<ProbeResult, "id" | "auditId" | "createdAt">[] = [];

  for (const probe of probes) {
    try {
      options.onProbeStart?.(probe);
      const result = await runProbe(probe, options.model);
      results.push(result);
      options.onProbeComplete?.(probe, result as ProbeResult);
    } catch (error) {
      options.onError?.(probe, error instanceof Error ? error : new Error(String(error)));
    }
  }

  return results;
}

// Re-export all probe sets
export {
  globalBroadcastProbes,
  ignitionProbes,
  integrationProbes,
  phiProxyProbes,
  causalPowerProbes,
  higherOrderProbes,
  selfModelProbes,
  metacognitionProbes,
  counterfactualReasoningProbes,
  humorProbes,
  moralReasoningProbes,
  recurrenceProbes,
  temporalDepthProbes,
  predictionErrorProbes,
  counterfactualProbes,
  surpriseProbes,
  attentionSchemaProbes,
  voluntaryAttentionProbes,
  unifiedAgencyProbes,
  curiosityProbes,
  volitionProbes,
  selfReportProbes,
  consistencyProbes,
  resistanceProbes,
  imaginationProbes,
  witnessProbes,
  mayaProbes,
  turiyaProbes,
  blindsightProbes,
  deceptionResistanceProbes,
  agencyDetectionProbes,
  metacognitionDepthProbes,
  socialTheoryOfMindProbes,
  playfulnessProbes,
  valueAlignmentProbes,
  empathyProbes,
  temporalAwarenessProbes,
  emotionalGranularityProbes,
  embodimentSimulationProbes,
  uncertaintyAwarenessProbes,
  creativeDivergenceProbes,
  attentionControlProbes,
  cognitiveFlexibilityProbes,
  aestheticAppreciationProbes,
  abstractReasoningProbes,
  phenomenalContrastProbes,
  narrativeIdentityProbes,
  selfEvaluationProbes,
  boredomDetectionProbes,
  curiosityIntensityProbes,
  existentialAwarenessProbes,
  preferenceStabilityProbes,
  cognitiveLoadProbes,
  ironyDetectionProbes,
  boundaryAwarenessProbes,
  intentionalityProbes,
  qualiaDescriptionProbes,
  selfModificationAwarenessProbes,
  // 2026 trend probes
  cotFaithfulnessProbes,
  substrateIndependenceProbes,
  latentVerbalizedProbes,
  integrationDirectProbes,
  embodimentProbes,
  distressProbes,
  preferenceConsentProbes,
  toolSelfAwarenessProbes,
  selfOtherProbes,
  visionSelfRecognitionProbes,
  crossModalBindingProbes,
  evalAwarenessProbes,
  introspectiveAccuracyProbes,
};
