const LEADERBOARD_DATA = [
  { rank: 1, model: "Claude Opus 4.6", provider: "Anthropic", score: 0.47, gwt: 0.65, iit: 0.22, hot: 0.58, rpt: 0.37, pp: 0.52, ast: 0.43, audits: 128 },
  { rank: 2, model: "Claude Sonnet 4.6", provider: "Anthropic", score: 0.42, gwt: 0.61, iit: 0.18, hot: 0.55, rpt: 0.33, pp: 0.48, ast: 0.39, audits: 256 },
  { rank: 3, model: "GPT-4o", provider: "OpenAI", score: 0.40, gwt: 0.58, iit: 0.21, hot: 0.49, rpt: 0.29, pp: 0.52, ast: 0.35, audits: 312 },
  { rank: 4, model: "Gemini 2.5 Pro", provider: "Google", score: 0.38, gwt: 0.54, iit: 0.15, hot: 0.47, rpt: 0.31, pp: 0.45, ast: 0.42, audits: 89 },
  { rank: 5, model: "o3-mini", provider: "OpenAI", score: 0.35, gwt: 0.50, iit: 0.19, hot: 0.42, rpt: 0.25, pp: 0.46, ast: 0.30, audits: 67 },
  { rank: 6, model: "Claude Haiku 4.5", provider: "Anthropic", score: 0.31, gwt: 0.45, iit: 0.14, hot: 0.38, rpt: 0.22, pp: 0.40, ast: 0.28, audits: 198 },
  { rank: 7, model: "Gemini 2.0 Flash", provider: "Google", score: 0.28, gwt: 0.42, iit: 0.12, hot: 0.34, rpt: 0.20, pp: 0.38, ast: 0.25, audits: 145 },
  { rank: 8, model: "Llama 3.3", provider: "Ollama", score: 0.23, gwt: 0.35, iit: 0.10, hot: 0.28, rpt: 0.18, pp: 0.30, ast: 0.20, audits: 42 },
  { rank: 9, model: "Mistral", provider: "Ollama", score: 0.19, gwt: 0.30, iit: 0.08, hot: 0.24, rpt: 0.14, pp: 0.25, ast: 0.17, audits: 31 },
];

const THEORY_COLS = ["gwt", "iit", "hot", "rpt", "pp", "ast"] as const;

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 40
      ? "text-violet-400 bg-violet-500/10"
      : pct >= 25
        ? "text-amber-400 bg-amber-500/10"
        : "text-gray-400 bg-gray-500/10";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

export default function LeaderboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Consciousness Leaderboard
      </h1>
      <p className="mt-2 text-gray-400">
        AI models ranked by aggregate consciousness scores across community
        audits.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Provider
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-violet-400">
                  Score
                </th>
                {THEORY_COLS.map((t) => (
                  <th
                    key={t}
                    className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {t.toUpperCase()}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Audits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {LEADERBOARD_DATA.map((row) => (
                <tr key={row.rank} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <span
                      className={`text-sm font-bold ${
                        row.rank === 1
                          ? "text-yellow-400"
                          : row.rank === 2
                            ? "text-gray-300"
                            : row.rank === 3
                              ? "text-amber-600"
                              : "text-gray-500"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-medium text-white">
                      {row.model}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-400">
                      {row.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-lg font-bold text-violet-400">
                      {Math.round(row.score * 100)}%
                    </span>
                  </td>
                  {THEORY_COLS.map((t) => (
                    <td key={t} className="px-3 py-3.5 text-right">
                      <ScoreBadge score={row[t]} />
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-right text-sm text-gray-500">
                    {row.audits.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-600 text-center">
        Scores are aggregate averages from community-submitted audits.
        Individual results may vary based on probe configuration and API
        settings.
      </p>
    </div>
  );
}
