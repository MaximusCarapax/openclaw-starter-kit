#!/bin/bash
#
# OpenClaw Starter Kit - Silent Install
# Zero to AI agent with browser automation & RAG
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/MaximusCarapax/openclaw-starter-kit/main/scripts/silent-install.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"
SECRETS_DIR="$HOME/.openclaw/secrets"

log() { echo -e "${BLUE}[openclaw]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}           🦞 OpenClaw Starter Kit Install                  ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}         Browser Automation • RAG • AI Agent               ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
log "Checking prerequisites..."
if ! command -v node &> /dev/null; then
  error "Node.js not found. Install Node.js 18+: https://nodejs.org"
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VERSION" -lt 18 ] && error "Node.js 18+ required (found: $(node -v))"
success "Node.js $(node -v)"

# Check Docker
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null && docker info &> /dev/null; then
  DOCKER_AVAILABLE=true
  success "Docker available"
else
  warn "Docker not available (ChromaDB will need manual setup)"
fi

# Create directories
log "Creating directories..."
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# Clone starter kit
log "Cloning starter kit..."
if [ -d "$WORKSPACE/.git" ]; then
  warn "Workspace exists, pulling latest..."
  cd "$WORKSPACE" && git pull
else
  rm -rf "$WORKSPACE"
  git clone https://github.com/MaximusCarapax/openclaw-starter-kit.git "$WORKSPACE"
fi
cd "$WORKSPACE"
success "Workspace: $WORKSPACE"

# Install OpenClaw
log "Installing OpenClaw..."
npm install -g openclaw@latest 2>/dev/null || sudo npm install -g openclaw@latest
success "OpenClaw installed"

# Install workspace dependencies
log "Installing dependencies..."
npm install
success "Dependencies installed"

# Install Playwright + Chromium
log "Installing browser (this may take a minute)..."
npm install playwright playwright-extra puppeteer-extra-plugin-stealth 2>/dev/null || true
npx playwright install chromium 2>/dev/null || {
  warn "Chromium install needs deps, trying with sudo..."
  npx playwright install chromium --with-deps 2>/dev/null || warn "Chromium install failed - run manually"
}
success "Browser installed"

# Start ChromaDB
if [ "$DOCKER_AVAILABLE" = true ]; then
  log "Starting ChromaDB..."
  if docker ps -a --format '{{.Names}}' | grep -q "^openclaw-chroma$"; then
    docker start openclaw-chroma 2>/dev/null || true
  else
    docker run -d --name openclaw-chroma -p 8000:8000 chromadb/chroma 2>/dev/null || true
  fi
  success "ChromaDB running on port 8000"
fi

# Create .env if missing
if [ ! -f .env ]; then
  cat > .env << 'EOF'
# Required
ANTHROPIC_API_KEY=

# Channel (pick one)
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=

# RAG (free)
GEMINI_API_KEY=
CHROMA_URL=http://localhost:8000

# Optional
BRAVE_API_KEY=
DEEPSEEK_API_KEY=
EOF
  success "Created .env template"
fi

# Create credentials template
if [ ! -f "$SECRETS_DIR/credentials.json" ]; then
  echo '{"_comment": "Store credentials here"}' > "$SECRETS_DIR/credentials.json"
  chmod 600 "$SECRETS_DIR/credentials.json"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                  ✓ Installation Complete!                  ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Add API keys to $WORKSPACE/.env"
echo "     - ANTHROPIC_API_KEY (required)"
echo "     - TELEGRAM_BOT_TOKEN or DISCORD_BOT_TOKEN"
echo "     - GEMINI_API_KEY (free: https://aistudio.google.com/apikey)"
echo ""
echo "  2. Configure OpenClaw:"
echo "     openclaw init"
echo ""
echo "  3. Start the agent:"
echo "     openclaw gateway start"
echo ""
echo -e "  ${BLUE}Test RAG:${NC}"
echo "     node tools/rag.js add \"Remember this\""
echo "     node tools/rag.js search \"what to remember\""
echo ""
