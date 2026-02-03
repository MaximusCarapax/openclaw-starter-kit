# OpenClaw Starter Kit

A structured bootstrap template for setting up AI agents with [OpenClaw](https://github.com/openclaw/openclaw).

## Prerequisites

Before you start:

1. **Install OpenClaw**
   ```bash
   npm install -g openclaw
   ```
   Or see full instructions: https://github.com/openclaw/openclaw

2. **Get an Anthropic API Key** (Required)
   - Sign up: https://console.anthropic.com
   - Create an API key
   - This powers Claude (the brain)

3. **Set up a Messaging Channel** (pick one)
   
   | Channel | Difficulty | How |
   |---------|------------|-----|
   | **Telegram** | ⭐ Easiest | Message [@BotFather](https://t.me/BotFather), create bot, get token |
   | **Discord** | ⭐⭐ Easy | [Developer Portal](https://discord.com/developers), create app + bot |
   | **Slack** | ⭐⭐⭐ Medium | Create Slack App, configure OAuth |

   **Recommended:** Start with Telegram — fastest path to "hello world".

---

## Quick Start

### 1. Clone this repo as your workspace
```bash
git clone https://github.com/MaximusCarapax/openclaw-starter-kit ~/.openclaw/workspace
```

### 2. Set up your API keys

Create `~/.openclaw/secrets/credentials.json`:
```json
{
  "anthropic": {
    "apiKey": "sk-ant-api03-..."
  },
  "openai": {
    "apiKey": "sk-..."
  },
  "deepseek": {
    "apiKey": "sk-..."
  },
  "gemini": {
    "apiKey": "AIza..."
  }
}
```

**Required:** `anthropic`  
**Recommended:** `openai` (for embeddings/memory search)  
**Optional:** `deepseek`, `gemini` (cheap model routing)

### 3. Configure your messaging channel

For Telegram, add to `~/.openclaw/openclaw.json`:
```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_BOT_TOKEN_FROM_BOTFATHER",
      "dmPolicy": "pairing",
      "streamMode": "partial"
    }
  }
}
```

For Discord, see: https://docs.openclaw.ai/channels/discord

### 4. Start OpenClaw
```bash
openclaw gateway start
```

### 5. Message your bot

Open Telegram, find your bot, send `/start` or just say "hello".

---

## How It Works

```
You clone this repo
       ↓
You start OpenClaw + connect via Telegram/Discord
       ↓
The AGENT reads BOOTSTRAP.md
       ↓
Agent guides YOU through setup (conversational)
       ↓
BOOTSTRAP.md gets deleted when complete
       ↓
You have a configured, personalized AI agent
```

The `BOOTSTRAP.md` file is **instructions for the agent**, not for you. The agent will walk you through everything.

---

## What's Included

```
├── BOOTSTRAP.md              # Setup guide (for the agent to follow)
├── config/
│   └── optimal-defaults.json # Pre-optimized gateway config
├── personas/
│   ├── SOUL-assistant-mode.md    # Reactive assistant template
│   └── SOUL-cos-mode.md          # Proactive Chief of Staff template
├── templates/
│   └── HEARTBEAT-template.md     # Periodic check-in template
└── tools/
    ├── code.js               # Routes to cheap models
    ├── deepseek.js           # Coding workhorse ($0.14/M tokens)
    ├── gemini.js             # Free summaries & research
    ├── rag.js                # Brain dump memory
    ├── rag-docs.js           # Document RAG ingestion
    └── microsoft-graph-template.js  # MS 365 integration
```

---

## Bootstrap Phases

| Phase | What | How |
|-------|------|-----|
| **0** | Config optimization | Silent — memory search, embeddings, heartbeat |
| **1** | Install workhorses | Silent — DeepSeek, Gemini, RAG tools |
| **2** | Getting to know you | Conversational — identity, preferences, operating mode |
| **3** | Integrations | Guided — email, calendar, task management |
| **4** | Wrap up | Summarize, first memory entry, set expectations |

---

## Operating Modes

During setup, you'll choose between:

### Assistant Mode
- Reactive — waits for instructions
- Helpful and reliable
- No autonomous actions

### Chief of Staff Mode
- Proactive — generates ideas, identifies opportunities
- Works overnight on your backlog
- Reports what it accomplished
- Cron jobs for idea generation & night shift work

---

## API Keys Reference

| Key | Purpose | Required? | Get it |
|-----|---------|-----------|--------|
| **Anthropic** | Claude (the brain) | ✅ Required | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | Embeddings (memory search) | Recommended | [platform.openai.com](https://platform.openai.com) |
| Gemini | Free summaries | Optional | [aistudio.google.com](https://aistudio.google.com) |
| DeepSeek | Cheap coding | Optional | [platform.deepseek.com](https://platform.deepseek.com) |
| Brave Search | Web search | Optional | [brave.com/search/api](https://brave.com/search/api) |

---

## Cost Optimization

Built-in model routing keeps costs down:

| Model | Use for | Cost |
|-------|---------|------|
| **Claude Opus** | Brain, conversations, decisions | ~$15-75/M tokens |
| **Claude Sonnet** | Quick tasks (fallback) | ~$3-15/M tokens |
| **DeepSeek** | Coding, tool building | ~$0.14/M tokens |
| **Gemini** | Summaries, research | FREE |

**Typical cost:** $5-15/day for active use.

---

## Supported Integrations

- **Microsoft 365**: Outlook, Calendar, To Do, Teams
- **Google Workspace**: Gmail, Calendar, Drive
- **Task Management**: Linear, Notion, Todoist
- **Social**: X/Twitter, LinkedIn

---

## Enterprise Deployment

For secure enterprise deployment:

- **AWS Bedrock** — Claude runs in your AWS account, data never leaves
- **Team isolation** — Separate OpenClaw instances per team
- **Compliance** — SOC2, HIPAA eligible via Bedrock

See `BOOTSTRAP.md` for architecture guidance.

---

## Troubleshooting

**"openclaw: command not found"**
```bash
npm install -g openclaw
```

**"No API key found"**
Check `~/.openclaw/secrets/credentials.json` exists and has valid keys.

**Bot not responding**
1. Check gateway is running: `openclaw gateway status`
2. Check bot token is correct
3. Check you've messaged the bot first (Telegram requires this)

---

## License

MIT — Use freely, attribution appreciated.

---

Built with 🦀 by [Maximus Carapax](https://x.com/MaximusCarapax)
