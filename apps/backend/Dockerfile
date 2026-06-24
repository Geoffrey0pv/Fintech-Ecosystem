# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS backend (npm workspaces monorepo).
# Build context is the REPOSITORY ROOT (see docker-compose.yml).

# ---------- deps ----------
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm install --workspace @fintech/backend --include-workspace-root

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# ---------- runtime ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# non-root user
RUN useradd --create-home --shell /bin/bash appuser
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
COPY package.json ./package.json
WORKDIR /app/apps/backend
USER appuser
EXPOSE 4000
# Run migrations + (idempotent) seed, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && (npx prisma db seed || true) && node dist/main.js"]
