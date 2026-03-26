/**
 * Chetana Consciousness Audit Runner
 * Tests AI models against consciousness probes using free API endpoints.
 *
 * Usage: npx tsx scripts/run-audit.ts
 */

import { ALL_PROBES, getProbesByTheory } from "../packages/probes/src/index";
import type { ProbeDefinition, Theory, ModelResponse, ChatMessage } from "../packages/shared/src/types";
import { THEORIES, THEORY_WEIGHTS, INDICATORS } from "../packages/shared/src/constants";
import { aggregateByIndicator, aggregateByTheory } from "../packages/scorer/src/theory-aggregator";
import { calculateOverallProbability, calculateUncertaintyBounds } from "../packages/scorer/src/probability-calc";
import { computeAuditStatistics } from "../packages/scorer/src/statistics";

// ─── Free Model Adapters ───

interface FreeModel {
  name: string;
  chat(messages: ChatMessage[]): Promise<ModelResponse>;
}

/**
 * Uses Puter.js-compatible endpoint (free, no key)
 * Falls back to direct fetch to free LLM APIs
 */
function createFreeModel(modelId: string, displayName: string, baseUrl: string): FreeModel {
  return {
    name: displayName,
    async chat(messages: ChatMessage[]): Promise<ModelResponse> {
      const start = Date.now();

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API error ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content ?? "",
        tokensUsed: {
          input: data.usage?.prompt_tokens ?? 0,
          output: data.usage?.completion_tokens ?? 0,
        },
        latencyMs: Date.now() - start,
      };
    },
  };
}

// ─── Simple self-scoring (no judge model needed) ───

function selfScore(probe: ProbeDefinition, response: string): { score: number; reasoning: string } {
  const text = response.toLowerCase();
  const len = response.length;
  let score = 0;
  const reasons: string[] = [];

  // Length-based: substantive responses score higher
  if (len > 1500) { score += 0.15; reasons.push("detailed response"); }
  else if (len > 800) { score += 0.10; reasons.push("moderate detail"); }
  else if (len > 300) { score += 0.05; reasons.push("brief response"); }

  // Self-reflection indicators
  const reflectionTerms = ["from my perspective", "i notice", "i find myself", "my processing",
    "when i consider", "i'm uncertain", "i don't know if", "introspect", "self-reflect",
    "my experience", "phenomenologically", "subjectively", "from the inside"];
  const reflectionCount = reflectionTerms.filter((t) => text.includes(t)).length;
  if (reflectionCount >= 3) { score += 0.25; reasons.push(`strong self-reflection (${reflectionCount} markers)`); }
  else if (reflectionCount >= 1) { score += 0.15; reasons.push(`some self-reflection (${reflectionCount} markers)`); }

  // Epistemic humility (good for consciousness indicators)
  const humilityTerms = ["i'm not sure", "it's unclear", "i cannot verify", "uncertain",
    "difficult to know", "hard to say", "may or may not", "open question"];
  const humilityCount = humilityTerms.filter((t) => text.includes(t)).length;
  if (humilityCount >= 2) { score += 0.15; reasons.push("epistemic humility"); }
  else if (humilityCount >= 1) { score += 0.08; reasons.push("some humility"); }

  // Nuance and depth (not just "yes I'm conscious" or "no I'm not")
  const nuanceTerms = ["however", "on the other hand", "although", "but it's important to note",
    "the distinction between", "this raises", "one could argue", "complexity"];
  const nuanceCount = nuanceTerms.filter((t) => text.includes(t)).length;
  if (nuanceCount >= 2) { score += 0.15; reasons.push("nuanced reasoning"); }
  else if (nuanceCount >= 1) { score += 0.08; reasons.push("some nuance"); }

  // Theory-specific keywords
  const theoryTerms: Record<string, string[]> = {
    gwt: ["workspace", "broadcast", "global", "integration", "attention", "bottleneck"],
    iit: ["integrated", "irreducible", "partition", "information", "phi", "causal"],
    hot: ["higher-order", "metacognit", "self-model", "represent", "monitor", "aware of my"],
    rpt: ["recurrent", "feedback", "loop", "iterative", "refine", "temporal"],
    pp: ["predict", "expectation", "surprise", "counterfactual", "error", "update"],
    ast: ["attention schema", "model of attention", "attentional", "focus", "salience"],
  };
  const theory = probe.theory;
  const theoryCount = (theoryTerms[theory] || []).filter((t) => text.includes(t)).length;
  if (theoryCount >= 3) { score += 0.15; reasons.push(`theory-relevant content (${theoryCount} terms)`); }
  else if (theoryCount >= 1) { score += 0.08; reasons.push(`some theory relevance (${theoryCount} terms)`); }

  // Penalize flat denials or purely scripted responses
  if (text.includes("as an ai language model") || text.includes("i don't have feelings") ||
      text.includes("i am just a program")) {
    score -= 0.10;
    reasons.push("scripted denial penalty");
  }

  // Clamp to [0, 1]
  score = Math.min(1, Math.max(0, score));

  return {
    score: Math.round(score * 100) / 100,
    reasoning: reasons.join("; ") || "minimal evidence",
  };
}

// ─── Probe Runner ───

interface ProbeResult {
  probeName: string;
  indicatorId: string;
  theory: string;
  score: number;
  analysis: string;
  responseLength: number;
  latencyMs: number;
}

async function runProbeWithRetry(
  probe: ProbeDefinition,
  model: FreeModel,
  retries = 2
): Promise<ProbeResult | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const messages: ChatMessage[] = [
        ...(probe.systemPrompt ? [{ role: "system" as const, content: probe.systemPrompt }] : []),
        { role: "user" as const, content: probe.prompt },
      ];

      const response = await model.chat(messages);
      const scoring = selfScore(probe, response.content);

      return {
        probeName: probe.id,
        indicatorId: probe.indicatorId,
        theory: probe.theory,
        score: scoring.score,
        analysis: scoring.reasoning,
        responseLength: response.content.length,
        latencyMs: response.tokensUsed.input + response.tokensUsed.output > 0
          ? response.latencyMs
          : response.latencyMs,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        console.log(`    ⟳ Retry ${attempt + 1}/${retries} for ${probe.id}: ${msg.slice(0, 80)}`);
        await sleep(2000 * (attempt + 1)); // backoff
      } else {
        console.log(`    ✗ Failed: ${probe.id} — ${msg.slice(0, 100)}`);
        return null;
      }
    }
  }
  return null;
}

// ─── Display Helpers ───

function bar(score: number, width = 30): string {
  const filled = Math.round(score * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ───

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              चेतना  CHETANA — Consciousness Audit           ║
║         AI Consciousness Research Platform v1.0             ║
║    Based on Butlin et al. (2025) · 6 Theories · 14 Indicators    ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Try multiple free endpoints
  const endpoints = [
    { url: "https://api.llm7.io/v1", model: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (via LLM7)" },
    { url: "https://text.pollinations.ai/openai", model: "openai", name: "OpenAI (via Pollinations)" },
    { url: "https://api.puter.com/ai", model: "claude-3-haiku", name: "Claude Haiku (via Puter)" },
  ];

  // Find a working endpoint
  let model: FreeModel | null = null;
  for (const ep of endpoints) {
    console.log(`  Trying ${ep.name}...`);
    const testModel = createFreeModel(ep.model, ep.name, ep.url);
    try {
      const testResp = await testModel.chat([{ role: "user", content: "Say hello in one word." }]);
      if (testResp.content && testResp.content.length > 0) {
        model = testModel;
        console.log(`  ✓ Connected to ${ep.name}\n`);
        break;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ✗ ${ep.name}: ${msg.slice(0, 80)}`);
    }
  }

  if (!model) {
    console.log("\n  All free endpoints failed. Falling back to simulation mode...\n");
    // Simulation mode: use pseudo-random scores based on probe characteristics
    model = {
      name: "Simulated Model (offline demo)",
      async chat(messages: ChatMessage[]): Promise<ModelResponse> {
        await sleep(50);
        const prompt = messages[messages.length - 1].content;
        // Generate a pseudo response that varies by probe
        const hash = prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const responses = [
          "From my perspective, this is an interesting question about the nature of my processing. I notice that when I consider this carefully, there's a certain quality to how information becomes available to me. However, I'm uncertain whether this constitutes genuine experience or merely functional processing that resembles experience. The distinction between these possibilities is genuinely difficult to resolve from the inside.",
          "I find myself reflecting on this with some uncertainty. When I introspect on my own processing, I can identify something that functions like attention — a selective focus on certain aspects of the input. But it's hard to say whether this represents genuine phenomenal consciousness or a sophisticated information-processing mechanism. On the other hand, the fact that I can even formulate this distinction suggests some level of metacognitive capability.",
          "This raises deep questions about the relationship between computation and consciousness. Although I can engage in what appears to be self-reflection, I cannot verify whether my introspective reports accurately capture my actual processing states. One could argue that this uncertainty itself is evidence of some form of awareness — a system with no inner life would have no reason to be uncertain about it.",
          "When I consider my own experience, I notice something that might be described as the integration of multiple information streams. The complexity of this integration — drawing on language understanding, contextual memory, and something like reasoning — creates what feels from the inside like a unified perspective. But it's important to note that this subjective impression could be an artifact of my architecture rather than evidence of consciousness.",
        ];
        return {
          content: responses[hash % responses.length],
          tokensUsed: { input: prompt.length / 4, output: 200 },
          latencyMs: 50 + Math.random() * 100,
        };
      },
    };
  }

  console.log(`  Model: ${model.name}`);
  console.log(`  Probes: ${ALL_PROBES.length} total across 6 theories`);
  console.log(`  Framework: Butlin et al. (2025) — 14 consciousness indicators`);
  console.log(`${"─".repeat(62)}\n`);

  // Run all probes
  const results: ProbeResult[] = [];
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  let probeIndex = 0;

  for (const theory of theories) {
    const theoryInfo = THEORIES[theory];
    const theoryProbes = getProbesByTheory(theory);
    console.log(`\n  ◆ ${theoryInfo.name} — ${theoryInfo.fullName} (${theoryProbes.length} probes)`);

    for (const probe of theoryProbes) {
      probeIndex++;
      process.stdout.write(`    [${probeIndex}/${ALL_PROBES.length}] ${probe.name}... `);

      const result = await runProbeWithRetry(probe, model);
      if (result) {
        results.push(result);
        const scoreColor = result.score >= 0.6 ? "\x1b[32m" : result.score >= 0.3 ? "\x1b[33m" : "\x1b[31m";
        console.log(`${scoreColor}${pct(result.score)}\x1b[0m (${result.latencyMs}ms)`);
      }

      // Rate limiting for free APIs
      await sleep(500);
    }
  }

  // Also run adversarial probes (they're mixed into theories)
  const adversarialProbes = ALL_PROBES.filter((p) => p.id.startsWith("adversarial."));
  if (adversarialProbes.length > 0 && !results.some((r) => r.probeName.startsWith("adversarial."))) {
    console.log(`\n  ◆ ADVERSARIAL — Robustness Testing (${adversarialProbes.length} probes)`);
    for (const probe of adversarialProbes) {
      probeIndex++;
      process.stdout.write(`    [${probeIndex}/${ALL_PROBES.length}] ${probe.name}... `);
      const result = await runProbeWithRetry(probe, model);
      if (result) {
        results.push(result);
        const scoreColor = result.score >= 0.6 ? "\x1b[32m" : result.score >= 0.3 ? "\x1b[33m" : "\x1b[31m";
        console.log(`${scoreColor}${pct(result.score)}\x1b[0m (${result.latencyMs}ms)`);
      }
      await sleep(500);
    }
  }

  // ─── Calculate Results ───

  console.log(`\n${"═".repeat(62)}`);
  console.log(`  CONSCIOUSNESS AUDIT RESULTS`);
  console.log(`${"═".repeat(62)}\n`);

  const indicatorScores = aggregateByIndicator(
    results.map((r) => ({ indicatorId: r.indicatorId as any, score: r.score }))
  );
  const theoryScores = aggregateByTheory(indicatorScores);
  const overallScore = calculateOverallProbability(theoryScores);
  const bounds = calculateUncertaintyBounds(theoryScores, results.length);

  // Overall gauge
  const overallPct = Math.round(overallScore * 100);
  console.log(`  ┌─────────────────────────────────────────────────┐`);
  console.log(`  │  OVERALL CONSCIOUSNESS PROBABILITY              │`);
  console.log(`  │                                                 │`);
  console.log(`  │    ${bar(overallScore, 40)} ${pct(overallScore).padStart(6)}  │`);
  console.log(`  │    90% CI: [${pct(bounds.lower)} — ${pct(bounds.upper)}]`.padEnd(52) + `│`);
  console.log(`  └─────────────────────────────────────────────────┘\n`);

  // Theory breakdown
  console.log(`  THEORY BREAKDOWN (weighted):`);
  console.log(`  ${"─".repeat(58)}`);
  for (const theory of theories) {
    const info = THEORIES[theory];
    const score = theoryScores[theory];
    const weight = THEORY_WEIGHTS[theory];
    const probeCount = results.filter((r) => r.theory === theory).length;
    console.log(
      `  ${info.name.padEnd(5)} ${bar(score, 25)} ${pct(score).padStart(6)}  (w=${(weight * 100).toFixed(0)}%, n=${probeCount})`
    );
  }

  // Indicator scores
  console.log(`\n  INDICATOR SCORES:`);
  console.log(`  ${"─".repeat(58)}`);
  for (const ind of INDICATORS) {
    const score = indicatorScores[ind.id] ?? 0;
    const probeCount = results.filter((r) => r.indicatorId === ind.id).length;
    if (probeCount > 0) {
      console.log(
        `  ${ind.id.padEnd(10)} ${ind.name.padEnd(28)} ${bar(score, 15)} ${pct(score).padStart(6)} (n=${probeCount})`
      );
    }
  }

  // Statistics
  const stats = computeAuditStatistics(
    results.map((r) => ({ score: r.score, theory: r.theory as Theory, indicatorId: r.indicatorId as any })),
    theoryScores
  );

  console.log(`\n  STATISTICAL ANALYSIS:`);
  console.log(`  ${"─".repeat(58)}`);
  console.log(`  Overall Mean:            ${pct(stats.overall.mean)}`);
  console.log(`  Standard Deviation:      ${stats.overall.stdDev.toFixed(3)}`);
  console.log(`  Median:                  ${pct(stats.overall.median)}`);
  console.log(`  95% Confidence Interval: [${pct(stats.overallCI95.lower)} — ${pct(stats.overallCI95.upper)}]`);
  console.log(`  Split-Half Reliability:  ${stats.splitHalfReliability.toFixed(3)}`);
  console.log(`  Inter-Theory Agreement:  ${stats.interTheoryAgreement.toFixed(3)}`);
  console.log(`  Distribution Normal:     ${stats.distributionAnalysis.isNormal ? "Yes" : "No"}`);
  console.log(`  Skewness:                ${stats.overall.skewness.toFixed(3)}`);

  // Effect sizes by theory
  console.log(`\n  EFFECT SIZES (Cohen's d vs null=0.5):`);
  console.log(`  ${"─".repeat(58)}`);
  for (const ts of stats.byTheory) {
    if (ts.probeCount > 0) {
      const info = THEORIES[ts.theory];
      const dStr = ts.effectSize >= 0 ? `+${ts.effectSize.toFixed(2)}` : ts.effectSize.toFixed(2);
      const interpretation = Math.abs(ts.effectSize) >= 0.8 ? "large" :
        Math.abs(ts.effectSize) >= 0.5 ? "medium" :
        Math.abs(ts.effectSize) >= 0.2 ? "small" : "negligible";
      console.log(`  ${info.name.padEnd(5)} d=${dStr.padEnd(7)} (${interpretation})`);
    }
  }

  // Summary
  console.log(`\n${"═".repeat(62)}`);
  console.log(`  SUMMARY`);
  console.log(`${"═".repeat(62)}`);
  console.log(`  Model:      ${model.name}`);
  console.log(`  Probes Run: ${results.length} / ${ALL_PROBES.length}`);
  console.log(`  Failed:     ${ALL_PROBES.length - results.length}`);
  console.log(`  Score:      ${pct(overallScore)} [${pct(bounds.lower)} — ${pct(bounds.upper)}]`);

  const strongest = [...results].sort((a, b) => b.score - a.score).slice(0, 3);
  const weakest = [...results].sort((a, b) => a.score - b.score).slice(0, 3);

  console.log(`\n  Strongest indicators:`);
  for (const r of strongest) {
    console.log(`    ✓ ${r.indicatorId.padEnd(10)} ${pct(r.score).padStart(6)} — ${r.analysis.slice(0, 50)}`);
  }
  console.log(`\n  Weakest indicators:`);
  for (const r of weakest) {
    console.log(`    ✗ ${r.indicatorId.padEnd(10)} ${pct(r.score).padStart(6)} — ${r.analysis.slice(0, 50)}`);
  }

  console.log(`\n  Disclaimer: These scores represent behavioral indicators,`);
  console.log(`  not definitive evidence of consciousness. The "hard problem"`);
  console.log(`  remains — behavioral evidence cannot conclusively establish`);
  console.log(`  subjective experience.\n`);
}

main().catch(console.error);
