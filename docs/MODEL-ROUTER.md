# Model Router Specification

Automatic routing of tasks to the most cost-effective model.

---

## Philosophy

> **Expensive models think. Cheap models do.**

The main agent brain (Opus/Sonnet) handles:
- Conversations and relationships
- Complex reasoning and judgment
- Orchestration and planning

Grunt work is routed to cheaper models:
- Summarization → Gemini (free)
- Code generation → DeepSeek ($0.14/M)
- Quick checks → Haiku (cheap)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Agent (Opus/Sonnet)                         │
│                                                                 │
│   "Summarize this article"    "Write a function"    "Quick Q"  │
│              │                       │                   │      │
└──────────────┼───────────────────────┼───────────────────┼──────┘
               │                       │                   │
               ▼                       ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Model Router                             │
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │ Task Type   │ →  │   Rules     │ →  │   Model     │        │
│   │ Detection   │    │   Engine    │    │   Selection │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
               │                       │                   │
               ▼                       ▼                   ▼
        ┌──────────┐           ┌──────────┐         ┌──────────┐
        │  Gemini  │           │ DeepSeek │         │  Haiku   │
        │  (FREE)  │           │ ($0.14/M)│         │ (cheap)  │
        └──────────┘           └──────────┘         └──────────┘
```

---

## Routing Rules

### Default Configuration

```yaml
# config/model-routing.yaml

# Main agent brain (not routed)
main_model: anthropic/claude-sonnet-4

# Routing rules by task type
routes:
  # Free tier - use liberally
  summarize: gemini/gemini-2.0-flash
  research: gemini/gemini-2.0-flash
  extract: gemini/gemini-2.0-flash
  translate: gemini/gemini-2.0-flash
  
  # Cheap tier - coding tasks
  code: deepseek/deepseek-chat
  debug: deepseek/deepseek-chat
  refactor: deepseek/deepseek-chat
  test: deepseek/deepseek-chat
  
  # Quick tier - simple checks
  classify: anthropic/claude-3-5-haiku
  validate: anthropic/claude-3-5-haiku
  format: anthropic/claude-3-5-haiku
  
  # Smart tier - needs reasoning
  analyze: anthropic/claude-sonnet-4
  plan: anthropic/claude-sonnet-4
  review: anthropic/claude-sonnet-4
  
  # Default fallback
  default: anthropic/claude-sonnet-4

# Heartbeat always uses cheap model
heartbeat_model: anthropic/claude-3-5-haiku

# Sub-agent defaults
subagent_model: anthropic/claude-sonnet-4

# Cost limits (optional)
limits:
  daily_usd: 10.00
  monthly_usd: 200.00
  alert_threshold: 0.8  # Alert at 80%
```

### Task Type Detection

The router detects task type from:

1. **Explicit tag** (highest priority)
   ```javascript
   await route({ type: 'code', prompt: '...' });
   ```

2. **Keyword analysis** (automatic)
   ```
   "summarize" | "tldr" | "summary" → summarize
   "write code" | "function" | "implement" → code
   "debug" | "fix" | "error" → debug
   "translate" | "in spanish" → translate
   ```

3. **Content analysis** (fallback)
   - Contains code blocks → code
   - Long input text → summarize
   - Question format → default

---

## API Design

### High-Level API

```javascript
// lib/router.js
const { route } = require('./router');

// Explicit task type
const summary = await route({
  type: 'summarize',
  prompt: 'Summarize this article...',
  content: articleText,
});

// Auto-detect task type
const result = await route({
  prompt: 'Write a function that validates email addresses',
});
// Router detects "code" task, routes to DeepSeek

// Override model for specific call
const analysis = await route({
  type: 'analyze',
  prompt: '...',
  model: 'anthropic/claude-opus-4',  // Force specific model
});
```

### Response Format

```javascript
{
  result: '...',           // Model output
  model: 'deepseek/...',   // Model used
  taskType: 'code',        // Detected/specified type
  tokens: { in: 500, out: 200 },
  cost: 0.0001,            // USD
  latency: 1234,           // ms
}
```

### Streaming Support

```javascript
const stream = await route({
  type: 'code',
  prompt: '...',
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

---

## Implementation

### Core Router

```javascript
// lib/router.js
const config = require('./config/model-routing.yaml');
const providers = {
  anthropic: require('./providers/anthropic'),
  gemini: require('./providers/gemini'),
  deepseek: require('./providers/deepseek'),
  openrouter: require('./providers/openrouter'),
};

async function route({ type, prompt, content, model, stream = false }) {
  // Detect task type if not specified
  const taskType = type || detectTaskType(prompt, content);
  
  // Get model from rules (or use override)
  const selectedModel = model || config.routes[taskType] || config.routes.default;
  
  // Parse provider from model string
  const [provider, modelName] = selectedModel.split('/');
  
  // Get provider client
  const client = providers[provider];
  if (!client) throw new Error(`Unknown provider: ${provider}`);
  
  // Make request
  const startTime = Date.now();
  const result = await client.complete({
    model: modelName,
    prompt,
    content,
    stream,
  });
  const latency = Date.now() - startTime;
  
  // Calculate cost
  const cost = calculateCost(provider, modelName, result.tokens);
  
  // Log usage
  await logUsage({
    model: selectedModel,
    taskType,
    tokens: result.tokens,
    cost,
    latency,
  });
  
  return {
    result: result.text,
    model: selectedModel,
    taskType,
    tokens: result.tokens,
    cost,
    latency,
  };
}

function detectTaskType(prompt, content) {
  const text = (prompt + ' ' + (content || '')).toLowerCase();
  
  // Keyword matching
  if (/summarize|summary|tldr|brief/i.test(text)) return 'summarize';
  if (/write (a |the )?(code|function|class|script)/i.test(text)) return 'code';
  if (/debug|fix|error|bug/i.test(text)) return 'debug';
  if (/translate|in (spanish|french|german|chinese)/i.test(text)) return 'translate';
  if (/refactor|clean up|improve/i.test(text)) return 'refactor';
  if (/test|spec|unit test/i.test(text)) return 'test';
  if (/analyze|analysis|evaluate/i.test(text)) return 'analyze';
  if (/plan|strategy|approach/i.test(text)) return 'plan';
  if (/extract|parse|find all/i.test(text)) return 'extract';
  if (/research|find out|look up/i.test(text)) return 'research';
  
  // Content analysis
  if (content && content.length > 5000) return 'summarize';
  if (/```/.test(content)) return 'code';
  
  return 'default';
}

const PRICING = {
  'anthropic/claude-opus-4': { in: 15, out: 75 },
  'anthropic/claude-sonnet-4': { in: 3, out: 15 },
  'anthropic/claude-3-5-haiku': { in: 0.8, out: 4 },
  'deepseek/deepseek-chat': { in: 0.07, out: 0.14 },
  'gemini/gemini-2.0-flash': { in: 0, out: 0 },
};

function calculateCost(provider, model, tokens) {
  const key = `${provider}/${model}`;
  const pricing = PRICING[key] || PRICING['default'];
  return (tokens.in * pricing.in + tokens.out * pricing.out) / 1_000_000;
}

module.exports = { route, detectTaskType };
```

### Provider Adapters

```javascript
// lib/providers/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function complete({ model, prompt, content, stream }) {
  const gemini = genAI.getGenerativeModel({ model });
  
  const fullPrompt = content ? `${prompt}\n\n${content}` : prompt;
  
  if (stream) {
    const result = await gemini.generateContentStream(fullPrompt);
    return streamAdapter(result);
  }
  
  const result = await gemini.generateContent(fullPrompt);
  const response = result.response;
  
  return {
    text: response.text(),
    tokens: {
      in: response.usageMetadata?.promptTokenCount || 0,
      out: response.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

module.exports = { complete };
```

```javascript
// lib/providers/deepseek.js
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

async function complete({ model, prompt, content, stream }) {
  const messages = [
    { role: 'user', content: content ? `${prompt}\n\n${content}` : prompt }
  ];
  
  const response = await client.chat.completions.create({
    model: model || 'deepseek-chat',
    messages,
    stream,
  });
  
  if (stream) return streamAdapter(response);
  
  return {
    text: response.choices[0].message.content,
    tokens: {
      in: response.usage?.prompt_tokens || 0,
      out: response.usage?.completion_tokens || 0,
    },
  };
}

module.exports = { complete };
```

---

## CLI Tool

```bash
# Route a task (auto-detect type)
node tools/route.js "Summarize this article" --content article.txt

# Explicit task type
node tools/route.js --type code "Write a function to validate emails"

# Force specific model
node tools/route.js --model opus "Complex reasoning task..."

# Show what model would be selected (dry run)
node tools/route.js --dry-run "Debug this code: ..."
# Output: Would route to: deepseek/deepseek-chat (task type: debug)

# Show routing stats
node tools/route.js stats
# Output:
# Today's routing:
#   summarize → gemini: 15 calls, $0.00
#   code → deepseek: 8 calls, $0.02
#   default → sonnet: 23 calls, $1.45
```

---

## Integration with Agent

### In MEMORY.md / Instructions

```markdown
## Model Routing

I have access to a model router that automatically picks the cheapest capable model.

**How to use:**
- For grunt work, call `route()` instead of doing it myself
- The router handles: summarization, coding, research, translation
- I still handle: conversations, complex reasoning, judgment calls

**Examples:**
```javascript
// Summarize (routes to Gemini - FREE)
await route({ type: 'summarize', content: longArticle });

// Code (routes to DeepSeek - $0.14/M)
await route({ type: 'code', prompt: 'Write a function...' });

// Complex analysis (routes to Sonnet)
await route({ type: 'analyze', prompt: 'Evaluate this strategy...' });
```

**My role:** Decide WHAT to do. Router decides WHO does it.
```

### In Tool Wrappers

```javascript
// tools/summarize.js
const { route } = require('../lib/router');

async function summarize(text, options = {}) {
  const result = await route({
    type: 'summarize',
    prompt: options.prompt || 'Summarize the following text concisely:',
    content: text,
  });
  return result.result;
}

module.exports = { summarize };
```

```javascript
// tools/code-gen.js
const { route } = require('../lib/router');

async function generateCode(spec) {
  const result = await route({
    type: 'code',
    prompt: spec,
  });
  return result.result;
}

module.exports = { generateCode };
```

---

## Cost Tracking Integration

The router automatically logs to SQLite:

```sql
-- Every routed call is logged
INSERT INTO token_usage (model, tokens_in, tokens_out, cost_usd, task_type)
VALUES ('deepseek/deepseek-chat', 500, 200, 0.0001, 'code');
```

Dashboard shows routing breakdown:

```
┌────────────────────────────────────────┐
│  ROUTING STATS (Today)                 │
├────────────────────────────────────────┤
│  Task Type    │ Model      │ Cost      │
├───────────────┼────────────┼───────────┤
│  summarize    │ gemini     │ $0.00     │
│  code         │ deepseek   │ $0.02     │
│  research     │ gemini     │ $0.00     │
│  default      │ sonnet     │ $1.45     │
├───────────────┼────────────┼───────────┤
│  TOTAL        │            │ $1.47     │
└────────────────────────────────────────┘
```

---

## Fallback Handling

```yaml
# config/model-routing.yaml

fallbacks:
  gemini/gemini-2.0-flash:
    - deepseek/deepseek-chat  # If Gemini quota exceeded
    - anthropic/claude-3-5-haiku
  
  deepseek/deepseek-chat:
    - gemini/gemini-2.0-flash
    - anthropic/claude-3-5-haiku
```

```javascript
// In router
async function routeWithFallback(options) {
  const models = [selectedModel, ...getFallbacks(selectedModel)];
  
  for (const model of models) {
    try {
      return await callModel(model, options);
    } catch (err) {
      if (isQuotaError(err) || isRateLimitError(err)) {
        console.warn(`${model} failed, trying fallback...`);
        continue;
      }
      throw err;
    }
  }
  
  throw new Error('All models failed');
}
```

---

## What's NOT Routed

The main agent conversation is **never** routed. That's the personality.

```
┌─────────────────────────────────────────┐
│  Direct to Main Model (Opus/Sonnet)     │
├─────────────────────────────────────────┤
│  • User conversations                   │
│  • Telegram/Discord messages            │
│  • Complex reasoning                    │
│  • Judgment calls                       │
│  • Personality-driven responses         │
│  • Multi-step planning                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Routed to Cheap Models                 │
├─────────────────────────────────────────┤
│  • Summarization                        │
│  • Code generation                      │
│  • Research/extraction                  │
│  • Translation                          │
│  • Formatting                           │
│  • Quick checks                         │
└─────────────────────────────────────────┘
```

---

## Estimated Savings

| Scenario | Without Router | With Router | Savings |
|----------|----------------|-------------|---------|
| 10 summaries/day | $1.50 | $0.00 | 100% |
| 5 code tasks/day | $0.75 | $0.01 | 99% |
| 50 heartbeats/day | $3.00 | $0.40 | 87% |
| **Daily Total** | **$20** | **$6** | **70%** |

---

*Spec version: 1.0*
*Created: 2026-02-04*
