# Model Router Module

Automatically route tasks to the cheapest capable model. Cut costs 70%.

**Status:** 📋 Planned (see [spec](../../docs/MODEL-ROUTER.md))

## What You Get

- **Automatic routing** — Tasks go to the right model without thinking
- **Cost tracking** — See savings in real-time
- **Fallback handling** — If one model fails, try the next
- **Customizable rules** — Adjust routing to your needs

## How It Works

```
┌────────────────────────────────────────────────────────┐
│  Your Agent (Opus/Sonnet)                              │
│  "Summarize this article"                              │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Model Router                                          │
│  Detects: "summarize" task                             │
│  Routes to: Gemini (FREE)                              │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Gemini does the work                                  │
│  Cost: $0.00                                           │
└────────────────────────────────────────────────────────┘
```

## Default Routing

| Task Type | Model | Cost |
|-----------|-------|------|
| summarize | Gemini Flash | FREE |
| research | Gemini Flash | FREE |
| code | DeepSeek | $0.14/M |
| debug | DeepSeek | $0.14/M |
| quick-check | Haiku | $0.80/M |
| reason | Sonnet | $3/M |
| default | Sonnet | $3/M |

## Cost Savings

| Before Router | After Router | Savings |
|---------------|--------------|---------|
| $20/day | $6/day | **70%** |
| $600/month | $180/month | **$420 saved** |

## What's NOT Routed

Your main conversations stay on your primary model (Opus/Sonnet). The router only handles delegated grunt work:

- ✅ Routed: "Summarize this", "Write code for X", "Research Y"
- ❌ Not routed: Your direct conversations, complex reasoning

## Installation

```bash
# Coming soon
~/.openclaw/workspace/scripts/add-module.sh model-router
```

## Documentation

- [Full Specification](../../docs/MODEL-ROUTER.md)
- [Delegation Patterns](../../docs/DELEGATION.md)
