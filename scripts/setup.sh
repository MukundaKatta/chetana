#!/bin/bash
# Chetana — Quick Setup Script
# Gets you running in under 2 minutes

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  चेतना  CHETANA — Setup                     ║"
echo "║  AI Consciousness Research Platform          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
echo "  ✓ Node.js $(node -v)"

if ! command -v pnpm &> /dev/null; then
  echo "  ✗ pnpm not found. Installing..."
  npm install -g pnpm
fi
echo "  ✓ pnpm $(pnpm -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Create .env.local if it doesn't exist
if [ ! -f apps/web/.env.local ]; then
  echo ""
  echo "Creating apps/web/.env.local..."
  cat > apps/web/.env.local << 'EOF'
# Chetana Configuration
# The app works in DEMO MODE without Supabase.
# Just add an AI provider key below to run audits.

# ─── AI Provider Keys (add at least one) ───
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# ─── Optional: Supabase (for auth, persistence, multi-user) ───
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# ─── Optional: Stripe (for paid tiers) ───
# STRIPE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
  echo "  ✓ Created apps/web/.env.local"
  echo ""
  echo "  ⚠  Add your API key to apps/web/.env.local:"
  echo "     ANTHROPIC_API_KEY=sk-ant-..."
  echo "     or OPENAI_API_KEY=sk-..."
  echo ""
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Setup complete!                             ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  Start the app:                              ║"
echo "║    pnpm dev                                  ║"
echo "║                                              ║"
echo "║  Run CLI audit:                              ║"
echo "║    npx tsx scripts/run-audit.ts              ║"
echo "║                                              ║"
echo "║  Run tests:                                  ║"
echo "║    pnpm test                                 ║"
echo "║                                              ║"
echo "║  Open: http://localhost:3000                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
