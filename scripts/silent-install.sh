#!/bin/bash
#
# OpenClaw Starter Kit - Silent Install
# Zero to AI agent in under a minute
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
echo -e "${BLUE}║${NC}              🦞 OpenClaw Starter Kit                       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}            Your AI Agent in Under a Minute                 ${BLUE}║${NC}"
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

if ! command -v npm &> /dev/null; then
  error "npm not found"
fi
success "npm $(npm -v)"

# Create directories
log "Setting up directories..."
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# Clone or update starter kit
log "Getting starter kit..."
if [ -d "$WORKSPACE/.git" ]; then
  cd "$WORKSPACE" && git pull --quiet
  success "Updated existing workspace"
else
  rm -rf "$WORKSPACE" 2>/dev/null || true
  git clone --quiet https://github.com/MaximusCarapax/openclaw-starter-kit.git "$WORKSPACE"
  success "Cloned starter kit"
fi
cd "$WORKSPACE"

# Install OpenClaw CLI
log "Installing OpenClaw..."
npm install -g openclaw@latest 2>/dev/null || {
  warn "Global install failed, trying with sudo..."
  sudo npm install -g openclaw@latest
}
success "OpenClaw CLI installed"

# Install workspace dependencies
log "Installing dependencies..."
npm install --quiet
success "Dependencies ready"

# Optional: Install browser
if [ "${INSTALL_BROWSER:-true}" = "true" ]; then
  log "Installing browser (optional, ~400MB)..."
  npx playwright install chromium 2>/dev/null && success "Chromium installed" || {
    warn "Browser install skipped (run 'npm run install:browser' later)"
  }
fi

# Create .env if missing
if [ ! -f .env ]; then
  cp .env.template .env 2>/dev/null || cat > .env << 'EOF'
# Required
ANTHROPIC_API_KEY=

# Channel (pick one)
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=

# RAG embeddings (free!)
GEMINI_API_KEY=
EOF
  success "Created .env (add your API keys)"
else
  success ".env exists"
fi

# Create secrets template
if [ ! -f "$SECRETS_DIR/credentials.json" ]; then
  echo '{}' > "$SECRETS_DIR/credentials.json"
  chmod 600 "$SECRETS_DIR/credentials.json"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}                  ✓ Installation Complete!                  ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Workspace:${NC} $WORKSPACE"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Add your API keys:"
echo "     nano $WORKSPACE/.env"
echo ""
echo "     Required:"
echo "     - ANTHROPIC_API_KEY (https://console.anthropic.com)"
echo "     - TELEGRAM_BOT_TOKEN or DISCORD_BOT_TOKEN"
echo ""
echo "     Optional (free, for RAG):"
echo "     - GEMINI_API_KEY (https://aistudio.google.com/apikey)"
echo ""
echo "  2. Configure your agent:"
echo "     openclaw init"
echo ""
echo "  3. Start:"
echo "     openclaw gateway start"
echo ""
echo -e "  ${BLUE}Docs:${NC} https://docs.openclaw.ai"
echo ""
