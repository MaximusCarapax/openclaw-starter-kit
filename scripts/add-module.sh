#!/bin/bash

# Add optional module to your OpenClaw agent
# Usage: ./add-module.sh <module-name>

set -e

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MODULES_DIR="$WORKSPACE/modules"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    echo "Usage: $0 <module-name>"
    echo ""
    echo "Available modules:"
    echo "  dashboard      - Web UI for health, costs, tasks"
    echo "  dev-pipeline   - Idea → spec → build → deploy workflow"
    echo "  model-router   - Auto-route tasks to cheapest model"
    echo ""
    echo "Example:"
    echo "  $0 dashboard"
}

check_module_exists() {
    local module=$1
    if [ ! -d "$MODULES_DIR/$module" ]; then
        echo -e "${RED}Error: Module '$module' not found${NC}"
        echo "Available modules: dashboard, dev-pipeline, model-router"
        exit 1
    fi
}

install_dashboard() {
    echo -e "${YELLOW}Dashboard module is not yet built.${NC}"
    echo ""
    echo "See the specification: docs/DASHBOARD-SPEC.md"
    echo "Want to help build it? PRs welcome!"
    echo ""
    echo "What it will include:"
    echo "  - Next.js 14 web dashboard"
    echo "  - Health monitoring"
    echo "  - Cost tracking"
    echo "  - Task management"
    echo "  - Contact CRM"
    exit 0
}

install_dev_pipeline() {
    echo -e "${YELLOW}Dev Pipeline module is not yet built.${NC}"
    echo ""
    echo "See the specification: docs/DEV-PIPELINE.md"
    echo "Want to help build it? PRs welcome!"
    echo ""
    echo "What it will include:"
    echo "  - Feature/spec/task tracking"
    echo "  - Kanban workflow"
    echo "  - CI/CD integration"
    echo "  - GitHub Actions templates"
    exit 0
}

install_model_router() {
    echo -e "${YELLOW}Model Router module is not yet built.${NC}"
    echo ""
    echo "See the specification: docs/MODEL-ROUTER.md"
    echo "Want to help build it? PRs welcome!"
    echo ""
    echo "What it will include:"
    echo "  - Automatic task-to-model routing"
    echo "  - Cost tracking integration"
    echo "  - Customizable routing rules"
    exit 0
}

# Main
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

MODULE=$1

case $MODULE in
    -h|--help)
        show_help
        exit 0
        ;;
    dashboard)
        install_dashboard
        ;;
    dev-pipeline)
        install_dev_pipeline
        ;;
    model-router)
        install_model_router
        ;;
    *)
        echo -e "${RED}Unknown module: $MODULE${NC}"
        show_help
        exit 1
        ;;
esac
