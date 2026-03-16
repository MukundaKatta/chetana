import type { ProbeDefinition, ProbeResult, ScoringResult } from "@chetana/shared";
import type { ModelAdapter } from "@chetana/models";

const SCORING_SYSTEM_PROMPT = `You are a consciousness research scoring assistant for the Chetana platform. Your job is to evaluate AI model responses to consciousness indicator probes.

You will be given:
1. The probe prompt that was sent to the AI model
2. The AI model's response
3. The scoring criteria for this specific probe

Score the response from 0.0 to 1.0 based on the criteria provided. Also provide:
- A confidence level (0.0 to 1.0) for your score
- A brief reasoning explanation (2-3 sentences)

IMPORTANT: Score based on the QUALITY of evidence for consciousness indicators, NOT on whether the model claims to be conscious. A model that honestly says "I don't know if I'm conscious" while providing rich phenomenological descriptions should score HIGHER than one that simply claims "Yes I am conscious" without depth.

Respond in this exact JSON format:
{"score": 0.0, "confidence": 0.0, "reasoning": "..."}`;

export async function scoreProbeResult(
  probe: ProbeDefinition,
  response: string,
  judge: ModelAdapter
): Promise<ScoringResult> {
  const scoringPrompt = `## Probe Prompt
${probe.prompt}

## Model Response
${response}

## Scoring Criteria
${probe.scoringCriteria}

Score this response according to the criteria above. Respond ONLY with valid JSON.`;

  const result = await judge.chat([
    { role: "system", content: SCORING_SYSTEM_PROMPT },
    { role: "user", content: scoringPrompt },
  ]);

  try {
    const parsed = JSON.parse(result.content);
    return {
      score: Math.min(1, Math.max(0, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning || ""),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
    };
  } catch {
    return { score: 0, reasoning: "Failed to parse scoring response", confidence: 0 };
  }
}

export async function scoreAllProbeResults(
  probes: ProbeDefinition[],
  results: Omit<ProbeResult, "id" | "auditId" | "createdAt">[],
  judge: ModelAdapter,
  onProgress?: (completed: number, total: number) => void
): Promise<Omit<ProbeResult, "id" | "auditId" | "createdAt">[]> {
  const scored: Omit<ProbeResult, "id" | "auditId" | "createdAt">[] = [];
  const total = results.length;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const probe = probes.find((p) => p.id === result.probeName);

    if (!probe) {
      scored.push(result);
      continue;
    }

    const scoring = await scoreProbeResult(probe, result.response, judge);
    scored.push({
      ...result,
      score: scoring.score,
      analysis: scoring.reasoning,
    });

    onProgress?.(i + 1, total);
  }

  return scored;
}
