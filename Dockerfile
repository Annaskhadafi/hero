# ============================================
# Multi-stage Dockerfile for Dokploy Deployment
# Next.js 15 + Drizzle ORM + PostgreSQL
# ============================================

# Stage 1: Base image
FROM node:20.19-alpine AS base
RUN apk add --no-cache libc6-compat bash curl fontconfig ttf-dejavu ttf-liberation ttf-freefont font-noto postgresql-client
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
# Install all dependencies (production + development) to ensure drizzle-kit is available
RUN npm install --ignore-scripts

# Stage 3: Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
# Aggressive Garbage Collection to keep build memory under 1.5GB RAM
ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DISABLE_SOURCEMAPS=1

RUN npm run build

# Stage 4: Production runner
FROM node:20.19-alpine AS runner
RUN apk add --no-cache libc6-compat bash curl fontconfig ttf-dejavu ttf-liberation ttf-freefont font-noto postgresql-client
WORKDIR /app

ENV NODE_ENV=production

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Setup migration directory
RUN mkdir -p /app/migration && chown nextjs:nodejs /app/migration
COPY --from=builder --chown=nextjs:nodejs /app/drizzle /app/migration/drizzle
COPY --from=builder --chown=nextjs:nodejs /app/db /app/migration/db
COPY --from=builder --chown=nextjs:nodejs /app/scripts/run-docker-migrations.mjs /app/migration/scripts/run-docker-migrations.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/database-url.mjs /app/migration/scripts/database-url.mjs
COPY --from=builder --chown=nextjs:nodejs /app/lib/database-url.ts /app/migration/lib/database-url.ts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts /app/migration/drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json /app/migration/tsconfig.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules /app/migration/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/migration/package.json

# Copy startup script
COPY --chown=nextjs:nodejs docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create .next and backups directories with correct permissions
RUN mkdir -p .next /app/backups && chown -R nextjs:nodejs .next /app/backups

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for Dokploy monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
