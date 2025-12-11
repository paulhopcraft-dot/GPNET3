# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY drizzle ./drizzle
COPY transcripts ./transcripts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gpnet -u 1001 -G nodejs

# Set ownership
RUN chown -R gpnet:nodejs /app
USER gpnet

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/diagnostics/env || exit 1

# Start the application
CMD ["node", "dist/server/index.js"]
