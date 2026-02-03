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
NODE_VERSION_REQUIRED=18

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

# =============================================================================
# Node.js Detection & Auto-Install
# =============================================================================

install_nodejs() {
  log "Installing Node.js 22.x..."
  
  # Detect OS
  if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    log "Detected Debian/Ubuntu"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [ -f /etc/redhat-release ]; then
    # RHEL/CentOS/Fedora
    log "Detected RHEL/CentOS/Fedora"
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo yum install -y nodejs
  elif [ -f /etc/arch-release ]; then
    # Arch Linux
    log "Detected Arch Linux"
    sudo pacman -S --noconfirm nodejs npm
  elif [ -f /etc/alpine-release ]; then
    # Alpine
    log "Detected Alpine"
    sudo apk add --no-cache nodejs npm
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    log "Detected macOS"
    if command -v brew &> /dev/null; then
      brew install node
    else
      error "Please install Homebrew first: https://brew.sh"
    fi
  else
    error "Unsupported OS. Please install Node.js 18+ manually: https://nodejs.org"
  fi
}

check_nodejs() {
  if ! command -v node &> /dev/null; then
    warn "Node.js not found"
    install_nodejs
  else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$NODE_VERSION_REQUIRED" ]; then
      warn "Node.js $NODE_VERSION found, but $NODE_VERSION_REQUIRED+ required"
      install_nodejs
    fi
  fi
}

# =============================================================================
# Main Installation
# =============================================================================

log "Checking prerequisites..."

# Check/Install Node.js
check_nodejs
success "Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
  error "npm not found (should have been installed with Node.js)"
fi
success "npm $(npm -v)"

# Check git
if ! command -v git &> /dev/null; then
  log "Installing git..."
  if [ -f /etc/debian_version ]; then
    sudo apt-get install -y git
  elif [ -f /etc/redhat-release ]; then
    sudo yum install -y git
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    xcode-select --install 2>/dev/null || true
  fi
fi
success "git $(git --version | cut -d' ' -f3)"

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
npm install --quiet 2>/dev/null || npm install
success "Dependencies ready"

# Optional: Install browser
if [ "${SKIP_BROWSER:-false}" != "true" ]; then
  log "Installing browser (skip with SKIP_BROWSER=true)..."
  npx playwright install chromium 2>/dev/null && success "Chromium installed" || {
    warn "Browser install skipped (run 'npm run install:browser' later)"
  }
else
  warn "Browser install skipped"
fi

# Create .env if missing
if [ ! -f .env ]; then
  cp .env.template .env 2>/dev/null || cat > .env << 'EOF'
# Workspace Tools API Keys
# (Anthropic & channel tokens are configured via 'openclaw init')

# Gemini API (FREE!) - for RAG embeddings
# Get one: https://aistudio.google.com/apikey
GEMINI_API_KEY=

# DeepSeek API - for cheap coding (~$0.14/M tokens)
DEEPSEEK_API_KEY=

# Brave Search API - for web search
BRAVE_API_KEY=
EOF
  success "Created .env (add your Gemini key for RAG)"
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
echo -e "  ${YELLOW}Next step — run the setup wizard:${NC}"
echo ""
echo "     $WORKSPACE/scripts/setup.sh"
echo ""
echo "  This will ask for your API keys and start your agent."
echo ""
echo -e "  ${BLUE}You'll need:${NC}"
echo "  • Anthropic API key: https://console.anthropic.com"
echo "  • Telegram bot token: message @BotFather on Telegram"
echo "  • Gemini API key (free): https://aistudio.google.com/apikey"
echo ""
echo -e "  ${BLUE}Docs:${NC} https://docs.openclaw.ai"
echo ""
