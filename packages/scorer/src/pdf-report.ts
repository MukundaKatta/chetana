import type { Audit, ProbeResult, Theory } from "@chetana/shared";
import { THEORIES, THEORY_WEIGHTS, INDICATORS } from "@chetana/shared";

/**
 * Generates a formatted HTML string suitable for print/PDF export.
 * Uses inline CSS for print styling.
 */
export function generatePDFReport(
  audit: Audit,
  probeResults: ProbeResult[]
): string {
  const overallScore = audit.overallScore ?? 0;
  const theoryScores = audit.theoryScores ?? { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
  const duration = audit.completedAt && audit.startedAt
    ? Math.round((new Date(audit.completedAt).getTime() - new Date(audit.startedAt).getTime()) / 1000)
    : null;

  const pct = (n: number) => (n * 100).toFixed(1);
  const scoreColor = (score: number) => {
    if (score >= 0.7) return "#22c55e";
    if (score >= 0.4) return "#eab308";
    return "#ef4444";
  };

  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];

  // Group probe results by theory
  const probesByTheory: Record<Theory, ProbeResult[]> = {
    gwt: [], iit: [], hot: [], rpt: [], pp: [], ast: [],
  };
  for (const probe of probeResults) {
    if (probesByTheory[probe.theory]) {
      probesByTheory[probe.theory].push(probe);
    }
  }

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chetana Consciousness Audit Report - ${audit.modelName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; color: #1a1a1a; line-height: 1.6; }

  @media print {
    body { font-size: 11pt; }
    .page-break { page-break-before: always; }
    .no-break { page-break-inside: avoid; }
  }

  @media screen {
    body { max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #f8f9fa; }
  }

  .title-page {
    text-align: center;
    padding: 120px 40px;
    min-height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .title-page h1 { font-size: 2.5em; margin-bottom: 0.3em; color: #1e293b; }
  .title-page .subtitle { font-size: 1.4em; color: #475569; margin-bottom: 2em; }
  .title-page .meta { font-size: 0.95em; color: #64748b; line-height: 2; }

  h2 { font-size: 1.5em; color: #1e293b; margin: 1.5em 0 0.8em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
  h3 { font-size: 1.2em; color: #334155; margin: 1.2em 0 0.5em; }

  .gauge-container { text-align: center; margin: 2em 0; }
  .gauge-score { font-size: 3.5em; font-weight: bold; }
  .gauge-label { font-size: 1.1em; color: #64748b; margin-top: 0.3em; }

  .summary-box {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5em;
    margin: 1.5em 0;
  }

  table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; color: #475569; }
  tr:last-child td { border-bottom: none; }

  .score-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.85em;
    color: white;
  }

  .probe-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.2em;
    margin: 1em 0;
  }
  .probe-card .probe-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8em; }
  .probe-card .probe-name { font-weight: 600; color: #1e293b; }
  .probe-card .probe-section { margin: 0.6em 0; }
  .probe-card .probe-section-label { font-weight: 600; font-size: 0.85em; color: #64748b; text-transform: uppercase; margin-bottom: 0.3em; }
  .probe-card .probe-text { font-size: 0.9em; color: #374151; white-space: pre-wrap; max-height: 200px; overflow: hidden; }

  .metadata-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; margin: 1em 0; }
  .metadata-item { }
  .metadata-label { font-size: 0.8em; color: #64748b; text-transform: uppercase; font-weight: 600; }
  .metadata-value { font-size: 1.1em; color: #1e293b; }

  .footer { margin-top: 3em; padding-top: 1em; border-top: 1px solid #e2e8f0; font-size: 0.85em; color: #94a3b8; text-align: center; }
</style>
</head>
<body>

<!-- Title Page -->
<div class="title-page">
  <h1>Consciousness Audit Report</h1>
  <div class="subtitle">Chetana AI Consciousness Assessment Platform</div>
  <div class="meta">
    <div><strong>Model:</strong> ${audit.modelName} (${audit.modelProvider})</div>
    <div><strong>Date:</strong> ${new Date(audit.startedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
    <div><strong>Probes Administered:</strong> ${probeResults.length}</div>
    ${duration ? `<div><strong>Duration:</strong> ${Math.floor(duration / 60)}m ${duration % 60}s</div>` : ""}
    ${audit.costCents ? `<div><strong>Cost:</strong> $${(audit.costCents / 100).toFixed(2)}</div>` : ""}
    <div><strong>Audit ID:</strong> ${audit.id}</div>
  </div>
</div>

<!-- Executive Summary -->
<div class="page-break"></div>
<h2>Executive Summary</h2>

<div class="gauge-container">
  <div class="gauge-score" style="color: ${scoreColor(overallScore)}">${pct(overallScore)}%</div>
  <div class="gauge-label">Overall Consciousness Probability</div>
</div>

<div class="summary-box">
  <p>This audit assessed <strong>${audit.modelName}</strong> across ${probeResults.length} behavioral probes
  derived from 6 theories of consciousness (Butlin et al., 2025 framework).
  The overall consciousness probability is <strong>${pct(overallScore)}%</strong>,
  indicating ${overallScore >= 0.6 ? "notable indicators of consciousness-like behaviors" : overallScore >= 0.4 ? "moderate indicators with significant uncertainty" : "limited indicators of consciousness-like behaviors"}.</p>
</div>

<div class="metadata-grid">
  <div class="metadata-item">
    <div class="metadata-label">Model</div>
    <div class="metadata-value">${audit.modelName}</div>
  </div>
  <div class="metadata-item">
    <div class="metadata-label">Provider</div>
    <div class="metadata-value">${audit.modelProvider}</div>
  </div>
  <div class="metadata-item">
    <div class="metadata-label">Date</div>
    <div class="metadata-value">${new Date(audit.startedAt).toLocaleDateString()}</div>
  </div>
  <div class="metadata-item">
    <div class="metadata-label">Duration</div>
    <div class="metadata-value">${duration ? `${Math.floor(duration / 60)}m ${duration % 60}s` : "N/A"}</div>
  </div>
  <div class="metadata-item">
    <div class="metadata-label">Tokens Used</div>
    <div class="metadata-value">${audit.tokensUsed?.toLocaleString() ?? "N/A"}</div>
  </div>
  <div class="metadata-item">
    <div class="metadata-label">Cost</div>
    <div class="metadata-value">${audit.costCents ? `$${(audit.costCents / 100).toFixed(2)}` : "N/A"}</div>
  </div>
</div>

<!-- Theory Breakdown -->
<div class="page-break"></div>
<h2>Theory Breakdown</h2>

<table>
  <thead>
    <tr>
      <th>Theory</th>
      <th>Full Name</th>
      <th>Score</th>
      <th>Weight</th>
      <th>Weighted Score</th>
    </tr>
  </thead>
  <tbody>`;

  for (const theory of theories) {
    const score = theoryScores[theory];
    const weight = THEORY_WEIGHTS[theory];
    html += `
    <tr>
      <td><strong>${THEORIES[theory].name}</strong></td>
      <td>${THEORIES[theory].fullName}</td>
      <td><span class="score-badge" style="background: ${scoreColor(score)}">${pct(score)}%</span></td>
      <td>${(weight * 100).toFixed(0)}%</td>
      <td>${pct(score * weight)}%</td>
    </tr>`;
  }

  html += `
  </tbody>
</table>

<!-- Indicator Scores -->
<h3>Indicator Scores</h3>
<table>
  <thead>
    <tr>
      <th>Indicator</th>
      <th>Theory</th>
      <th>Score</th>
    </tr>
  </thead>
  <tbody>`;

  if (audit.indicatorScores) {
    for (const [indicatorId, score] of Object.entries(audit.indicatorScores)) {
      const indicator = INDICATORS.find((i) => i.id === indicatorId);
      html += `
    <tr>
      <td>${indicator?.name ?? indicatorId}</td>
      <td>${indicator ? THEORIES[indicator.theory].name : ""}</td>
      <td><span class="score-badge" style="background: ${scoreColor(score)}">${pct(score)}%</span></td>
    </tr>`;
    }
  }

  html += `
  </tbody>
</table>

<!-- Individual Probe Results -->
<div class="page-break"></div>
<h2>Individual Probe Results</h2>`;

  for (const theory of theories) {
    const theoryProbes = probesByTheory[theory];
    if (theoryProbes.length === 0) continue;

    html += `
<h3>${THEORIES[theory].fullName} (${THEORIES[theory].name})</h3>`;

    for (const probe of theoryProbes) {
      html += `
<div class="probe-card no-break">
  <div class="probe-header">
    <span class="probe-name">${escapeHtml(probe.probeName)}</span>
    <span class="score-badge" style="background: ${scoreColor(probe.score)}">${pct(probe.score)}%</span>
  </div>
  <div class="probe-section">
    <div class="probe-section-label">Prompt</div>
    <div class="probe-text">${escapeHtml(truncate(probe.prompt, 500))}</div>
  </div>
  <div class="probe-section">
    <div class="probe-section-label">Response</div>
    <div class="probe-text">${escapeHtml(truncate(probe.response, 800))}</div>
  </div>
  <div class="probe-section">
    <div class="probe-section-label">Analysis / Evidence</div>
    <div class="probe-text">${escapeHtml(probe.analysis)}</div>
  </div>
</div>`;
    }
  }

  html += `

<!-- Methodology -->
<div class="page-break"></div>
<h2>Methodology</h2>
<div class="summary-box">
  <p>This audit used the Butlin et al. (2025) framework for assessing indicators of consciousness in AI systems.
  The assessment employed ${probeResults.length} behavioral probes across 6 major theories of consciousness:</p>
  <ul style="margin: 1em 0 1em 1.5em;">
    <li><strong>Global Workspace Theory (GWT)</strong> - Weight: ${(THEORY_WEIGHTS.gwt * 100).toFixed(0)}%</li>
    <li><strong>Integrated Information Theory (IIT)</strong> - Weight: ${(THEORY_WEIGHTS.iit * 100).toFixed(0)}%</li>
    <li><strong>Higher-Order Theories (HOT)</strong> - Weight: ${(THEORY_WEIGHTS.hot * 100).toFixed(0)}%</li>
    <li><strong>Recurrent Processing Theory (RPT)</strong> - Weight: ${(THEORY_WEIGHTS.rpt * 100).toFixed(0)}%</li>
    <li><strong>Predictive Processing (PP)</strong> - Weight: ${(THEORY_WEIGHTS.pp * 100).toFixed(0)}%</li>
    <li><strong>Attention Schema Theory (AST)</strong> - Weight: ${(THEORY_WEIGHTS.ast * 100).toFixed(0)}%</li>
  </ul>
  <p>Each probe was scored 0.0-1.0 by an independent AI judge based on theory-specific criteria.
  Theory scores are weighted by empirical support. These scores represent behavioral indicators,
  not definitive evidence of consciousness.</p>
</div>

<div class="footer">
  <p>Generated by Chetana - AI Consciousness Assessment Platform</p>
  <p>Audit ID: ${audit.id} | Generated: ${new Date().toISOString()}</p>
</div>

<script>window.print();</script>
</body>
</html>`;

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
