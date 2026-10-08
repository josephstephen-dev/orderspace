# syntax=docker/dockerfile:1

# =============================================================================
# Orderspace API - multi-stage production image
#   Stage 1 (deps)    install dependencies from the lockfile
#   Stage 2 (builder) generate the Prisma client and compile TypeScript
#   Stage 3 (runner)  minimal runtime image that migrates, then serves the API
# =============================================================================

# Keep this in sync with "packageManager" in package.json
ARG PNPM_VERSION=11.11.0


# -----------------------------------------------------------------------------
# Stage 1: Install dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# The wildcard keeps pnpm-workspace.yaml optional but includes it when present
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

RUN pnpm install --frozen-lockfile


# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

# No real database is needed at build time: prisma generate only reads the schema
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/orderspace" \
    pnpm prisma:generate

RUN pnpm build


# -----------------------------------------------------------------------------
# Stage 3: Production runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

ARG PNPM_VERSION

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Compiled application
COPY --from=builder --chown=node:node /app/dist ./dist

# Dependencies (the Prisma CLI is needed at runtime for "migrate deploy")
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Generated Prisma client
COPY --from=builder --chown=node:node /app/src/generated ./src/generated

# Prisma schema, migrations, and config (needed by "migrate deploy")
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

# Needed by some packages at runtime
COPY --chown=node:node package.json ./

# Run as the unprivileged "node" user instead of root
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/api || exit 1

# Apply pending migrations first, then start the server.
# DATABASE_URL and the other secrets are injected by the hosting platform at
# container start. They are not available at build time.
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma.config.ts && node dist/src/main"]