# Configuration Guide

Detailed setup for getting the most out of your OpenClaw agent.

---

## Table of Contents

1. [API Keys](#api-keys)
2. [Cost Optimization](#cost-optimization)
3. [Heartbeat Setup](#heartbeat-setup)
4. [Model Routing](#model-routing)
5. [Gateway Config](#gateway-config)

---

## API Keys

### Required: Anthropic (Claude)

Your agent's brain. This is the main model that thinks and talks.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add payment method
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-`)

**Setup:**
```bash
openclaw init
# Paste your API key when prompted
```

**Cost:** ~$3-15 per million tokens depending on model

---

### Recommended: OpenRouter (Fallback + More Models)

OpenRouter gives you access to 100+ models through one API. Useful as a fallback and for accessing models like GPT-4, Gemini Pro, etc.

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up and add credits (~$5 minimum)
3. Go to **Keys** → **Create Key**
4. Copy the key (starts with `sk-or-`)

**Setup:**
Add to your `~/.openclaw/openclaw.json` under `providers`:

```json
{
  "providers": {
    "anthropic": { "apiKey": "sk-ant-xxx" },
    "openrouter": { "apiKey": "sk-or-xxx" }
  }
}
```

Or via CLI:
```bash
openclaw config set providers.openrouter.apiKey "sk-or-xxx"
```

**Why use it:**
- Fallback if Anthropic is down
- Access to Gemini, GPT-4, Llama, etc.
- Sometimes cheaper for specific tasks

---

### Recommended: Gemini (FREE Tier)

Google's Gemini has a generous free tier. Perfect for:
- RAG embeddings (vector memory)
- Research summaries
- Grunt work your agent delegates

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the key (starts with `AIza`)

**Setup:**
Add to `~/.openclaw/workspace/.env`:
```bash
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXX
```

**Cost:** FREE up to quota limits (~1500 requests/day, 100/min)

**Pro tip:** Get a second Gemini key from another Google account to double your quota. The starter kit tools support multiple keys.

**Note:** If you hit Gemini quota limits frequently, consider switching to OpenAI embeddings (see below).

---

### Optional: OpenAI (Reliable Embeddings)

If you're hitting Gemini quota limits, OpenAI embeddings are more reliable and surprisingly cheap.

| Provider | Cost | Rate Limits |
|----------|------|-------------|
| Gemini | FREE | 1500/day, 100/min |
| OpenAI | $0.02/M tokens | 10,000/min |

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-proj-`)

**Setup:**

Add to `~/.openclaw/workspace/.env`:
```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

Then update OpenClaw to use OpenAI for embeddings:
```bash
openclaw config set agents.defaults.memorySearch.provider "openai"
openclaw config set env.vars.OPENAI_API_KEY "sk-proj-xxxxx"
openclaw gateway restart
```

**When to switch:**
- You see "quota exceeded" errors in logs
- Heavy usage (lots of memory/session indexing)
- Need rock-solid reliability

**Cost impact:** Minimal. Even heavy usage costs pennies/month.

---

### Optional: DeepSeek (Cheap Coding)

DeepSeek is absurdly cheap for coding tasks (~$0.14/M tokens).

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up and add credits (~$5)
3. Go to **API Keys** → create one

**Setup:**
Add to `~/.openclaw/workspace/.env`:
```bash
DEEPSEEK_API_KEY=sk-xxxxx
```

**Use with Aider:**
```bash
aider --model deepseek/deepseek-chat file1.js file2.js
```

---

### Optional: Brave Search

Web search for your agent. The built-in `web_search` tool uses this.

1. Go to [brave.com/search/api](https://brave.com/search/api/)
2. Sign up for the free tier (2000 queries/month)
3. Copy your API key

**Setup via OpenClaw init** or add to `openclaw.json`:
```json
{
  "webSearch": {
    "braveApiKey": "BSA-xxx"
  }
}
```

---

## Cost Optimization

Running an AI agent 24/7 can get expensive. Here's how to keep costs down:

### The Golden Rule

> **Expensive models think. Cheap models do.**

Your main Claude model (Opus/Sonnet) should plan and orchestrate. Grunt work gets delegated to Gemini (free) or DeepSeek (cheap).

### Model Pricing (as of Feb 2024)

| Model | Input | Output | Use For |
|-------|-------|--------|---------|
| Claude Opus 4 | $15/M | $75/M | Complex reasoning, main brain |
| Claude Sonnet 4 | $3/M | $15/M | General tasks, good balance |
| Claude Haiku 3.5 | $0.80/M | $4/M | Heartbeats, quick checks |
| Gemini Flash | FREE | FREE | Research, summaries |
| Gemini Embeddings | FREE | - | Memory/RAG (quota limited) |
| OpenAI Embeddings | $0.02/M | - | Memory/RAG (reliable) |
| DeepSeek | $0.07/M | $0.14/M | Coding, bulk generation |

### Recommended Setup

| Task | Model | Why |
|------|-------|-----|
| Main conversations | Sonnet 4 | Good balance of smart + affordable |
| Heartbeats | Haiku 3.5 | Just checking if anything needs attention |
| Sub-agents | Sonnet 4 | Smart enough for delegated work |
| Research/summaries | Gemini | FREE |
| Coding | DeepSeek/Aider | $0.14/M tokens |

---

## Heartbeat Setup

Heartbeats let your agent wake up periodically to check things (email, calendar, mentions, etc.) without you prompting.

### Configure Heartbeat Model

By default, heartbeats use your main model. That's expensive for "is anything happening?" checks.

**Use Haiku for heartbeats:**

Edit `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "1h",
        "model": "anthropic/claude-3-5-haiku-latest"
      }
    }
  }
}
```

Or via CLI:
```bash
openclaw config set agents.defaults.heartbeat.model "anthropic/claude-3-5-haiku-latest"
openclaw config set agents.defaults.heartbeat.every "1h"
```

**Cost impact:** Haiku is ~4x cheaper than Sonnet, ~20x cheaper than Opus for these quick checks.

### HEARTBEAT.md

Create `~/.openclaw/workspace/HEARTBEAT.md` to tell your agent what to check:

```markdown
# HEARTBEAT.md

Periodic checks (run 2-4 times per day, skip overnight):

## Priority Checks
- Unread emails that look urgent
- Calendar events in next 2 hours
- Social media mentions/replies

## Skip if:
- Late night (11pm - 8am)
- Already checked within last hour
- Nothing new to report

Track check times in memory/heartbeat-state.json
```

### Heartbeat Frequency

| Frequency | Use Case | Monthly Cost (Haiku) |
|-----------|----------|---------------------|
| 15min | Very responsive, higher cost | ~$5-10 |
| 30min | Good balance | ~$2-5 |
| 1h | Standard, recommended | ~$1-3 |
| 2h | Light use | <$1 |

---

## Model Routing

### Main Model

Your default model for all conversations:

```bash
openclaw config set providers.anthropic.model "claude-sonnet-4-20250514"
```

Options:
- `claude-opus-4-0520` — Smartest, most expensive
- `claude-sonnet-4-20250514` — Recommended default
- `claude-3-5-haiku-latest` — Cheapest, still capable

### Per-Session Override

You can override the model for specific sessions without changing global config:

```
/model sonnet
/model opus
/model haiku
```

### Sub-Agent Models

When your agent spawns sub-agents for tasks, they use the default model unless specified. For cost control:

In your agent's MEMORY.md or instructions:
```markdown
## Sub-Agent Guidelines
- Default sub-agents to Sonnet (not Opus)
- Delegate research to Gemini via tools
- Use DeepSeek for coding tasks
```

---

## Gateway Config

### Optimal Defaults

Apply the starter kit's recommended settings:

```bash
~/.openclaw/workspace/scripts/apply-config.sh
```

This enables:
- Memory search (semantic recall)
- Session memory (remembers past conversations)
- Memory flush on compaction
- 1-hour heartbeat interval
- Concurrent session limits

### Full Config Reference

Your config lives at `~/.openclaw/openclaw.json`. Key sections:

```json
{
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-xxx",
      "model": "claude-sonnet-4-20250514"
    },
    "openrouter": {
      "apiKey": "sk-or-xxx"
    }
  },
  "channels": {
    "telegram": {
      "botToken": "xxx",
      "allowedUsers": [12345]
    }
  },
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "1h",
        "model": "anthropic/claude-3-5-haiku-latest"
      },
      "memorySearch": {
        "enabled": true
      }
    }
  },
  "webSearch": {
    "braveApiKey": "BSA-xxx"
  }
}
```

### Restart After Config Changes

```bash
openclaw gateway restart
```

Or if you use pm2:
```bash
pm2 restart openclaw
```

---

## Quick Reference

### Must Have
- [ ] Anthropic API key (main brain)
- [ ] Telegram bot token (channel)

### Should Have
- [ ] Gemini API key (free research/RAG)
- [ ] Haiku heartbeat configured (cost control)

### Nice to Have
- [ ] OpenRouter (fallback + more models)
- [ ] DeepSeek (cheap coding)
- [ ] Brave Search (web search)
- [ ] Second Gemini key (double free quota)

---

## Troubleshooting

**"Model not found"**
- Check the model name is correct
- Ensure the provider is configured
- Try `openclaw config get providers`

**Heartbeats not firing**
- Check `openclaw gateway logs`
- Verify heartbeat config: `openclaw config get agents.defaults.heartbeat`
- Ensure gateway is running: `pm2 status`

**High costs**
- Switch main model to Sonnet
- Use Haiku for heartbeats
- Reduce heartbeat frequency
- Teach agent to delegate to Gemini/DeepSeek

---

*Part of the [OpenClaw Starter Kit](https://github.com/MaximusCarapax/openclaw-starter-kit)*
