# Dashboard Module

A modern web dashboard to monitor and manage your agent.

**Status:** 📋 Planned (see [spec](../../docs/DASHBOARD-SPEC.md))

## What You Get

- **Health monitoring** — See which integrations are working
- **Cost tracking** — Know what you're spending in real-time
- **Task management** — Track todos and projects
- **Contact CRM** — Manage relationships
- **Error logs** — Know when things break
- **Activity feed** — See what your agent did

## Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent Dashboard                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ HEALTH       │ │ TODAY'S COST │ │ TASKS        │            │
│  │     🟢       │ │    $2.45     │ │   3 todo     │            │
│  │  All systems │ │  ↑12% vs avg │ │   1 overdue  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- SQLite (via better-sqlite3)
- Server-Sent Events for real-time

## Installation

```bash
# Coming soon
~/.openclaw/workspace/scripts/add-module.sh dashboard
```

## Documentation

- [Full Specification](../../docs/DASHBOARD-SPEC.md)
- [Database Schema](../../docs/DATABASE.md)
