# Delegation Patterns

How to make your agent cost-effective by delegating grunt work to cheaper models.

## The Philosophy

> **Expensive models think. Cheap models do.**

Your main Claude model (Opus/Sonnet) should:
- Understand context and intent
- Plan and orchestrate
- Make judgment calls
- Review outputs

Grunt work gets delegated to:
- **Gemini** (FREE) — Research, summaries, embeddings
- **DeepSeek** ($0.14/M) — Coding, bulk generation

## Built-in Tools

The starter kit includes tools your agent can use for delegation:

### `tools/gemini.js` — Free Research/Summarization

```bash
node tools/gemini.js "Summarize this article: [content]"
node tools/gemini.js -m 2.0-flash "Quick question"
node tools/gemini.js -f document.txt "What are the key points?"
```

Your agent can call this for:
- Summarizing long documents
- Research questions
- Extracting information
- One-shot generation tasks

### `tools/deepseek.js` — Cheap Coding

```bash
node tools/deepseek.js "Write a function that..."
node tools/deepseek.js -c "Debug this code: [code]"
```

Your agent can call this for:
- Writing boilerplate code
- Debugging
- Code explanations
- Bulk code generation

### `tools/aider.js` — Git-Aware Coding

```bash
node tools/aider.js --files src/app.js --message "Add error handling"
```

For multi-file edits with git integration.

## Teaching Your Agent to Delegate

Add this to your `MEMORY.md` or `AGENTS.md`:

```markdown
## Cost Management

We are cost-conscious. Use this delegation pattern:

**For research/summaries:**
- Use `node tools/gemini.js "prompt"` instead of doing it myself
- Gemini is FREE — use it liberally for grunt work

**For coding tasks:**
- Use `node tools/deepseek.js "prompt"` or Aider
- DeepSeek is $0.14/M tokens — basically free

**My role:** Plan, orchestrate, review, deliver
**Their role:** Generate, summarize, code

Example workflow:
1. User asks for research on X
2. I plan what to search/read
3. I call Gemini to summarize each source
4. I synthesize and deliver the answer
```

## Sub-Agent Delegation

For complex tasks, spawn sub-agents:

```markdown
## Sub-Agent Guidelines

When spawning sub-agents via sessions_spawn:
- Default to Sonnet (not Opus) via `model` parameter
- Include delegation instructions in the task prompt
- Sub-agents should also use Gemini/DeepSeek for grunt work

Example:
"Research [topic] and write a summary. Use tools/gemini.js for 
fetching and summarizing sources. Deliver a 500-word synthesis."
```

## Example Workflows

### Research Task

**Without delegation (expensive):**
1. Agent reads 5 articles directly (lots of tokens)
2. Agent synthesizes (more tokens)
3. Total: ~50K tokens @ Opus = ~$4

**With delegation (cheap):**
1. Agent plans research approach
2. Calls `gemini.js` to summarize each article (FREE)
3. Agent synthesizes summaries
4. Total: ~10K tokens @ Opus + FREE Gemini = ~$0.80

### Coding Task

**Without delegation:**
1. Agent writes code directly
2. Agent debugs iteratively
3. Total: Many turns of expensive tokens

**With delegation:**
1. Agent specs what's needed
2. Calls `deepseek.js` or Aider
3. Agent reviews and adjusts
4. Total: Planning tokens + cheap DeepSeek

## Setting Up Delegation

### 1. Ensure tools are configured

Check `.env` has:
```bash
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
```

### 2. Add instructions to MEMORY.md

Copy the delegation guidelines above.

### 3. Test the flow

Ask your agent: "Summarize this article: [URL]"

Good response: "Let me use Gemini to summarize that..."
Bad response: Agent reads and summarizes directly

### 4. Reinforce the pattern

If agent doesn't delegate, remind it:
"Remember to use Gemini for research tasks to save costs."

## Cost Comparison

| Task | Direct (Opus) | Delegated | Savings |
|------|--------------|-----------|---------|
| Summarize 5 articles | ~$4 | ~$0.80 | 80% |
| Write 500 lines of code | ~$3 | ~$0.50 | 83% |
| Research + report | ~$8 | ~$1.50 | 81% |

## When NOT to Delegate

Keep these with your main model:
- Nuanced judgment calls
- Personal/sensitive topics
- Creative voice/tone
- Complex multi-step reasoning
- Anything requiring your "personality"

---

*Part of the [OpenClaw Starter Kit](https://github.com/MaximusCarapax/openclaw-starter-kit)*
