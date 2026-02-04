# Dev Pipeline Module

Turn your agent into a junior developer. Ideas become deployed features.

**Status:** 📋 Planned (see [spec](../../docs/DEV-PIPELINE.md))

## What You Get

- **Idea capture** — Random thoughts become tracked features
- **Spec writing** — Agent fleshes out requirements
- **Task breakdown** — Features become implementable chunks
- **Progress tracking** — Kanban board for development
- **CI/CD integration** — Auto-deploy when tests pass

## The Workflow

```
💡 Idea ──→ 📋 Spec ──→ ✅ Ready ──→ 🔨 Build ──→ 🚀 Deploy
              ↑                         ↑
        Agent writes            Agent codes
        Human approves          Human reviews PR
```

## Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  Development Pipeline                              [+ New Idea] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💡 Ideas   📋 Speccing   ✅ Ready   🔨 Building   🚀 Deployed  │
│     (4)        (1)          (2)         (1)           (12)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principle

**Agent does the work. Human approves at gates.**

You're not coding — you're reviewing and approving. The agent:
- Writes specs
- Breaks into tasks
- Writes code
- Opens PRs

You:
- Approve specs
- Review PRs
- Make judgment calls

## Installation

```bash
# Coming soon
~/.openclaw/workspace/scripts/add-module.sh dev-pipeline
```

## Documentation

- [Full Specification](../../docs/DEV-PIPELINE.md)
- [Database Schema](../../docs/DATABASE.md)
