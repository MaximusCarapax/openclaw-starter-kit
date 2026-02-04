# Database Schema

SQLite database for agent state, metrics, and operations.

**Location:** `~/.openclaw/data/agent.db`

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        agent.db                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRODUCTIVITY          OPERATIONS           MONITORING          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │ tasks       │      │ memory      │      │ token_usage │     │
│  │ projects    │      │ settings    │      │ error_logs  │     │
│  │ contacts    │      │ credentials │      │ activity    │     │
│  │ content     │      │ sessions    │      │ health      │     │
│  │ calls       │      │             │      │             │     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why SQLite?

| Concern | Answer |
|---------|--------|
| **Scale** | Handles billions of rows. Our 10-year projection: <1M rows. |
| **Concurrency** | Single agent = no write contention. WAL mode for safety. |
| **Reliability** | Battle-tested (every iPhone, Airbnb, Expensify). |
| **Simplicity** | Single file, zero configuration, no server. |
| **Backup** | Just copy the file. |
| **Portability** | Move agent = move one file. |

---

## Full Schema

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;

-- ============================================================
-- PRODUCTIVITY TABLES
-- ============================================================

-- Projects group related tasks
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'archived')),
    color TEXT,  -- hex color for UI
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tasks with full lifecycle tracking
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
    priority INTEGER DEFAULT 2 CHECK(priority BETWEEN 1 AND 4),  -- 1=urgent, 4=low
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    due_date TEXT,  -- ISO8601 date
    due_time TEXT,  -- ISO8601 time (optional)
    completed_at TEXT,
    blocked_reason TEXT,
    tags TEXT,  -- JSON array: ["work", "important"]
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Contacts (CRM)
CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    role TEXT,
    notes TEXT,
    tags TEXT,  -- JSON array: ["client", "friend"]
    last_contact TEXT,  -- last interaction date
    follow_up_date TEXT,  -- when to follow up
    source TEXT,  -- how we met: "linkedin", "referral", etc
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Contact interactions (timeline)
CREATE TABLE contact_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('email', 'call', 'meeting', 'message', 'note')),
    direction TEXT CHECK(direction IN ('inbound', 'outbound', NULL)),
    summary TEXT,
    details TEXT,  -- longer notes
    created_at TEXT DEFAULT (datetime('now'))
);

-- Content calendar
CREATE TABLE content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL CHECK(platform IN ('linkedin', 'x', 'youtube', 'blog', 'newsletter', 'other')),
    title TEXT,
    content TEXT,  -- the actual post/script
    status TEXT DEFAULT 'idea' CHECK(status IN ('idea', 'draft', 'review', 'scheduled', 'published', 'archived')),
    scheduled_for TEXT,  -- when to publish
    published_at TEXT,
    published_url TEXT,
    metrics TEXT,  -- JSON: {"likes": 10, "shares": 5, "comments": 3}
    tags TEXT,  -- JSON array: ["ai", "productivity"]
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Call history
CREATE TABLE calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    phone_number TEXT,
    direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
    status TEXT CHECK(status IN ('completed', 'missed', 'voicemail', 'failed')),
    duration_seconds INTEGER,
    summary TEXT,
    transcript TEXT,
    recording_path TEXT,
    provider TEXT,  -- twilio, elevenlabs, etc
    provider_id TEXT,  -- external call ID
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- OPERATIONS TABLES
-- ============================================================

-- Agent memory (queryable, not context-bound)
CREATE TABLE memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('fact', 'preference', 'lesson', 'todo', 'person', 'project', 'other')),
    subject TEXT,  -- what/who this is about
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),  -- 1=trivial, 10=critical
    source TEXT,  -- where this came from: "conversation", "heartbeat", etc
    expires_at TEXT,  -- optional expiry
    last_accessed TEXT,
    access_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Agent settings (key-value)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,  -- JSON encoded
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Session tracking (for multi-session continuity)
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT UNIQUE NOT NULL,
    channel TEXT,  -- telegram, discord, etc
    user_id TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    last_active TEXT DEFAULT (datetime('now')),
    message_count INTEGER DEFAULT 0,
    token_total INTEGER DEFAULT 0
);

-- ============================================================
-- MONITORING TABLES
-- ============================================================

-- Token usage and costs
CREATE TABLE token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    model TEXT NOT NULL,
    provider TEXT,  -- anthropic, openrouter, deepseek, gemini
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL,  -- calculated cost
    task_type TEXT,  -- conversation, code, summarize, heartbeat, subagent
    task_detail TEXT,  -- more specific description
    latency_ms INTEGER,  -- response time
    created_at TEXT DEFAULT (datetime('now'))
);

-- Error and warning logs
CREATE TABLE error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK(level IN ('error', 'warn', 'info', 'debug')),
    source TEXT NOT NULL,  -- tool or component name
    message TEXT NOT NULL,
    details TEXT,  -- additional context
    stack TEXT,  -- stack trace if available
    resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    resolved_by TEXT,  -- 'human' or 'agent'
    created_at TEXT DEFAULT (datetime('now'))
);

-- Activity log (what the agent did)
CREATE TABLE activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,  -- 'email_checked', 'post_created', 'task_completed', etc
    category TEXT,  -- 'communication', 'content', 'task', 'system'
    description TEXT,
    metadata TEXT,  -- JSON with action-specific data
    session_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Integration health snapshots
CREATE TABLE health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration TEXT NOT NULL,  -- gmail, calendar, twitter, etc
    status TEXT NOT NULL CHECK(status IN ('ok', 'degraded', 'error')),
    message TEXT,
    latency_ms INTEGER,
    checked_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Tasks
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Contacts
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_contacts_followup ON contacts(follow_up_date);

-- Content
CREATE INDEX idx_content_platform ON content(platform);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_scheduled ON content(scheduled_for);

-- Memory
CREATE INDEX idx_memory_category ON memory(category);
CREATE INDEX idx_memory_subject ON memory(subject);
CREATE INDEX idx_memory_importance ON memory(importance);

-- Token usage
CREATE INDEX idx_token_date ON token_usage(created_at);
CREATE INDEX idx_token_model ON token_usage(model);
CREATE INDEX idx_token_task ON token_usage(task_type);

-- Error logs
CREATE INDEX idx_errors_level ON error_logs(level);
CREATE INDEX idx_errors_source ON error_logs(source);
CREATE INDEX idx_errors_date ON error_logs(created_at);
CREATE INDEX idx_errors_unresolved ON error_logs(resolved) WHERE resolved = 0;

-- Activity
CREATE INDEX idx_activity_action ON activity(action);
CREATE INDEX idx_activity_date ON activity(created_at);

-- Health
CREATE INDEX idx_health_integration ON health_checks(integration);
CREATE INDEX idx_health_date ON health_checks(checked_at);

-- ============================================================
-- VIEWS (convenience queries)
-- ============================================================

-- Active tasks summary
CREATE VIEW v_active_tasks AS
SELECT 
    t.*,
    p.name as project_name,
    p.color as project_color
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.status IN ('todo', 'in_progress', 'blocked')
ORDER BY t.priority ASC, t.due_date ASC;

-- Contacts needing follow-up
CREATE VIEW v_followup_needed AS
SELECT *
FROM contacts
WHERE follow_up_date <= date('now')
   OR (last_contact < date('now', '-7 days') AND follow_up_date IS NULL)
ORDER BY last_contact ASC;

-- Today's costs
CREATE VIEW v_today_costs AS
SELECT 
    model,
    task_type,
    SUM(tokens_in) as total_in,
    SUM(tokens_out) as total_out,
    SUM(cost_usd) as total_cost
FROM token_usage
WHERE date(created_at) = date('now')
GROUP BY model, task_type;

-- Unresolved errors
CREATE VIEW v_open_errors AS
SELECT *
FROM error_logs
WHERE resolved = 0
ORDER BY created_at DESC;

-- Latest health per integration
CREATE VIEW v_current_health AS
SELECT h1.*
FROM health_checks h1
INNER JOIN (
    SELECT integration, MAX(checked_at) as latest
    FROM health_checks
    GROUP BY integration
) h2 ON h1.integration = h2.integration AND h1.checked_at = h2.latest;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE TRIGGER tasks_updated AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER projects_updated AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER contacts_updated AFTER UPDATE ON contacts
BEGIN
    UPDATE contacts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER content_updated AFTER UPDATE ON content
BEGIN
    UPDATE content SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER memory_updated AFTER UPDATE ON memory
BEGIN
    UPDATE memory SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-set completed_at when task is done
CREATE TRIGGER task_completed AFTER UPDATE OF status ON tasks
WHEN NEW.status = 'done' AND OLD.status != 'done'
BEGIN
    UPDATE tasks SET completed_at = datetime('now') WHERE id = NEW.id;
END;
```

---

## CLI Tool

Access database via `tools/db.js`:

```bash
# Tasks
node tools/db.js tasks list                      # List active tasks
node tools/db.js tasks list --all                # Include completed
node tools/db.js tasks add "Title" --priority 1  # Add task
node tools/db.js tasks done 5                    # Complete task #5
node tools/db.js tasks update 5 --status blocked --blocked-reason "Waiting on X"

# Projects
node tools/db.js projects list
node tools/db.js projects add "Project Name"
node tools/db.js projects archive 3

# Contacts
node tools/db.js contacts list
node tools/db.js contacts add "Name" --email x@y.com --company "Acme"
node tools/db.js contacts followup               # Show follow-up needed
node tools/db.js contacts note 5 "Had a call, discussed..."

# Content
node tools/db.js content list --platform linkedin
node tools/db.js content add --platform x --title "Thread idea"
node tools/db.js content schedule 5 --date "2026-02-10"

# Memory
node tools/db.js memory add "Jason prefers morning meetings" --category preference
node tools/db.js memory search "meetings"
node tools/db.js memory list --category fact

# Costs
node tools/db.js costs today
node tools/db.js costs week
node tools/db.js costs month --by-model

# Logs
node tools/db.js logs errors                     # Unresolved errors
node tools/db.js logs resolve 12                 # Mark resolved
node tools/db.js logs activity --limit 20

# Health
node tools/db.js health                          # Current status all integrations
node tools/db.js health check gmail              # Run health check
```

---

## Migration Strategy

### From MEMORY.md

```bash
# One-time import
node tools/db.js migrate memory-md

# Reads MEMORY.md, parses sections, imports to memory table
# Original file preserved as backup
```

### From JSON Files

```bash
# Import existing JSON state files
node tools/db.js migrate json-files

# Reads: content-calendar.json, contacts.json, etc.
# Imports to appropriate tables
```

---

## Backup & Restore

```bash
# Backup (just copy the file)
cp ~/.openclaw/data/agent.db ~/.openclaw/backups/agent-$(date +%Y%m%d).db

# Restore
cp ~/.openclaw/backups/agent-20260204.db ~/.openclaw/data/agent.db

# Export to JSON (for portability)
node tools/db.js export --output backup.json

# Import from JSON
node tools/db.js import backup.json
```

---

## Performance Notes

### Expected Volumes (10 years)

| Table | Rows/Day | 10 Year Total | Size |
|-------|----------|---------------|------|
| tasks | 5 | 18,000 | ~2MB |
| contacts | 0.5 | 1,800 | ~200KB |
| content | 2 | 7,300 | ~1MB |
| token_usage | 200 | 730,000 | ~50MB |
| error_logs | 50 | 180,000 | ~20MB |
| activity | 100 | 365,000 | ~40MB |
| **TOTAL** | - | ~1.3M rows | **~120MB** |

SQLite handles this trivially.

### Query Performance

With indexes in place:
- Point lookups: <1ms
- List queries: <10ms
- Aggregations: <100ms
- Full table scans (rare): <1s

### WAL Mode Benefits

- Readers don't block writers
- Writers don't block readers
- Crash-safe
- Better performance for read-heavy workloads

---

## Integration with Agent

### In Tool Code

```javascript
// lib/db.js
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || '~/.openclaw/data/agent.db');

// Enable WAL
db.pragma('journal_mode = WAL');

// Example: Get active tasks
function getActiveTasks(projectId = null) {
  let sql = `SELECT * FROM v_active_tasks`;
  if (projectId) sql += ` WHERE project_id = ?`;
  return db.prepare(sql).all(projectId ? [projectId] : []);
}

// Example: Log token usage
function logUsage({ model, tokensIn, tokensOut, cost, taskType }) {
  db.prepare(`
    INSERT INTO token_usage (model, tokens_in, tokens_out, cost_usd, task_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(model, tokensIn, tokensOut, cost, taskType);
}

// Example: Log error
function logError({ source, message, stack }) {
  db.prepare(`
    INSERT INTO error_logs (level, source, message, stack)
    VALUES ('error', ?, ?, ?)
  `).run(source, message, stack);
}

module.exports = { db, getActiveTasks, logUsage, logError };
```

### In Agent Instructions (MEMORY.md)

```markdown
## Database Commands

When managing tasks:
- List tasks: `node tools/db.js tasks list`
- Add task: `node tools/db.js tasks add "Title"`
- Complete: `node tools/db.js tasks done <id>`

When tracking costs:
- Today's spend: `node tools/db.js costs today`
- This week: `node tools/db.js costs week`

When checking health:
- All integrations: `node tools/db.js health`
- Specific: `node tools/db.js health check gmail`
```

---

*Schema version: 1.0*
*Created: 2026-02-04*
