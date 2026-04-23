# Chetana

> AI Consciousness Research Platform

🌐 **Live App:** [https://mukundakatta.github.io/chetana/](https://mukundakatta.github.io/chetana/)

## Overview

Chetana (Sanskrit: चेतन, meaning "consciousness" or "awareness") is a research platform for testing AI models against consciousness indicators derived from six major scientific theories. It provides a standardized framework for evaluating whether and to what degree AI systems exhibit markers associated with consciousness.

The platform implements **14 consciousness indicators** spanning Global Workspace Theory (GWT), Integrated Information Theory (IIT), Higher-Order Theories (HOT), Recurrent Processing Theory (RPT), Predictive Processing (PP), and Attention Schema Theory (AST). Each indicator is scored by a judge model on a 0–1 scale; scores are combined via theory-level weighted aggregation to produce an overall consciousness probability estimate.

## Consciousness Theories & Indicators

| Theory | ID | Weight | Indicators |
|--------|----|--------|-----------|
| Global Workspace Theory | GWT | 25% | Global Workspace, Ignition, Information Integration, Smooth Representations, Unified Agency |
| Integrated Information Theory | IIT | 10% | _(structural; no direct probe in current release)_ |
| Higher-Order Theories | HOT | 20% | Higher-Order Representations, Rich Self-Model, Metacognition, Flexible Attention |
| Recurrent Processing Theory | RPT | 10% | Recurrent Processing, Temporal Depth |
| Predictive Processing | PP | 20% | Predictive Processing, Counterfactual Sensitivity |
| Attention Schema Theory | AST | 15% | Attention Schema |

## Tech Stack

- **Monorepo:** TypeScript, [pnpm](https://pnpm.io/) workspaces, [Turborepo](https://turbo.build/)
- **Web app:** Next.js 15, React 19, Tailwind CSS
- **Auth / storage:** Supabase
- **Billing:** Stripe
- **Testing:** Vitest
- **AI APIs:** Anthropic, OpenAI, Google, Ollama

### Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@chetana/shared` | `packages/shared` | Shared types, constants, schemas (theories, indicators, weights) |
| `@chetana/probes` | `packages/probes` | Probe definitions — one directory per theory |
| `@chetana/models` | `packages/models` | Model adapters (Anthropic, OpenAI, Google, Ollama) |
| `@chetana/scorer` | `packages/scorer` | Scoring pipeline: indicator scorer, theory aggregator, probability calculator, statistics |
| `@chetana/web` | `apps/web` | Next.js web application |
| Supabase | `packages/supabase` | DB migrations and schema |

## Quickstart

### (a) Run the web app locally

```bash
git clone https://github.com/MukundaKatta/chetana.git
cd chetana
pnpm install

# Copy and fill in environment variables
cp apps/web/.env.example apps/web/.env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, etc.

pnpm dev
# → http://localhost:3000
```

The web app uses **judge-model scoring**: a separate model evaluates each probe response and assigns a calibrated 0–1 score.

### (b) Run the CLI audit script

```bash
git clone https://github.com/MukundaKatta/chetana.git
cd chetana
pnpm install

pnpm audit
# or: npx tsx scripts/run-audit.ts
```

The CLI script (`scripts/run-audit.ts`) runs probes against free/open model endpoints and prints a per-indicator breakdown to the terminal. It currently uses **heuristic scoring** rather than judge-model scoring. Unifying the two scoring paths is planned — see the [scout report](https://github.com/MukundaKatta/chetana/issues) for details.

## Repository Layout

```
chetana/
├── apps/
│   └── web/              # Next.js 15 / React 19 web app
├── packages/
│   ├── shared/           # Types, constants, schemas
│   ├── probes/           # Probe definitions (one dir per theory)
│   ├── models/           # AI model adapters
│   ├── scorer/           # Scoring & aggregation logic
│   └── supabase/         # DB migrations
├── scripts/
│   └── run-audit.ts      # CLI audit runner
├── turbo.json
├── pnpm-workspace.yaml
└── vitest.config.ts
```

## Running Tests

```bash
pnpm test            # run all tests once
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage report
```

---

**Mukunda Katta** · [Officethree Technologies](https://github.com/MukundaKatta/Office3) · 2026
