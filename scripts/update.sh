#!/bin/bash
#
# Update OpenClaw Starter Kit
# Pulls latest changes and restarts the gateway
#

set -e

WORKSPACE="${WORKSPACE:-$HOME/.openclaw/workspace}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}[openclaw]${NC} Updating starter kit..."

cd "$WORKSPACE"

# Stash any local changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}[!]${NC} Stashing local changes..."
  git stash
  STASHED=true
fi

# Pull latest
git pull origin main

# Restore local changes
if [ "$STASHED" = true ]; then
  echo -e "${BLUE}[openclaw]${NC} Restoring local changes..."
  git stash pop || true
fi

# Update dependencies
echo -e "${BLUE}[openclaw]${NC} Updating dependencies..."
npm install --quiet

# Update OpenClaw CLI
echo -e "${BLUE}[openclaw]${NC} Updating OpenClaw CLI..."
npm install -g openclaw@latest 2>/dev/null || sudo npm install -g openclaw@latest

# Restart gateway if running
if command -v pm2 &> /dev/null && pm2 list | grep -q "openclaw"; then
  echo -e "${BLUE}[openclaw]${NC} Restarting gateway (pm2)..."
  pm2 restart openclaw
elif pgrep -f "openclaw gateway" > /dev/null; then
  echo -e "${BLUE}[openclaw]${NC} Restarting gateway..."
  openclaw gateway restart
fi

echo ""
echo -e "${GREEN}[✓]${NC} Update complete!"
echo ""
