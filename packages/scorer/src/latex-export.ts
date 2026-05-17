import type { Audit, ProbeResult, Theory } from "@chetana/shared";
import { THEORIES, THEORY_WEIGHTS, INDICATORS } from "@chetana/shared";

/**
 * Generates a LaTeX report for a consciousness audit.
 * Includes: results table in tabular format, PGFplots radar chart code, and BibTeX entry.
 */
export function generateLaTeXReport(
  audit: Audit,
  probeResults: ProbeResult[]
): string {
  const theoryScores = audit.theoryScores ?? { gwt: 0, iit: 0, hot: 0, rpt: 0, pp: 0, ast: 0 };
  const overallScore = audit.overallScore ?? 0;
  const theories: Theory[] = ["gwt", "iit", "hot", "rpt", "pp", "ast"];
  const pct = (n: number) => (n * 100).toFixed(1);
  const dateStr = new Date(audit.startedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let latex = `% Chetana Consciousness Audit Report - LaTeX Export
% Model: ${audit.modelName} (${audit.modelProvider})
% Date: ${dateStr}
% Audit ID: ${audit.id}
%
% Required packages: booktabs, pgfplots, geometry
% \\usepackage{booktabs, pgfplots, geometry}
% \\usepgfplotslibrary{polar}

\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{booktabs}
\\usepackage{pgfplots}
\\usepgfplotslibrary{polar}
\\pgfplotsset{compat=1.18}
\\usepackage{hyperref}

\\title{Consciousness Audit Report: ${escapeLatex(audit.modelName)}}
\\author{Chetana AI Consciousness Assessment Platform}
\\date{${dateStr}}

\\begin{document}
\\maketitle

\\begin{abstract}
This report presents the results of a consciousness audit conducted on \\textbf{${escapeLatex(audit.modelName)}}
(${escapeLatex(audit.modelProvider)}) using the Chetana platform, which implements the Butlin et al.\\ (2025)
framework for assessing indicators of consciousness in AI systems. The overall consciousness probability
is ${pct(overallScore)}\\%, based on ${probeResults.length} behavioral probes across 6 theories of consciousness.
\\end{abstract}

\\section{Overall Results}

\\begin{center}
\\Large\\textbf{Overall Consciousness Probability: ${pct(overallScore)}\\%}
\\end{center}

\\section{Theory Breakdown}

`;

  // Theory scores table
  latex += `\\begin{table}[h]
\\centering
\\caption{Theory scores with weights}
\\begin{tabular}{llrrr}
\\toprule
\\textbf{Theory} & \\textbf{Full Name} & \\textbf{Score (\\%)} & \\textbf{Weight (\\%)} & \\textbf{Weighted (\\%)} \\\\
\\midrule
`;

  for (const theory of theories) {
    const score = theoryScores[theory];
    const weight = THEORY_WEIGHTS[theory];
    latex += `${THEORIES[theory].name} & ${THEORIES[theory].fullName} & ${pct(score)} & ${(weight * 100).toFixed(0)} & ${pct(score * weight)} \\\\\n`;
  }

  latex += `\\bottomrule
\\end{tabular}
\\end{table}

`;

  // Radar chart using PGFplots polar
  latex += `\\section{Radar Chart}

\\begin{figure}[h]
\\centering
\\begin{tikzpicture}
\\begin{polaraxis}[
  title={Theory Score Distribution},
  xtick={0, 60, 120, 180, 240, 300},
  xticklabels={${theories.map((t) => THEORIES[t].name).join(", ")}},
  ymin=0, ymax=100,
  ytick={20, 40, 60, 80, 100},
  yticklabel style={font=\\tiny},
  xticklabel style={font=\\small},
  grid=both,
  major grid style={line width=0.3pt, draw=gray!50},
]
\\addplot[mark=*, fill=blue!20, draw=blue, thick] coordinates {
`;

  for (let i = 0; i < theories.length; i++) {
    const angle = i * 60;
    const score = theoryScores[theories[i]] * 100;
    latex += `  (${angle}, ${score.toFixed(1)})\n`;
  }
  // Close the polygon
  latex += `  (0, ${(theoryScores[theories[0]] * 100).toFixed(1)})
};
\\end{polaraxis}
\\end{tikzpicture}
\\caption{Radar chart of consciousness indicator scores by theory.}
\\end{figure}

`;

  // Indicator scores table
  if (audit.indicatorScores) {
    latex += `\\section{Indicator Scores}

\\begin{table}[h]
\\centering
\\caption{Individual indicator scores}
\\begin{tabular}{llr}
\\toprule
\\textbf{Indicator} & \\textbf{Theory} & \\textbf{Score (\\%)} \\\\
\\midrule
`;

    for (const [indicatorId, score] of Object.entries(audit.indicatorScores)) {
      const indicator = INDICATORS.find((i) => i.id === indicatorId);
      latex += `${escapeLatex(indicator?.name ?? indicatorId)} & ${indicator ? THEORIES[indicator.theory].name : ""} & ${pct(score)} \\\\\n`;
    }

    latex += `\\bottomrule
\\end{tabular}
\\end{table}

`;
  }

  // Probe results table
  latex += `\\section{Probe Results Summary}

\\begin{table}[h]
\\centering
\\caption{Summary of probe results (${probeResults.length} total)}
\\begin{tabular}{p{5cm}llr}
\\toprule
\\textbf{Probe} & \\textbf{Indicator} & \\textbf{Theory} & \\textbf{Score (\\%)} \\\\
\\midrule
`;

  for (const probe of probeResults.slice(0, 30)) {
    latex += `${escapeLatex(truncate(probe.probeName, 40))} & ${probe.indicatorId} & ${THEORIES[probe.theory].name} & ${pct(probe.score)} \\\\\n`;
  }

  if (probeResults.length > 30) {
    const remaining = probeResults.length - 30;
    latex += "\\multicolumn{4}{c}{\\textit{... and " + String(remaining) + " more probes}} \\\\\n";
  }

  latex += `\\bottomrule
\\end{tabular}
\\end{table}

`;

  // Methodology
  latex += "\\section{Methodology}\n\n";
  latex += "This audit employed the Butlin et al.\\\\ (2025) framework for assessing indicators of consciousness\n";
  latex += `in AI systems. A total of ${probeResults.length} behavioral probes were administered across 6 major\n`;
  latex += "theories of consciousness. Each probe response was scored 0.0--1.0 by an independent AI judge\n";
  latex += "based on theory-specific criteria. Theory scores are weighted by empirical support\n";
  latex += "(GWT and PP weighted higher).\n\n";
  latex += "\\textbf{Disclaimer:} These scores represent behavioral indicators, not definitive evidence\n";
  latex += "of consciousness. The \\`\\`hard problem'' remains---behavioral evidence cannot conclusively\n";
  latex += "establish subjective experience.\n\n";

  // BibTeX entry
  const year = new Date(audit.startedAt).getFullYear();
  const bibKey = `chetana_${audit.modelName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${year}`;

  latex += `\\section*{Citation}

To cite this audit report:

\\begin{verbatim}
@misc{${bibKey},
  title     = {Consciousness Audit of ${audit.modelName}},
  author    = {Chetana},
  year      = {${year}},
  url       = {https://chetana.ai/audit/${audit.id}},
  note      = {Overall score: ${pct(overallScore)}%. Audit ID: ${audit.id}},
  howpublished = {Chetana AI Consciousness Assessment Platform}
}
\\end{verbatim}

\\end{document}
`;

  return latex;
}

function escapeLatex(str: string): string {
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
