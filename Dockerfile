FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./

# Copy source files
COPY src ./src

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built dist folder from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server ./server
COPY tsconfig.json ./

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["tsx", "server/index.ts"]

