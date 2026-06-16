# syntax=docker/dockerfile:1
#
# Multi-stage, multi-target build for the Timsan monorepo.
# Targets:
#   web    — Next.js standalone server (apps/web)
#   worker — BullMQ worker (apps/worker), run via tsx
# Base is Debian (bookworm) slim so native deps (argon2, Prisma engines) build
# cleanly without musl quirks. Build and runtime share the same base → ABI-safe.

# ─── Base: Node 20 (Debian slim) + pnpm via corepack ──────────────────────────
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# openssl + ca-certificates are required by Prisma's query engine at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ─── deps: install every workspace dependency (incl. dev — needed for the Next
#     build and for running the worker through tsx) ──────────────────────────--
FROM base AS deps
# Toolchain for compiling native modules (argon2) when no prebuilt is available.
# Lives only in this build-time stage; never shipped in the runtime images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# Copy manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/domain/package.json packages/domain/
COPY packages/payments/package.json packages/payments/
COPY packages/search/package.json packages/search/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
# The @timsan/db postinstall runs `prisma generate`, so the schema must be
# present before install. Copying it here keeps install lifecycle scripts happy
# (and builds the argon2 native binding in the same step).
COPY packages/db/prisma packages/db/prisma
RUN pnpm install --frozen-lockfile

# ─── build: generate Prisma client + build the Next.js app ────────────────────
FROM deps AS build
# Cap V8 heap so `next build` doesn't OOM-kill on a 4 GB box (see deploy plan).
ENV NODE_OPTIONS=--max-old-space-size=2048
COPY . .
# Ensure the Prisma client exists (idempotent; generated/ is .dockerignored).
RUN pnpm --filter @timsan/db generate
# SKIP_ENV_VALIDATION lets `next build` run without real secrets
# (supported in packages/shared/src/env.ts).
RUN SKIP_ENV_VALIDATION=true pnpm --filter @timsan/web build

# ─── web: Next.js standalone runtime (slim) ───────────────────────────────────
FROM base AS web
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone output ships its own traced, minimal node_modules.
# Monorepo gotcha: server.js lives at the nested apps/web/ path inside it.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ─── worker: BullMQ worker runtime ────────────────────────────────────────────
# Workspace packages export TS source (./src/index.ts), so the worker runs
# through tsx, which transpiles those imports on the fly. node_modules + the
# whole packages/ tree are copied so the pnpm workspace symlinks resolve.
FROM base AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker ./apps/worker
CMD ["node_modules/.bin/tsx", "apps/worker/src/index.ts"]
