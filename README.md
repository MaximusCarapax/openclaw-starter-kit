# OpenClaw Starter Kit

A structured bootstrap template for setting up AI agents with [OpenClaw](https://github.com/openclaw/openclaw).

## What's Included

```
├── BOOTSTRAP.md              # Main setup guide for new agents
├── config/
│   └── optimal-defaults.json # Pre-optimized gateway config
├── personas/
│   ├── SOUL-assistant-mode.md    # Reactive assistant template
│   └── SOUL-cos-mode.md          # Proactive Chief of Staff template
└── tools/
    ├── code.js               # Routes to cheap models
    ├── deepseek.js           # Coding workhorse ($0.14/M tokens)
    ├── gemini.js             # Free summaries & research
    ├── rag.js                # Brain dump memory
    ├── rag-docs.js           # Document RAG ingestion
    └── microsoft-graph-template.js  # MS 365 integration
```

## Quick Start

1. **Clone into your workspace:**
   ```bash
   git clone https://github.com/MaximusCarapax/openclaw-starter-kit ~/.openclaw/workspace
   ```

2. **Start OpenClaw:**
   ```bash
   openclaw gateway start
   ```

3. **Begin chat** — The agent will detect `BOOTSTRAP.md` and guide you through setup.

## Bootstrap Phases

| Phase | What | How |
|-------|------|-----|
| **0** | Config optimization | Silent — memory search, embeddings, heartbeat |
| **1** | Install workhorses | Silent — DeepSeek, Gemini, RAG tools |
| **2** | Getting to know you | Conversational — identity, preferences, operating mode |
| **3** | Integrations | Guided — email, calendar, task management |
| **4** | Wrap up | Summarize, first memory entry, set expectations |

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

## Pre-Configured Optimizations

The `config/optimal-defaults.json` enables:
- **Memory search** with embeddings (searchable conversation history)
- **Memory flush** on compaction (preserves insights when context trims)
- **Session transcript indexing** (RAG over past conversations)
- **Hourly heartbeat** (proactive check-ins)

## Cost Optimization

Built-in model routing:
- **Claude (Opus/Sonnet)** — Brain, conversations, decisions
- **DeepSeek** — Coding tasks (~$0.14/M tokens)
- **Gemini** — Summaries, research (FREE)

Typical cost: **$5-15/day** for active use.

## Supported Integrations

- **Microsoft 365**: Outlook, Calendar, To Do, Teams
- **Google Workspace**: Gmail, Calendar, Drive
- **Task Management**: Linear, Notion, Todoist
- **Social**: X/Twitter, LinkedIn

## API Keys Needed

| Key | Purpose | Required? |
|-----|---------|-----------|
| OpenAI | Embeddings (memory search) | Recommended |
| Gemini | Free summaries | Optional |
| DeepSeek | Cheap coding | Optional |
| Brave Search | Web search | Optional |

## Enterprise Deployment

For secure enterprise deployment, see the bootstrap guide for:
- AWS Bedrock configuration (data stays in your AWS account)
- Team-by-team isolation architecture
- Compliance considerations (SOC2, HIPAA)

## License

MIT — Use freely, attribution appreciated.

---

Built with 🦀 by [Maximus Carapax](https://x.com/MaximusCarapax)
