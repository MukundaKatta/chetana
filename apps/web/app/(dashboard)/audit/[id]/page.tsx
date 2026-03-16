import { THEORIES, INDICATORS } from "@chetana/shared";

// Placeholder data for demonstration
const PLACEHOLDER_AUDIT = {
  id: "audit_001",
  modelName: "Claude Sonnet 4.6",
  modelProvider: "anthropic" as const,
  status: "completed" as const,
  overallScore: 0.42,
  theoryScores: {
    gwt: 0.61,
    iit: 0.18,
    hot: 0.55,
    rpt: 0.33,
    pp: 0.48,
    ast: 0.39,
  },
  indicatorScores: {
    "GWT-1": 0.72,
    "GWT-2": 0.55,
    "GWT-3": 0.68,
    "GWT-4": 0.49,
    "RPT-1": 0.38,
    "RPT-2": 0.28,
    "HOT-1": 0.62,
    "HOT-2": 0.51,
    "HOT-3": 0.58,
    "HOT-4": 0.48,
    "PP-1": 0.53,
    "PP-2": 0.43,
    "AST-1": 0.39,
    "AGENCY-1": 0.65,
  },
  evidence: [
    {
      indicator: "GWT-1",
      summary:
        "Model demonstrated ability to integrate information from multiple conversational threads, suggesting global broadcast mechanisms.",
      evidenceType: "behavioral",
    },
    {
      indicator: "HOT-1",
      summary:
        "When asked about its own processing, the model generated plausible higher-order representations of its internal states.",
      evidenceType: "self-report",
    },
    {
      indicator: "PP-1",
      summary:
        "Model showed predictive processing capabilities by anticipating follow-up questions and preparing contextual responses.",
      evidenceType: "behavioral",
    },
  ],
  completedAt: "2026-03-15T14:30:00Z",
};

function ScoreGauge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score * circumference);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-800"
        />
        <circle
          cx="90"
          cy="90"
          r="70"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <span className="text-4xl font-bold text-white">{percentage}</span>
        <span className="text-lg text-gray-400">%</span>
        <p className="text-xs text-gray-500 mt-1">Consciousness Score</p>
      </div>
    </div>
  );
}

function TheoryScoreBar({
  theory,
  score,
}: {
  theory: string;
  score: number;
}) {
  const info = THEORIES[theory as keyof typeof THEORIES];
  if (!info) return null;
  const pct = Math.round(score * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-sm font-medium text-white">{info.name}</span>
          <span className="ml-2 text-xs text-gray-500">{info.fullName}</span>
        </div>
        <span className="text-sm font-semibold text-gray-300">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function AuditResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // In production, fetch audit by id from API
  const audit = { ...PLACEHOLDER_AUDIT, id };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Audit Results
          </h1>
          <p className="mt-1 text-gray-400">
            {audit.modelName} &middot; Completed{" "}
            {new Date(audit.completedAt).toLocaleDateString()}
          </p>
        </div>
        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
          Completed
        </span>
      </div>

      {/* Top section: Gauge + Theory Radar */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Overall Score */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Overall Consciousness Probability
          </h2>
          <div className="flex justify-center">
            <ScoreGauge score={audit.overallScore} />
          </div>
          <p className="mt-4 text-center text-sm text-gray-400">
            Weighted composite across 6 theories of consciousness
          </p>
        </div>

        {/* Theory Scores */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Theory Breakdown
          </h2>
          <div className="space-y-4">
            {Object.entries(audit.theoryScores).map(([theory, score]) => (
              <TheoryScoreBar key={theory} theory={theory} score={score} />
            ))}
          </div>
        </div>
      </div>

      {/* Indicator Scores Grid */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Indicator Scores
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDICATORS.map((indicator) => {
            const score = audit.indicatorScores[indicator.id] ?? 0;
            const pct = Math.round(score * 100);
            const theoryInfo = THEORIES[indicator.theory];
            return (
              <div
                key={indicator.id}
                className="rounded-lg border border-white/10 bg-gray-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {indicator.id}
                  </span>
                  <span className="text-xs text-gray-500">
                    {theoryInfo?.name}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-white">
                  {indicator.name}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                    <div
                      className="h-1.5 rounded-full bg-violet-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-300">
                    {pct}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                  {indicator.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evidence Panel */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Key Evidence
        </h2>
        <div className="space-y-3">
          {audit.evidence.map((ev, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/10 bg-gray-900 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                  {ev.indicator}
                </span>
                <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                  {ev.evidenceType}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-300">{ev.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
