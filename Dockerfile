# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/models/package.json ./packages/models/
COPY packages/probes/package.json ./packages/probes/
COPY packages/scorer/package.json ./packages/scorer/

RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/models/node_modules ./packages/models/node_modules
COPY --from=deps /app/packages/probes/node_modules ./packages/probes/node_modules
COPY --from=deps /app/packages/scorer/node_modules ./packages/scorer/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
COPY packages/models ./packages/models
COPY packages/probes ./packages/probes
COPY packages/scorer ./packages/scorer

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @chetana/web build

# Stage 3: Production runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache libc6-compat curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/web/public ./public
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
