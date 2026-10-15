FROM node:24-alpine

WORKDIR /usr/src/app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code and static assets
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=4000
ENV TEST_SITE_PORT=5500

# Expose API/dashboard port and test-site port
EXPOSE 4000 5500

# Health check against health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application server
CMD ["node", "src/server.js"]
