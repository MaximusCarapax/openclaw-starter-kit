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

### 2. Add your Gemini key (for RAG tools)
```bash
nano ~/.openclaw/workspace/.env
```

Add your free Gemini API key:
```
GEMINI_API_KEY=AIza...
```
Get one at: https://aistudio.google.com/apikey (takes 30 seconds)

### 3. Configure OpenClaw
```bash
openclaw init
```
Follow the prompts:
- Enter your Anthropic API key
- Pick your channel (Telegram/Discord)
- Enter your bot token

### 4. Apply optimal settings
```bash
~/.openclaw/workspace/scripts/apply-config.sh
```
This enables memory search, heartbeat, and other recommended features.

### 5. Start
```bash
openclaw gateway start
```

### 6. Message your bot
Open Telegram, find your bot, say "hello". 🎉

---

## How It Works

```
You run the installer
       ↓
OpenClaw + dependencies installed
       ↓
You run 'openclaw init' (Anthropic key + channel)
       ↓
You run 'apply-config.sh' (enables memory, heartbeat)
       ↓
Start gateway, message your bot
       ↓
Agent reads BOOTSTRAP.md, walks you through personalization
       ↓
You have a personalized AI agent
```

The `BOOTSTRAP.md` file is **instructions for the agent**, not for you.

---

## What's Included

```
├── BOOTSTRAP.md              # Agent setup guide
├── config/
│   └── config-optimal-defaults.json  # Pre-optimized config
├── personas/
│   ├── SOUL-assistant-mode.md    # Reactive assistant template
│   └── SOUL-cos-mode.md          # Proactive Chief of Staff template
├── templates/
│   └── HEARTBEAT-template.md     # Periodic check-in template
└── tools/
    ├── rag.js                # Vector memory (Vectra + Gemini)
    ├── rag-docs.js           # Document ingestion
    ├── gemini.js             # Free AI for grunt work
    ├── deepseek.js           # Cheap coding (~$0.14/M tokens)
    └── code.js               # Routes to cheapest model
```

---

## Operating Modes

During setup, the agent will ask you to choose:

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
| **Gemini** | RAG embeddings (free) | Recommended | [aistudio.google.com](https://aistudio.google.com/apikey) |
| DeepSeek | Cheap coding | Optional | [platform.deepseek.com](https://platform.deepseek.com) |
| Brave | Web search | Optional | [brave.com/search/api](https://brave.com/search/api) |

**Note:** Anthropic key and channel tokens are configured via `openclaw init`. Other keys go in `.env`.

---

## Cost

| Model | Use | Cost |
|-------|-----|------|
| Claude Opus | Brain | ~$15-75/M tokens |
| DeepSeek | Coding | ~$0.14/M tokens |
| Gemini | Research, RAG | FREE |

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

# 5. Add Gemini key to .env
cp .env.template .env
nano .env

# 6. Initialize
openclaw init

# 7. Apply optimal config
./scripts/apply-config.sh

# 8. Start
openclaw gateway start
```

---

## License

MIT — Use freely.

---

Built with 🦞 by [OpenClaw](https://openclaw.ai)
