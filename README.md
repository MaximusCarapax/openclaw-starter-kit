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
│   └── code.js               # Routes to cheapest model
└── scripts/
    ├── silent-install.sh     # Main installer
    └── setup.sh              # Setup wizard
```

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

## Troubleshooting

**"openclaw: command not found"**
```bash
npm install -g openclaw
```

**Bot not responding**
```bash
openclaw gateway status   # Check if running
openclaw gateway logs     # View logs
openclaw gateway restart  # Restart
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
