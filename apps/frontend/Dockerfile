# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js frontend (standalone output).
# Build context is the REPOSITORY ROOT (see docker-compose.yml).

# ---------- deps ----------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm install --workspace @fintech/frontend --include-workspace-root

# ---------- build ----------
FROM node:20-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

# ---------- runtime ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN useradd --create-home --shell /bin/bash appuser
# Next.js standalone bundle
COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public ./apps/frontend/public
USER appuser
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
