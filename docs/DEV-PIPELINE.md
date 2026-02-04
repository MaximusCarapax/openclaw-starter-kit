# Development Pipeline Specification

A structured workflow for turning ideas into deployed features, with agent assistance at every stage.

**Status:** Advanced feature (separate from general task management)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💡 IDEA ──→ 📋 SPEC ──→ ✅ READY ──→ 🔨 BUILD ──→ 🚀 DEPLOY  │
│                                                                 │
│  "What if..."  Requirements   Approved    Coding     Live!      │
│                               by human    + testing             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle:** Agent does the work, human approves at gates.

---

## Why Separate from General Tasks?

| General Tasks | Dev Pipeline |
|---------------|--------------|
| "Call dentist" | "Build auth system" |
| `todo` → `done` | `idea` → `spec` → `ready` → `building` → `testing` → `deployed` |
| No code | Linked to branches, PRs, commits |
| You do it | Agent builds, you review |
| Minutes to complete | Days/weeks lifecycle |

The dev pipeline is for **building things**, not managing your life.

---

## Stages

### 1. 💡 Idea
Raw capture. Shower thoughts, feature requests, "what if we..."

```
Example:
- "Add voice commands to the agent"
- "Dashboard should show costs by day"
- "Integrate with Notion"
```

**Who:** Anyone (you or agent)
**Output:** Title + rough description
**Gate:** None — ideas are cheap, capture everything

### 2. 📋 Speccing
Flesh out the idea into requirements. What exactly are we building?

```
Example spec:
## Voice Commands

### Goal
Let users speak commands instead of typing.

### Requirements
- Wake word detection ("Hey Claude")
- Speech-to-text transcription
- Intent parsing
- Voice response (TTS)

### Acceptance Criteria
- [ ] Wake word works offline
- [ ] Transcription accuracy >95%
- [ ] Response latency <2 seconds

### Technical Approach
Use Whisper for STT, ElevenLabs for TTS...

### Estimated Effort
3-5 days
```

**Who:** Agent drafts, human refines
**Output:** Markdown spec with acceptance criteria
**Gate:** Human approves spec before work begins

### 3. ✅ Ready
Spec approved. Waiting in the queue to be built.

**Who:** Human moves here after reviewing spec
**Output:** Prioritized backlog position
**Gate:** Human explicitly approves

### 4. 🔨 Building
Active development. Agent breaks into tasks, writes code, opens PRs.

```
Feature: Voice Commands
├── Task 1: Set up Whisper integration ✅
├── Task 2: Implement wake word detection 🔄 (in progress)
├── Task 3: Add TTS response
├── Task 4: Wire up to main agent
└── Task 5: Write tests
```

**Who:** Agent builds, creates PRs
**Output:** Code in branches, PRs for review
**Gate:** Human reviews and merges PRs

### 5. 🧪 Testing
Code merged, automated tests running, QA checks.

**Who:** CI runs tests, human does manual QA if needed
**Output:** Test results, bug fixes
**Gate:** All tests pass

### 6. 🚀 Deployed
Live in production.

**Who:** CD deploys automatically (or human triggers)
**Output:** Running in prod
**Gate:** None — it's done!

### 7. 📦 Archived
Completed or abandoned. Kept for reference.

---

## Database Schema

```sql
-- ============================================================
-- DEVELOPMENT PIPELINE TABLES
-- ============================================================

-- Features (the main ideas/projects)
CREATE TABLE features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'idea' CHECK(status IN (
        'idea', 'speccing', 'ready', 'building', 'testing', 'deployed', 'archived'
    )),
    priority INTEGER,              -- 1 = highest
    effort_estimate TEXT,          -- "2-3 days", "1 week", etc.
    tags TEXT,                     -- JSON array: ["dashboard", "integration"]
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deployed_at TEXT
);

-- Specs (requirements documents for features)
CREATE TABLE specs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,     -- spec versions
    content TEXT NOT NULL,         -- markdown
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'approved', 'rejected')),
    approved_by TEXT,              -- 'human' when approved
    approved_at TEXT,
    feedback TEXT,                 -- human feedback if rejected/changes requested
    created_at TEXT DEFAULT (datetime('now'))
);

-- Dev tasks (implementation work items)
CREATE TABLE dev_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'backlog' CHECK(status IN (
        'backlog', 'in_progress', 'review', 'blocked', 'done'
    )),
    assignee TEXT DEFAULT 'agent', -- 'agent' or 'human'
    branch_name TEXT,              -- git branch
    pr_url TEXT,                   -- pull request URL
    pr_status TEXT,                -- 'open', 'merged', 'closed'
    blocked_reason TEXT,
    order_index INTEGER,           -- for ordering within feature
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Deploy history
CREATE TABLE deploys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER REFERENCES features(id),
    environment TEXT NOT NULL CHECK(environment IN ('staging', 'production')),
    status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed', 'rolled_back')),
    commit_sha TEXT,
    commit_message TEXT,
    triggered_by TEXT,             -- 'ci', 'human', 'agent'
    error_message TEXT,            -- if failed
    deployed_at TEXT DEFAULT (datetime('now')),
    rolled_back_at TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_priority ON features(priority);
CREATE INDEX idx_specs_feature ON specs(feature_id);
CREATE INDEX idx_dev_tasks_feature ON dev_tasks(feature_id);
CREATE INDEX idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX idx_deploys_feature ON deploys(feature_id);
CREATE INDEX idx_deploys_date ON deploys(deployed_at);

-- ============================================================
-- VIEWS
-- ============================================================

-- Kanban board view
CREATE VIEW v_pipeline_board AS
SELECT 
    f.id,
    f.title,
    f.status,
    f.priority,
    f.effort_estimate,
    (SELECT COUNT(*) FROM dev_tasks WHERE feature_id = f.id) as total_tasks,
    (SELECT COUNT(*) FROM dev_tasks WHERE feature_id = f.id AND status = 'done') as done_tasks,
    (SELECT MAX(version) FROM specs WHERE feature_id = f.id AND status = 'approved') as approved_spec_version
FROM features f
WHERE f.status != 'archived'
ORDER BY f.priority ASC, f.created_at ASC;

-- Active work
CREATE VIEW v_active_dev_tasks AS
SELECT 
    dt.*,
    f.title as feature_title
FROM dev_tasks dt
JOIN features f ON dt.feature_id = f.id
WHERE dt.status IN ('in_progress', 'review')
ORDER BY f.priority ASC, dt.order_index ASC;

-- Deploy history
CREATE VIEW v_recent_deploys AS
SELECT 
    d.*,
    f.title as feature_title
FROM deploys d
LEFT JOIN features f ON d.feature_id = f.id
ORDER BY d.deployed_at DESC
LIMIT 20;
```

---

## CLI Tool

```bash
# Features
node tools/pipeline.js ideas                     # List ideas
node tools/pipeline.js add "Feature title"       # Add new idea
node tools/pipeline.js view 5                    # View feature details
node tools/pipeline.js status 5 speccing         # Move to speccing
node tools/pipeline.js prioritize 5 --top        # Move to top of queue

# Specs
node tools/pipeline.js spec 5                    # View current spec
node tools/pipeline.js spec 5 --edit             # Edit spec (opens $EDITOR)
node tools/pipeline.js spec 5 --approve          # Human approves spec
node tools/pipeline.js spec 5 --reject "needs X" # Request changes

# Tasks
node tools/pipeline.js tasks 5                   # List tasks for feature
node tools/pipeline.js tasks 5 --add "Task"      # Add task
node tools/pipeline.js task 12 --start           # Start working on task
node tools/pipeline.js task 12 --pr "url"        # Link PR
node tools/pipeline.js task 12 --done            # Mark complete

# Board view
node tools/pipeline.js board                     # Kanban view
node tools/pipeline.js board --status building   # Filter by status

# Deploys
node tools/pipeline.js deploys                   # Recent deploys
node tools/pipeline.js deploy 5 --prod           # Trigger production deploy
```

---

## Agent Workflow

### Capturing Ideas

Agent can add ideas from conversations:

```markdown
# In MEMORY.md or agent instructions

When user mentions a feature idea or improvement:
1. Capture to pipeline: `node tools/pipeline.js add "Title" --desc "Details"`
2. Confirm: "Added to the pipeline as an idea. Want me to spec it out?"
```

### Writing Specs

```markdown
When asked to spec a feature:
1. Get the feature: `node tools/pipeline.js view <id>`
2. Research if needed (similar tools, best practices)
3. Write spec covering:
   - Goal
   - Requirements
   - Acceptance criteria
   - Technical approach
   - Effort estimate
4. Save: `node tools/pipeline.js spec <id> --save "spec content"`
5. Update status: `node tools/pipeline.js status <id> speccing`
6. Ask human to review
```

### Building Features

```markdown
When a feature is approved (status: ready):
1. Break into tasks: `node tools/pipeline.js tasks <id> --add "Task 1"`
2. Update status: `node tools/pipeline.js status <id> building`
3. For each task:
   a. Start: `node tools/pipeline.js task <id> --start`
   b. Create branch: `git checkout -b feature/<name>`
   c. Write code (use Aider/DeepSeek)
   d. Commit with good messages
   e. Open PR: `gh pr create`
   f. Link: `node tools/pipeline.js task <id> --pr <url>`
   g. Request review
4. After all PRs merged:
   a. Update status: `node tools/pipeline.js status <id> testing`
   b. Run tests
   c. If pass: `node tools/pipeline.js status <id> deployed`
```

---

## Dashboard Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Development Pipeline                              [+ New Idea] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  💡 Ideas   📋 Speccing   ✅ Ready   🔨 Building   🚀 Deployed  │
│     (4)        (1)          (2)         (1)           (12)      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 💡 IDEAS                                                    │
│  │ ┌─────────────────┐ ┌─────────────────┐                    │
│  │ │ Webhook server  │ │ Browser manager │                    │
│  │ │ Receive inbound │ │ Session persist │                    │
│  │ │ [Spec it →]     │ │ [Spec it →]     │                    │
│  │ └─────────────────┘ └─────────────────┘                    │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ 🔨 BUILDING                                                 │
│  │ ┌─────────────────────────────────────────────────────────┐ │
│  │ │ SQLite Foundation                              P1       │ │
│  │ │ ████████░░░░░░░░ 3/8 tasks                             │ │
│  │ │                                                         │ │
│  │ │ ✅ Create schema                                        │ │
│  │ │ ✅ Build CLI tool                                       │ │
│  │ │ ✅ Migration scripts                                    │ │
│  │ │ 🔄 Dashboard integration (in progress)                  │ │
│  │ │ ⬜ Cost tracking                                        │ │
│  │ │ ⬜ Error logging                                        │ │
│  │ │ ⬜ Health checks                                        │ │
│  │ │ ⬜ Documentation                                        │ │
│  │ └─────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  RECENT ACTIVITY                                                │
│  • SQLite schema PR merged (2 hours ago)                        │
│  • "Voice commands" spec submitted for review                   │
│  • Dashboard v2 deployed to production ✓                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## CI/CD Integration

### On PR Open
```yaml
# .github/workflows/pr.yml
on: pull_request

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      
      # Update task status
      - name: Update pipeline
        run: |
          TASK_ID=$(echo "${{ github.head_ref }}" | grep -oP 'task-\K\d+')
          if [ -n "$TASK_ID" ]; then
            node tools/pipeline.js task $TASK_ID --status review
          fi
```

### On PR Merge
```yaml
# .github/workflows/merge.yml
on:
  pull_request:
    types: [closed]

jobs:
  update:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Mark task done
      - name: Complete task
        run: |
          TASK_ID=$(echo "${{ github.head_ref }}" | grep -oP 'task-\K\d+')
          if [ -n "$TASK_ID" ]; then
            node tools/pipeline.js task $TASK_ID --done
          fi
```

### On Deploy
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      
      # Deploy to production
      - name: Deploy
        run: ./scripts/deploy.sh
        
      # Log deployment
      - name: Record deploy
        run: |
          node tools/pipeline.js deploy-log \
            --sha "${{ github.sha }}" \
            --status success \
            --env production
```

---

## Separation from Starter Kit Core

This is an **advanced add-on**, not part of core starter kit.

```
starter-kit/
├── (core - everyone gets this)
│   ├── BOOTSTRAP.md
│   ├── tools/
│   ├── personas/
│   └── scripts/
│
└── modules/
    ├── dashboard/        # Add-on 1
    └── dev-pipeline/     # Add-on 2 (this)
        ├── schema.sql
        ├── tools/
        │   └── pipeline.js
        ├── workflows/
        │   └── *.yml
        └── README.md
```

**Installation:**
```bash
# After base starter kit is set up
~/.openclaw/workspace/scripts/add-module.sh dev-pipeline
```

---

## Video Tutorial Structure

For a "Setting up your Dev Pipeline" video:

1. **Intro** (1 min)
   - What is it, why you'd want it
   - "Agent as your junior dev"

2. **Installation** (2 min)
   - Add the module
   - Run schema migration

3. **Walkthrough** (5 min)
   - Add an idea
   - Spec it out (agent writes spec)
   - Approve and prioritize
   - Watch agent break into tasks
   - See PRs created

4. **CI/CD Setup** (3 min)
   - Add GitHub Actions
   - Show auto-status updates

5. **Dashboard** (2 min)
   - Show kanban view
   - Progress tracking

6. **Wrap-up** (1 min)
   - When to use this vs simple tasks
   - Link to docs

---

*Spec version: 1.0*
*Created: 2026-02-04*
