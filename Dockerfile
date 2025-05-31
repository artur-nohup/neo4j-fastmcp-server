# Multi-stage build for Neo4j FastMCP Server
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nextjs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application and node_modules from builder
COPY --from=builder --chown=nextjs:nextjs /app/dist ./dist
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package*.json ./

# Copy docker-specific files
COPY --chown=nextjs:nextjs docker-compose.yml ./

# Create health check script
RUN echo '#!/bin/sh\nwget --quiet --tries=1 --spider http://localhost:8080/health || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh && \
    chown nextjs:nextjs /app/healthcheck.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD /app/healthcheck.sh

# Set environment variables with defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV MCP_SERVER_NAME=neo4j-memory-mcp
ENV MCP_SERVER_VERSION=1.0.0

# Start the application
CMD ["node", "dist/index.js"]