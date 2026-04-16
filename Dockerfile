# ============================================
# Multi-stage Dockerfile for Dokploy Deployment
# Next.js 15 + Drizzle ORM + PostgreSQL
# ============================================

# Stage 1: Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
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

RUN npm run build

# Stage 4: Production runner
FROM node:20-alpine AS runner
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
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts /app/migration/drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json /app/migration/tsconfig.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules /app/migration/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/migration/package.json

# Copy startup script
COPY --chown=nextjs:nodejs docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create .next directory with correct permissions for caching
RUN mkdir -p .next && chown nextjs:nodejs .next

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for Dokploy monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
