# Worker Dockerfile for Railway deployment
# Cache bust: v2
FROM node:20-slim

# Install FFmpeg, yt-dlp with impersonation support, and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-dev \
    curl \
    build-essential \
    && pip3 install --break-system-packages yt-dlp curl_cffi \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files - copy worker LAST to ensure changes are picked up
COPY tsconfig.json ./
COPY src/types ./src/types
COPY src/lib/queue ./src/lib/queue

# Force fresh copy of worker directory
COPY worker ./worker

# Verify the fix is present (will show in build logs)
RUN grep -q "impersonate chrome" worker/api.ts && echo "✓ Fix verified: impersonate chrome present" || echo "✗ Fix missing!"
RUN grep -q "bestaudio" worker/api.ts && echo "✗ ERROR: bestaudio still present!" || echo "✓ Fix verified: bestaudio removed"

# Run the worker
CMD ["npx", "tsx", "worker/index.ts"]
