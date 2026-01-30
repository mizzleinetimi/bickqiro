# Worker Dockerfile for Railway deployment
# Cache bust: v3 - 2026-01-31
FROM node:20-slim

# Install FFmpeg, yt-dlp with impersonation support, and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-dev \
    curl \
    build-essential \
    && pip3 install --break-system-packages --no-cache-dir yt-dlp curl_cffi \
    && rm -rf /var/lib/apt/lists/* \
    && echo "yt-dlp version:" && yt-dlp --version \
    && echo "curl_cffi installed:" && python3 -c "import curl_cffi; print('OK')"

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
RUN echo "=== Verifying worker/api.ts ===" \
    && grep "impersonate chrome" worker/api.ts && echo "✓ impersonate chrome: FOUND" \
    && ! grep "\-f bestaudio" worker/api.ts && echo "✓ -f bestaudio: REMOVED" \
    && echo "=== Verification complete ==="

# Run the worker
CMD ["npx", "tsx", "worker/index.ts"]
