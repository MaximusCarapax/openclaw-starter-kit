#!/bin/bash
#
# Apply optimal OpenClaw config
# Run this AFTER 'openclaw init'
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/config-optimal-defaults.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[openclaw]${NC} Applying optimal config..."

# Check if openclaw.json exists
if [ ! -f ~/.openclaw/openclaw.json ]; then
  echo -e "${RED}[✗]${NC} ~/.openclaw/openclaw.json not found"
  echo "    Run 'openclaw init' first, then run this script."
  exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}[✗]${NC} Config file not found: $CONFIG_FILE"
  exit 1
fi

# Apply the config patch using node (openclaw gateway might not be running)
node -e "
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME, '.openclaw/openclaw.json');
const patchPath = '$CONFIG_FILE';

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

// Deep merge function
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const merged = deepMerge(config, patch);
fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
console.log('Config merged successfully');
"

echo -e "${GREEN}[✓]${NC} Optimal config applied!"
echo ""
echo "    Enabled:"
echo "    • Memory search (memory + sessions)"
echo "    • Memory flush on compaction"
echo "    • Hourly heartbeat"
echo "    • Concurrent sub-agents (4 main, 8 sub)"
echo ""
echo -e "    ${YELLOW}Restart the gateway to apply:${NC}"
echo "    openclaw gateway restart"
echo ""
