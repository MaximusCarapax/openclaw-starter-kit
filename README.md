# OpenClaw Starter Kit

Your AI agent in under a minute. No Docker. No Python. Just run one command.

## Quick Start (One Command)

```bash
curl -fsSL https://raw.githubusercontent.com/MaximusCarapax/openclaw-starter-kit/main/scripts/silent-install.sh | bash
```

This automatically installs Node.js (if missing), OpenClaw, and everything else.

---

## What You Need (Before Running)

### 1. Anthropic API Key (Required)
- Sign up: https://console.anthropic.com
- Create an API key
- This powers Claude (the brain)

### 2. Messaging Channel (Pick One)

| Channel | Difficulty | How |
|---------|------------|-----|
| **Telegram** | ⭐ Easiest | Message [@BotFather](https://t.me/BotFather), create bot, get token |
| **Discord** | ⭐⭐ Easy | [Developer Portal](https://discord.com/developers), create app + bot |

**Recommended:** Start with Telegram — fastest path to "hello world".

---

## Step by Step

### 1. Run the installer
```bash
curl -fsSL https://raw.githubusercontent.com/MaximusCarapax/openclaw-starter-kit/main/scripts/silent-install.sh | bash
```

### 2. Add your API keys
```bash
nano ~/.openclaw/workspace/.env
```

Fill in:
```
ANTHROPIC_API_KEY=sk-ant-xxx
TELEGRAM_BOT_TOKEN=123456:ABC-xxx
```

### 3. Configure OpenClaw
```bash
openclaw init
```
Follow the prompts. Pick your channel (Telegram/Discord).

### 4. Start
```bash
openclaw gateway start
```

### 5. Message your bot
Open Telegram, find your bot, say "hello". 🎉

---

## How It Works

```
You run the installer
       ↓
OpenClaw + dependencies installed
       ↓
You add API keys, run 'openclaw init'
       ↓
Start gateway, message your bot
       ↓
Agent reads BOOTSTRAP.md, walks you through setup
       ↓
You have a personalized AI agent
```

The `BOOTSTRAP.md` file is **instructions for the agent**, not for you.

---

## What's Included

```
├── BOOTSTRAP.md              # Agent setup guide
├── config/
│   └── optimal-defaults.json # Pre-optimized config
├── personas/
│   ├── SOUL-assistant-mode.md    # Reactive assistant
│   └── SOUL-cos-mode.md          # Proactive Chief of Staff
└── tools/
    ├── rag.js                # Vector memory (Vectra)
    ├── gemini.js             # Free AI for grunt work
    └── deepseek.js           # Cheap coding ($0.14/M tokens)
```

---

## Operating Modes

During setup, choose:

### Assistant Mode
- Reactive — waits for your instructions
- Helpful and reliable
- No autonomous actions

### Chief of Staff Mode
- Proactive — generates ideas, spots opportunities
- Works overnight on your backlog
- Reports what it accomplished

---

## API Keys

| Key | Purpose | Required? | Get it |
|-----|---------|-----------|--------|
| **Anthropic** | Claude (brain) | ✅ Yes | [console.anthropic.com](https://console.anthropic.com) |
| **Gemini** | Free embeddings/RAG | Recommended | [aistudio.google.com](https://aistudio.google.com) |
| DeepSeek | Cheap coding | Optional | [platform.deepseek.com](https://platform.deepseek.com) |
| Brave | Web search | Optional | [brave.com/search/api](https://brave.com/search/api) |

---

## Cost

| Model | Use | Cost |
|-------|-----|------|
| Claude Opus | Brain | ~$15-75/M tokens |
| DeepSeek | Coding | ~$0.14/M tokens |
| Gemini | Research | FREE |

**Typical:** $5-15/day active use.

---

## Troubleshooting

**"openclaw: command not found"**
```bash
npm install -g openclaw
```

**Bot not responding**
1. Check gateway: `openclaw gateway status`
2. Check bot token is correct
3. Make sure you messaged the bot first

**Skip browser install (saves ~400MB)**
```bash
SKIP_BROWSER=true curl -fsSL ... | bash
```

---

## Manual Install (Alternative)

If you prefer not to use the one-liner:

```bash
# 1. Install Node.js 18+ (https://nodejs.org)

# 2. Clone the repo
git clone https://github.com/MaximusCarapax/openclaw-starter-kit ~/.openclaw/workspace

# 3. Install OpenClaw
npm install -g openclaw

# 4. Install dependencies
cd ~/.openclaw/workspace && npm install

# 5. Copy and edit .env
cp .env.template .env
nano .env

# 6. Initialize and start
openclaw init
openclaw gateway start
```

---

## License

MIT — Use freely.

---

Built with 🦞 by [OpenClaw](https://openclaw.ai)
