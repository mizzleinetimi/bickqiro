# Worker Dockerfile for Railway deployment
FROM node:20-slim

# Install FFmpeg, yt-dlp, and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && pip3 install --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY tsconfig.json ./
COPY src/types ./src/types
COPY src/lib/queue ./src/lib/queue
COPY worker ./worker

# Install dev dependencies for tsx
RUN npm install tsx dotenv

# Run the worker
CMD ["npx", "tsx", "worker/index.ts"]
