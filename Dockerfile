# OpenClaw Starter Kit - AI Agent in a Box
# 
# Build:
#   docker build -t openclaw/starter-kit .
#
# Run:
#   docker run -d --name openclaw \
#     -v ~/.openclaw/workspace:/home/openclaw/.openclaw/workspace \
#     -v ~/.openclaw/secrets:/home/openclaw/.openclaw/secrets:ro \
#     -e ANTHROPIC_API_KEY=sk-xxx \
#     -e TELEGRAM_BOT_TOKEN=xxx \
#     -p 3000:3000 \
#     openclaw/starter-kit

FROM node:22-bookworm-slim

LABEL org.opencontainers.image.title="OpenClaw Starter Kit"
LABEL org.opencontainers.image.description="AI Agent with browser automation, RAG, and channel integrations"
LABEL org.opencontainers.image.url="https://openclaw.ai"
LABEL org.opencontainers.image.source="https://github.com/MaximusCarapax/openclaw-starter-kit"

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash openclaw && \
    mkdir -p /home/openclaw/.openclaw/{workspace,secrets} && \
    chown -R openclaw:openclaw /home/openclaw

WORKDIR /home/openclaw

# Install OpenClaw globally
RUN npm install -g openclaw@latest

USER openclaw

# Install Playwright and Chromium
RUN npx playwright install chromium

# Copy starter kit as default workspace
WORKDIR /home/openclaw/.openclaw/workspace
COPY --chown=openclaw:openclaw . .

# Install workspace dependencies
RUN npm install

# Volume mounts for persistence
VOLUME ["/home/openclaw/.openclaw/workspace", "/home/openclaw/.openclaw/secrets"]

EXPOSE 3000

CMD ["openclaw", "gateway", "start", "--foreground"]
