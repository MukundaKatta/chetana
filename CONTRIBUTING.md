# Contributing to Chetana

Thank you for your interest in contributing to Chetana! Whether you're fixing a bug, adding a new consciousness probe, integrating a model provider, or improving documentation, your contributions are welcome and valued.

## Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/chetana.git
cd chetana

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Fill in your API keys and Supabase credentials

# 4. Start the development server
pnpm dev
# App runs at http://localhost:3000
```

### Prerequisites

- Node.js 18+
- pnpm 8+
- A Supabase project (for auth and storage)
- At least one AI provider API key

## Project Structure

```
chetana/
├── apps/
│   └── web/              # Next.js 15 web application
├── packages/
│   ├── shared/           # Shared types, constants, schemas
│   ├── probes/           # Probe definitions (one directory per theory)
│   ├── models/           # AI model adapters (Anthropic, OpenAI, Google, Ollama)
│   ├── scorer/           # Scoring pipeline and aggregation logic
│   └── supabase/         # Database migrations and schema
├── scripts/              # CLI tools and utilities
├── turbo.json            # Turborepo configuration
└── pnpm-workspace.yaml   # Workspace definition
```

## How To

### Add a Probe

1. Identify which consciousness theory your probe targets (GWT, IIT, HOT, RPT, PP, or AST).
2. Create a new file in `packages/probes/src/<theory>/` following the existing probe format.
3. Export your probe from the theory's index file.
4. Add corresponding indicator metadata in `packages/shared` if it is a new indicator.
5. Write unit tests in the same directory with a `.test.ts` suffix.

### Add a Model Provider

1. Create a new adapter file in `packages/models/src/providers/`.
2. Implement the standard model interface (see existing adapters for reference).
3. Export the provider from `packages/models/src/index.ts`.
4. Add the required environment variable to `.env.example`.
5. Document any provider-specific configuration.

### Add a UI Component

1. Create the component in `apps/web/components/`.
2. Use TypeScript with strict types (no `any`).
3. Style with Tailwind CSS utility classes.
4. Export from the appropriate barrel file.
5. If the component is reusable across pages, consider placing it in a shared `ui/` subdirectory.

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Branch naming conventions:**
   - `feat/` - new features
   - `fix/` - bug fixes
   - `docs/` - documentation changes
   - `refactor/` - code refactoring
   - `test/` - test additions or fixes

3. **Commit conventions** (Conventional Commits):
   ```
   feat: add new metacognition probe
   fix: correct scoring weight for IIT theory
   docs: update API documentation
   test: add unit tests for scorer pipeline
   ```

4. **Before submitting:**
   - Run `pnpm test` and ensure all tests pass.
   - Run `pnpm lint` and fix any issues.
   - Ensure there are no TypeScript errors (`pnpm typecheck`).
   - Update documentation if your change affects the public API.

5. **Submit a PR** against the `main` branch with a clear description of your changes.

## Code Standards

- **TypeScript strict mode** is enabled. Do not use `// @ts-ignore` or `as any`.
- **No `any` types.** Use `unknown` and narrow with type guards when the type is uncertain.
- **Tailwind CSS** for all styling. No inline styles or CSS modules.
- **Functional components** with hooks for React code.
- **Named exports** preferred over default exports.
- **Descriptive variable names.** Avoid abbreviations unless they are widely understood.

## Testing

- **Unit tests:** [Vitest](https://vitest.dev/) for all packages and utility functions.
  ```bash
  pnpm test           # run once
  pnpm test:watch     # watch mode
  pnpm test:coverage  # with coverage
  ```
- **End-to-end tests:** [Playwright](https://playwright.dev/) for critical user flows.
  ```bash
  pnpm test:e2e
  ```
- Write tests for new features and bug fixes.
- Aim for meaningful coverage of logic, not 100% line coverage for its own sake.

## Getting Help

If you have questions or need guidance, feel free to open a discussion or reach out via an issue. We're happy to help you get started.
