# Modules

Optional add-ons to extend your agent's capabilities.

## Available Modules

| Module | Description | Status |
|--------|-------------|--------|
| [dashboard](dashboard/) | Web UI for health, costs, tasks, contacts | 📋 Planned |
| [dev-pipeline](dev-pipeline/) | Idea → spec → build → deploy workflow | 📋 Planned |
| [model-router](model-router/) | Auto-route tasks to cheapest model | 📋 Planned |

## Installation

```bash
# Install a module
~/.openclaw/workspace/scripts/add-module.sh <module-name>

# Examples
~/.openclaw/workspace/scripts/add-module.sh dashboard
~/.openclaw/workspace/scripts/add-module.sh dev-pipeline
~/.openclaw/workspace/scripts/add-module.sh model-router
```

## Learning Path

1. **Start with core** — Get your agent running first
2. **Add dashboard** — See what your agent is doing
3. **Add model-router** — Cut costs 70%
4. **Add dev-pipeline** — Let your agent build features

Each module has its own README with setup instructions.
