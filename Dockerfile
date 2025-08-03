# Multi-stage Docker build for AABot
FROM node:20-alpine AS base

# Install production dependencies only
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install ALL dependencies (including dev dependencies for building)
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install postgresql-client for pg_isready
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 aabot

# Copy built application
COPY --from=builder --chown=aabot:nodejs /app/dist ./dist
COPY --from=builder --chown=aabot:nodejs /app/package.json ./package.json
COPY --from=builder --chown=aabot:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Copy production node_modules
COPY --from=deps --chown=aabot:nodejs /app/node_modules ./node_modules

# Copy initialization script
COPY --chown=aabot:nodejs docker-init.sh ./docker-init.sh
RUN chmod +x ./docker-init.sh

USER aabot

EXPOSE 5000

ENV PORT=5000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/bot/status', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["./docker-init.sh"]