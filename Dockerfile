# ─────────────────────────────────────────────────────────────────────────────
# Preventli — Production Dockerfile
# Multi-stage build: builder compiles TypeScript + Vite, runner is lean.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Install ALL deps (including devDeps needed for build)
RUN npm ci --prefer-offline && npm cache clean --force

# ── Stage 2: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Build Vite frontend + compile TypeScript server
# Output: dist/ (frontend) + dist-server/ (server JS)
RUN npm run build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S preventli && \
    adduser -S -u 1001 -G preventli preventli

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --prefer-offline && npm cache clean --force

# Copy Vite build output (contains public assets)
COPY --from=builder --chown=preventli:preventli /app/dist ./dist

# Copy static assets and config needed at runtime
COPY --from=builder --chown=preventli:preventli /app/config ./config
COPY --from=builder --chown=preventli:preventli /app/shared ./shared
COPY --from=builder --chown=preventli:preventli /app/server ./server
COPY --from=builder --chown=preventli:preventli /app/vite.config.ts ./vite.config.ts
COPY --from=builder --chown=preventli:preventli /app/tsconfig.json ./tsconfig.json

# Create runtime directories that the app expects to write to
RUN mkdir -p uploads/employer-cases transcripts && \
    chown -R preventli:preventli uploads transcripts

# Switch to non-root
USER preventli

# Application port (must match PORT env var, default 5000)
EXPOSE 5000

# Health check — hits the /api/system/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/system/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Runtime: Node with tsx ESM loader (matches existing start script)
CMD ["npm", "run", "start"]
