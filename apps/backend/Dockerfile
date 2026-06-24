# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS backend (npm workspaces monorepo).
# Build context is the REPOSITORY ROOT (see docker-compose.yml).

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package.json
# Install backend workspace + root deps (incl. dev deps for the build).
RUN npm install --workspace @fintech/backend --include-workspace-root
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# ---------- runtime ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --shell /bin/bash appuser
# Copy the whole built tree (hoisted node_modules + generated client + dist).
COPY --from=build /app ./
WORKDIR /app/apps/backend
USER appuser
EXPOSE 4000
# Apply migrations, run the idempotent seed, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && (npx prisma db seed || true) && node dist/main.js"]
