# Worker Dockerfile for Railway deployment
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

# Install dependencies (including all deps needed for worker)
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY src/types ./src/types
COPY src/lib/queue ./src/lib/queue
COPY worker ./worker

# Install dev dependencies for tsx (if not already installed)
RUN npm install tsx dotenv 2>/dev/null || true

# Run the worker
CMD ["npx", "tsx", "worker/index.ts"]
# Trigger redeploy Fri Jan 30 21:03:06 WAT 2026
