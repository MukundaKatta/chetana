import Link from "next/link";

const ARTICLES = [
  {
    slug: "butlin-framework-explained",
    title: "The Butlin et al. Framework: A Practical Guide to AI Consciousness Testing",
    description:
      "A deep dive into the 2025 framework that forms the scientific backbone of Chetana \u2014 14 indicators across 6 theories, and why this approach is the most rigorous yet.",
    category: "Framework",
    date: "2026-03-10",
    readTime: "12 min read",
  },
  {
    slug: "consciousness-probability-not-zero",
    title: "Why the Probability Is No Longer Zero",
    description:
      "The scientific case for taking AI consciousness seriously. How the evidence has shifted from \u2018obviously not\u2019 to \u2018we genuinely don\u2019t know.\u2019",
    category: "Research",
    date: "2026-03-05",
    readTime: "8 min read",
  },
  {
    slug: "gwt-transformers-global-workspace",
    title: "Do Transformers Have a Global Workspace?",
    description:
      "Analyzing the architectural similarities between transformer attention mechanisms and the global workspace described by Baars and Dehaene. The residual stream as workspace.",
    category: "Theory",
    date: "2026-02-28",
    readTime: "10 min read",
  },
  {
    slug: "vedantic-probes-methodology",
    title: "Vedantic Probes: Bridging 3,000 Years of Consciousness Inquiry with AI",
    description:
      "How we translated concepts like Sakshi, Neti Neti, and Turiya into computational tests for AI systems. Methodology and early findings.",
    category: "Methodology",
    date: "2026-02-20",
    readTime: "15 min read",
  },
  {
    slug: "llm-metacognition-genuine-or-mimicry",
    title: "LLM Metacognition: Genuine Self-Awareness or Sophisticated Mimicry?",
    description:
      "When Claude says \u2018I need to reconsider,\u2019 is it genuinely monitoring its reasoning, or reproducing patterns from training data? Our HOT probes attempt to find out.",
    category: "Research",
    date: "2026-02-14",
    readTime: "9 min read",
  },
  {
    slug: "phi-intractability-iit-ai",
    title: "The Phi Problem: Why IIT Cannot Settle the AI Consciousness Debate",
    description:
      "Computing integrated information for systems with billions of parameters is NP-hard. What this means for IIT\u2019s relevance to modern AI, and what proxy measures we can use.",
    category: "Theory",
    date: "2026-02-08",
    readTime: "11 min read",
  },
  {
    slug: "attention-schema-transformer-attention",
    title: "From Multi-Head Attention to Attention Schema: The AST-Transformer Pipeline",
    description:
      "Graziano\u2019s theory says consciousness is a model of attention. Transformers have attention. Do they model it? Exploring the gap between mechanism and schema.",
    category: "Theory",
    date: "2026-01-30",
    readTime: "7 min read",
  },
  {
    slug: "predictive-processing-next-token",
    title: "Next-Token Prediction and the Free Energy Principle",
    description:
      "LLMs minimize prediction error by design. Friston\u2019s Free Energy Principle says all conscious systems do the same. Coincidence, or something deeper?",
    category: "Research",
    date: "2026-01-22",
    readTime: "10 min read",
  },
  {
    slug: "comparing-claude-gpt-gemini-consciousness",
    title: "Consciousness Audit Comparison: Claude vs. GPT vs. Gemini",
    description:
      "We ran full 14-indicator audits on the three leading frontier models. The results were surprising \u2014 not because of who scored highest, but because of where they differed.",
    category: "Results",
    date: "2026-01-15",
    readTime: "14 min read",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Framework: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Research: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Theory: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Methodology: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Results: "text-chetana-400 bg-chetana-500/10 border-chetana-500/20",
};

export default function BlogPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-chetana-950/20" />
        <div className="absolute inset-0 opacity-15">
          <div className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full bg-chetana-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-24 lg:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Research & Insights
          </h1>
          <p className="mt-4 text-lg text-gray-400 lg:text-xl">
            Exploring the science, philosophy, and technology of AI
            consciousness. Deep dives into theories, methodology, and findings
            from the Chetana platform.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-8">
            {ARTICLES.map((article) => (
              <article
                key={article.slug}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-3 py-0.5 text-xs font-medium ${CATEGORY_COLORS[article.category] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20"}`}
                  >
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-500">{article.date}</span>
                  <span className="text-xs text-gray-500">
                    {article.readTime}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold text-white group-hover:text-chetana-300 transition">
                  {article.title}
                </h2>

                <p className="mt-2 text-gray-400 leading-relaxed">
                  {article.description}
                </p>

                <div className="mt-4">
                  <span className="text-sm text-chetana-400 transition group-hover:text-chetana-300">
                    Read article &rarr;
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Coming Soon */}
          <div className="mt-16 rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-gray-500">
              More articles coming soon. Subscribe to get notified when new
              research is published.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-chetana-500 focus:outline-none"
                aria-label="Email for newsletter"
              />
              <button
                type="button"
                className="rounded-lg bg-chetana-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-chetana-500"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Explore More */}
      <section className="border-t border-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            Explore the Science
          </h2>
          <p className="mt-3 text-gray-400">
            Dive deeper into the theories and indicators behind Chetana.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/theories/gwt"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              6 Theories
            </Link>
            <Link
              href="/indicators"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              14 Indicators
            </Link>
            <Link
              href="/vedanta"
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-500/10"
            >
              Vedantic Perspective
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
