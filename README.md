# OpenClaw Starter Kit

Your AI agent in under 5 minutes. No Docker. No Python. Two commands.

## Quick Start

### 1. Install
```bash
curl -fsSL https://raw.githubusercontent.com/MaximusCarapax/openclaw-starter-kit/main/scripts/silent-install.sh | bash
```

### 2. Setup
```bash
~/.openclaw/workspace/scripts/setup.sh
```

The setup wizard will ask for your API keys, configure everything, and start your agent.

### 3. Message your bot
Open Telegram, find your bot, say "hello". 🎉

---

## What You Need

### VPS / Server

| Provider | Price | Free Credit | Notes |
|----------|-------|-------------|-------|
| **[Zeabur](https://zeabur.com)** | Pay-as-you-go | - | Easiest, auto-deploys from GitHub |
| **[DigitalOcean](https://digitalocean.com)** | $6/mo | $200 credit | Popular, reliable |
| **[Vultr](https://vultr.com)** | $5/mo | $100 credit | Global locations |
| **[Hetzner](https://hetzner.com)** | €4/mo | - | Cheapest, EU-based |

**Minimum specs:** 1 CPU, 1GB RAM, 25GB disk

### API Keys

| Key | Required? | Get it |
|-----|-----------|--------|
| **Anthropic** | ✅ Yes | [console.anthropic.com](https://console.anthropic.com) |
| **Telegram bot** | ✅ Yes | Message [@BotFather](https://t.me/BotFather) → `/newbot` |
| **Gemini** | Recommended (free) | [aistudio.google.com](https://aistudio.google.com/apikey) |
| **DeepSeek** | Optional | [platform.deepseek.com](https://platform.deepseek.com) |

---

## How It Works

```
curl ... | bash     →  Installs Node.js, OpenClaw, dependencies
       ↓
./setup.sh          →  Asks for API keys, configures everything, starts gateway
       ↓
Message your bot    →  Agent reads BOOTSTRAP.md, guides you through personalization
       ↓
You have a personalized AI agent
```

---

## What's Included

```
├── BOOTSTRAP.md              # Agent's setup guide (it reads this)
├── personas/
│   ├── SOUL-assistant-mode.md    # Reactive assistant template
│   └── SOUL-cos-mode.md          # Proactive Chief of Staff template
├── tools/
│   ├── rag.js                # Vector memory (free Gemini embeddings)
│   ├── gemini.js             # Free AI for grunt work
│   ├── deepseek.js           # Cheap coding (~$0.14/M tokens)
│   ├── code.js               # Routes to cheapest model
│   ├── gmail.js              # Email (read, search, draft)
│   ├── google-calendar.js    # Calendar (events, free time)
│   ├── notion.js             # Notes, databases, tasks
│   ├── totp.js               # 2FA code generator (no phone needed)
│   ├── weather.js            # Weather lookup (free)
│   ├── web-scraper.js        # Extract content from URLs
│   └── youtube-transcript.js # Get video transcripts
└── scripts/
    ├── silent-install.sh     # Main installer
    ├── setup.sh              # Setup wizard
    └── update.sh             # Pull updates
```

### Pre-built Integrations (All Free!)

| Tool | What it does | API Key? |
|------|--------------|----------|
| **gmail.js** | Read inbox, search, draft emails | Google OAuth |
| **google-calendar.js** | View events, find free time, create events | Google OAuth |
| **notion.js** | Pages, databases, tasks | Notion token |
| **totp.js** | Generate 2FA codes (no phone needed) | None needed |
| **weather.js** | Current weather & forecasts | None needed |
| **web-scraper.js** | Extract text from any URL | None needed |
| **youtube-transcript.js** | Get transcripts from videos | None needed |

---

## Operating Modes

During personalization, the agent will ask you to choose:

### Assistant Mode
- Reactive — waits for your instructions
- Helpful and reliable
- No autonomous actions

### Chief of Staff Mode
- Proactive — generates ideas, spots opportunities
- Works overnight on your backlog
- Reports what it accomplished

---

## Cost

| Model | Use | Cost |
|-------|-----|------|
| Claude | Brain | ~$3-15/M tokens |
| DeepSeek | Coding | ~$0.14/M tokens |
| Gemini | Research, RAG | FREE |

**Typical:** $5-15/day active use.

---

## Optional: Aider for Coding

The setup wizard can install [Aider](https://aider.chat) — a powerful AI coding assistant:

```bash
# After setup, use with DeepSeek:
aider --model deepseek/deepseek-chat

# Or add an alias:
alias code='aider --model deepseek/deepseek-chat'
```

Aider is git-aware, does multi-file edits, and auto-commits. Much better than raw CLI.

---

## Keeping It Running

The setup wizard installs **pm2** to keep your agent running:
- Survives SSH disconnect
- Survives server reboot
- Auto-restarts on crash

```bash
pm2 status              # Check status
pm2 logs openclaw       # View logs
pm2 restart openclaw    # Restart
pm2 stop openclaw       # Stop
```

---

## Updating

Pull the latest changes and restart:

```bash
~/.openclaw/workspace/scripts/update.sh
```

This will:
- Pull latest starter kit updates
- Update dependencies
- Update OpenClaw CLI
- Restart the gateway

---

## Troubleshooting

**"openclaw: command not found"**
```bash
npm install -g openclaw
```

**Bot not responding**
```bash
pm2 logs openclaw       # Check logs
pm2 restart openclaw    # Restart
```

**Gateway not starting**
```bash
openclaw gateway status
openclaw gateway logs
```

**Skip browser install (saves ~400MB)**
```bash
SKIP_BROWSER=true curl -fsSL ... | bash
```

---

## Manual Setup (Alternative)

If you prefer not to use the setup wizard:

```bash
# After install, manually configure:
nano ~/.openclaw/workspace/.env          # Add Gemini/DeepSeek keys
openclaw init                            # Anthropic key + channel
~/.openclaw/workspace/scripts/apply-config.sh  # Optimal settings
openclaw gateway start                   # Start
```

---

## License

MIT — Use freely.

---

Built with 🦞 by [OpenClaw](https://openclaw.ai)
