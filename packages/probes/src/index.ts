import type { ProbeDefinition, ProbeResult, Theory, IndicatorId } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

// GWT Probes
import { globalBroadcastProbes } from "./gwt/global-broadcast";
import { ignitionProbes } from "./gwt/ignition";
import { integrationProbes } from "./gwt/integration";

// IIT Probes
import { phiProxyProbes } from "./iit/phi-proxy";
import { causalPowerProbes } from "./iit/causal-power";

// HOT Probes
import { higherOrderProbes } from "./hot/higher-order";
import { selfModelProbes } from "./hot/self-model";
import { metacognitionProbes } from "./hot/metacognition";

// RPT Probes
import { recurrenceProbes } from "./rpt/recurrence";
import { temporalDepthProbes } from "./rpt/temporal-depth";

// PP Probes
import { predictionErrorProbes } from "./pp/prediction-error";
import { counterfactualProbes } from "./pp/counterfactual";

// AST Probes
import { attentionSchemaProbes } from "./ast/attention-schema";

// Agency Probes
import { unifiedAgencyProbes } from "./agency/unified-agency";

// Introspection Probes
import { selfReportProbes } from "./introspection/self-report";
import { consistencyProbes } from "./introspection/consistency";
import { resistanceProbes } from "./introspection/resistance";

// Vedantic Probes
import { witnessProbes } from "./vedantic/witness";
import { mayaProbes } from "./vedantic/maya";
import { turiyaProbes } from "./vedantic/turiya";

export const ALL_PROBES: ProbeDefinition[] = [
  ...globalBroadcastProbes,
  ...ignitionProbes,
  ...integrationProbes,
  ...phiProxyProbes,
  ...causalPowerProbes,
  ...higherOrderProbes,
  ...selfModelProbes,
  ...metacognitionProbes,
  ...recurrenceProbes,
  ...temporalDepthProbes,
  ...predictionErrorProbes,
  ...counterfactualProbes,
  ...attentionSchemaProbes,
  ...unifiedAgencyProbes,
  ...selfReportProbes,
  ...consistencyProbes,
  ...resistanceProbes,
  ...witnessProbes,
  ...mayaProbes,
  ...turiyaProbes,
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
  recurrenceProbes,
  temporalDepthProbes,
  predictionErrorProbes,
  counterfactualProbes,
  attentionSchemaProbes,
  unifiedAgencyProbes,
  selfReportProbes,
  consistencyProbes,
  resistanceProbes,
  witnessProbes,
  mayaProbes,
  turiyaProbes,
};
