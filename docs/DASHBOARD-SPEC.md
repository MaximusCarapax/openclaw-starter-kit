# Agent Dashboard Specification

A modern, real-time dashboard for monitoring and managing your OpenClaw agent.

**Stack:** Next.js 14 + Tailwind CSS + shadcn/ui + SQLite

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent Dashboard                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Health  │ │  Costs  │ │  Tasks  │ │ Content │ │  Logs   │   │
│  │   🟢    │ │  $2.45  │ │  12/47  │ │  3 due  │ │  2 err  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                 │
│  [Overview] [Tasks] [Content] [Contacts] [Costs] [Settings]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 14 (App Router) | Modern React, API routes built-in, great DX |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Components | shadcn/ui | Beautiful, accessible, copy-paste components |
| Database | SQLite + better-sqlite3 | Local, fast, no setup |
| Charts | Recharts | React-native, works with shadcn |
| Real-time | Server-Sent Events | Simple, no WebSocket complexity |
| Icons | Lucide React | Clean, consistent icons |
| Forms | React Hook Form + Zod | Type-safe validation |

---

## Directory Structure

```
dashboard/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Overview/home
│   ├── tasks/
│   │   ├── page.tsx            # Task list
│   │   └── [id]/page.tsx       # Task detail
│   ├── content/
│   │   ├── page.tsx            # Content calendar
│   │   └── [id]/page.tsx       # Content detail/editor
│   ├── contacts/
│   │   ├── page.tsx            # Contact list (CRM)
│   │   └── [id]/page.tsx       # Contact detail
│   ├── costs/
│   │   └── page.tsx            # Token usage & costs
│   ├── logs/
│   │   └── page.tsx            # Error logs & activity
│   ├── settings/
│   │   └── page.tsx            # Agent settings
│   └── api/
│       ├── health/route.ts     # Health check endpoint
│       ├── tasks/route.ts      # Tasks CRUD
│       ├── content/route.ts    # Content CRUD
│       ├── contacts/route.ts   # Contacts CRUD
│       ├── costs/route.ts      # Cost data
│       ├── logs/route.ts       # Log data
│       └── stream/route.ts     # SSE for real-time updates
├── components/
│   ├── ui/                     # shadcn components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── stat-card.tsx
│   ├── tasks/
│   │   ├── task-list.tsx
│   │   ├── task-card.tsx
│   │   └── task-form.tsx
│   ├── content/
│   │   ├── calendar-view.tsx
│   │   ├── content-card.tsx
│   │   └── content-form.tsx
│   ├── contacts/
│   │   ├── contact-list.tsx
│   │   └── contact-card.tsx
│   ├── costs/
│   │   ├── cost-chart.tsx
│   │   └── usage-table.tsx
│   └── logs/
│       ├── error-feed.tsx
│       └── activity-feed.tsx
├── lib/
│   ├── db.ts                   # SQLite connection
│   ├── schema.ts               # Database schema types
│   └── utils.ts                # Helpers
├── public/
│   └── ...
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## Pages

### 1. Overview (Home)

The main dashboard showing key metrics at a glance.

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, Jason                            [Refresh] [⚙️]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ HEALTH       │ │ TODAY'S COST │ │ TASKS        │            │
│  │     🟢       │ │    $2.45     │ │   3 todo     │            │
│  │  All systems │ │  ↑12% vs avg │ │   1 overdue  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ CONTENT      │ │ CONTACTS     │ │ ERRORS       │            │
│  │  2 scheduled │ │  15 total    │ │   2 new      │            │
│  │  1 due today │ │  3 follow-up │ │   ⚠️ check   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  INTEGRATION STATUS                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Gmail        🟢 OK      │ Calendar     🟢 OK              │ │
│  │ X/Twitter    🟡 Limited │ LinkedIn     🔴 Session expired │ │
│  │ Twilio       🟢 OK      │ DeepSeek     🟢 OK              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  RECENT ACTIVITY                              [View all →]      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 10:23  ✓ Checked email (3 new)                            │ │
│  │ 10:15  ✓ Posted to LinkedIn                               │ │
│  │ 09:45  ⚠ LinkedIn session refresh failed                  │ │
│  │ 09:30  ✓ Heartbeat completed                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `StatCard` — Metric with label, value, trend
- `IntegrationStatus` — Grid of integration health
- `ActivityFeed` — Recent agent actions

**Data:**
- Health checks from each integration
- Aggregated costs from `token_usage` table
- Task counts from `tasks` table
- Error counts from `error_logs` table

---

### 2. Tasks

Full task management view.

```
┌─────────────────────────────────────────────────────────────────┐
│  Tasks                                    [+ New Task] [Filter] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Todo    │ │ In Prog │ │ Blocked │ │  Done   │               │
│  │   12    │ │    3    │ │    1    │ │   47    │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ☐ [!] Review PR for starter kit          Due: Today       │ │
│  │      Project: OpenClaw  •  Created: 2 days ago            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ ☐     Write dashboard spec               Due: Tomorrow    │ │
│  │      Project: OpenClaw  •  Created: 1 day ago             │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ ☐     Set up AU phone number             Due: This week   │ │
│  │      Project: Infrastructure  •  Created: 3 days ago      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Load more...]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter by status, project, priority, due date
- Inline status toggle (click checkbox)
- Quick add task (modal)
- Drag-and-drop reorder (nice to have)
- Project grouping

**Components:**
- `TaskList` — Filterable list
- `TaskCard` — Single task row
- `TaskForm` — Create/edit modal
- `ProjectFilter` — Dropdown filter

---

### 3. Content Calendar

Content planning and scheduling.

```
┌─────────────────────────────────────────────────────────────────┐
│  Content Calendar                         [+ New Post] [View ▾] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  February 2026                              [< Prev] [Next >]   │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                   │
│  │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
│  │  3  │  4  │  5  │  6  │  7  │  8  │  9  │                   │
│  │     │ 🔵  │     │ 🟢  │     │     │     │                   │
│  │     │ LI  │     │ X   │     │     │     │                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
│  │ 10  │ 11  │ 12  │ 13  │ 14  │ 15  │ 16  │                   │
│  │ 🟡  │     │ 🔵  │     │ 🟢  │     │     │                   │
│  │ YT  │     │ LI  │     │ X   │     │     │                   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                   │
│                                                                 │
│  🔵 LinkedIn  🟢 X/Twitter  🟡 YouTube  ⚪ Draft                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  UPCOMING                                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Feb 4  │ LI │ "AI agents aren't magic..."  │ Scheduled    │ │
│  │ Feb 6  │ X  │ Thread: Cost optimization    │ Draft        │ │
│  │ Feb 10 │ YT │ Dashboard tutorial           │ Idea         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Calendar view (month/week)
- List view toggle
- Platform filtering
- Status workflow: Idea → Draft → Scheduled → Published
- Click to edit content
- Metrics after publish (likes, shares, etc.)

**Components:**
- `CalendarView` — Month/week grid
- `ContentCard` — Single content item
- `ContentForm` — Rich editor for posts
- `PlatformBadge` — Platform indicator

---

### 4. Contacts (CRM)

Simple contact management.

```
┌─────────────────────────────────────────────────────────────────┐
│  Contacts                              [+ Add Contact] [Search] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👤 John Smith                                              │ │
│  │    john@company.com  •  +1 555-1234                        │ │
│  │    Company Inc  •  Last contact: 3 days ago                │ │
│  │    [Email] [Call] [Note]                                   │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 👤 Sarah Johnson                                           │ │
│  │    sarah@startup.io  •  +1 555-5678                        │ │
│  │    Startup.io  •  Last contact: 1 week ago  ⚠️             │ │
│  │    [Email] [Call] [Note]                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  NEEDS FOLLOW-UP (no contact > 7 days)                         │
│  • Sarah Johnson (1 week)                                       │
│  • Mike Chen (2 weeks)                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Contact list with search
- Quick actions (draft email, initiate call, add note)
- Follow-up reminders
- Interaction history
- Tags/categories

**Components:**
- `ContactList` — Searchable list
- `ContactCard` — Contact summary
- `ContactDetail` — Full contact view with history
- `InteractionLog` — Timeline of interactions

---

### 5. Costs

Token usage and cost tracking.

```
┌─────────────────────────────────────────────────────────────────┐
│  Costs & Usage                           [This Month ▾] [Export]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ TODAY        │ │ THIS WEEK    │ │ THIS MONTH   │            │
│  │    $2.45     │ │   $18.20     │ │   $52.00     │            │
│  │  ↑12% vs avg │ │  ↓5% vs last │ │  on track    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     DAILY SPEND                            │ │
│  │  $5 ┤                                                      │ │
│  │     │      ██                                              │ │
│  │  $3 ┤  ██  ██  ██      ██                                  │ │
│  │     │  ██  ██  ██  ██  ██  ██                              │ │
│  │  $1 ┤  ██  ██  ██  ██  ██  ██  ██                          │ │
│  │     └──────────────────────────────────────────            │ │
│  │        M   T   W   T   F   S   S                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  BY MODEL                           BY TASK TYPE                │
│  ┌─────────────────────────┐       ┌─────────────────────────┐  │
│  │ Claude Opus    $28.50   │       │ Conversation  $22.00    │  │
│  │ Claude Sonnet  $15.20   │       │ Coding        $8.50     │  │
│  │ Claude Haiku   $4.30    │       │ Research      $2.00     │  │
│  │ DeepSeek       $2.00    │       │ Heartbeat     $4.50     │  │
│  │ Gemini         $0.00    │       │ Sub-agents    $15.00    │  │
│  └─────────────────────────┘       └─────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  RECENT USAGE                                    [View all →]   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 10:23 │ opus     │ conversation │ 2.3K in │ 1.1K out │$0.18│ │
│  │ 10:15 │ deepseek │ code         │ 5.0K in │ 3.2K out │$0.02│ │
│  │ 09:45 │ haiku    │ heartbeat    │ 1.2K in │ 0.4K out │$0.01│ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Period selection (day/week/month/custom)
- Breakdown by model and task type
- Trend charts
- Usage log with details
- Export to CSV

**Components:**
- `CostSummary` — Period totals with trends
- `CostChart` — Daily/weekly spend chart
- `BreakdownPie` — By model/task type
- `UsageTable` — Detailed log

---

### 6. Logs

Error and activity monitoring.

```
┌─────────────────────────────────────────────────────────────────┐
│  Logs                                    [Errors ▾] [Filter ▾]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ ERRORS       │ │ WARNINGS     │ │ INFO         │            │
│  │     2        │ │     5        │ │    127       │            │
│  │  last 24h    │ │  last 24h    │ │  last 24h    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔴 10:23  linkedin     Session expired                     │ │
│  │           Need to re-authenticate browser session          │ │
│  │           [Mark Resolved] [View Stack]                     │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 🟡 09:45  gemini       Rate limit warning (80%)            │ │
│  │           Approaching daily quota                          │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 🔴 09:30  reddit-pulse Connection failed                   │ │
│  │           Reddit API returned 403                          │ │
│  │           [Mark Resolved] [View Stack]                     │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ 🔵 09:15  heartbeat    Completed successfully              │ │
│  │           Checked: email, calendar, mentions               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Load more...]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter by level (error/warn/info)
- Filter by source (tool name)
- Mark as resolved
- View stack traces
- Real-time updates via SSE

**Components:**
- `LogFeed` — Filterable log list
- `LogEntry` — Single log row
- `StackModal` — Full error details

---

### 7. Settings

Agent configuration.

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MODELS                                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Default Model      [Claude Sonnet 4        ▾]              │ │
│  │ Heartbeat Model    [Claude Haiku 3.5       ▾]              │ │
│  │ Coding Model       [DeepSeek               ▾]              │ │
│  │ Research Model     [Gemini Flash           ▾]              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  HEARTBEAT                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Frequency          [Every hour             ▾]              │ │
│  │ Quiet Hours        [11pm - 8am             ▾]              │ │
│  │ Enabled            [✓]                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  INTEGRATIONS                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Gmail          🟢 Connected    [Reconnect] [Disconnect]    │ │
│  │ Calendar       🟢 Connected    [Reconnect] [Disconnect]    │ │
│  │ X/Twitter      🟡 Limited      [Reconnect] [Settings]      │ │
│  │ LinkedIn       🔴 Expired      [Reconnect] [Settings]      │ │
│  │ Twilio         🟢 Connected    [Settings]                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  COST LIMITS                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Daily limit        [$10.00        ]  Alert at 80%  [✓]     │ │
│  │ Monthly limit      [$200.00       ]  Alert at 80%  [✓]     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Save Changes]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Model selection for different task types
- Heartbeat configuration
- Integration status and reconnect
- Cost alerts and limits
- Writes to openclaw.json

---

## API Routes

### `/api/health`
```typescript
GET /api/health
Response: {
  status: 'ok' | 'degraded' | 'error',
  integrations: {
    gmail: { status: 'ok', lastCheck: '2026-02-04T10:23:00Z' },
    calendar: { status: 'ok', lastCheck: '2026-02-04T10:23:00Z' },
    twitter: { status: 'limited', message: 'Rate limited', lastCheck: '...' },
    linkedin: { status: 'error', message: 'Session expired', lastCheck: '...' },
    // ...
  }
}
```

### `/api/tasks`
```typescript
GET /api/tasks?status=todo&project=1&limit=20
POST /api/tasks { title, description, status, priority, project_id, due_date }
PATCH /api/tasks/:id { ...partial update }
DELETE /api/tasks/:id
```

### `/api/content`
```typescript
GET /api/content?status=scheduled&platform=linkedin&month=2026-02
POST /api/content { platform, title, content, status, scheduled_for }
PATCH /api/content/:id { ...partial update }
DELETE /api/content/:id
```

### `/api/contacts`
```typescript
GET /api/contacts?search=john&needsFollowup=true
POST /api/contacts { name, email, phone, company, notes }
PATCH /api/contacts/:id { ...partial update }
DELETE /api/contacts/:id
```

### `/api/costs`
```typescript
GET /api/costs?period=day|week|month&start=2026-02-01&end=2026-02-04
Response: {
  total: 52.00,
  byModel: { 'claude-opus': 28.50, ... },
  byTask: { 'conversation': 22.00, ... },
  daily: [{ date: '2026-02-01', cost: 2.45 }, ...]
}
```

### `/api/logs`
```typescript
GET /api/logs?level=error&source=linkedin&limit=50
PATCH /api/logs/:id { resolved: true }
```

### `/api/stream`
```typescript
GET /api/stream (Server-Sent Events)
Events:
- health: Integration status change
- log: New log entry
- cost: Token usage update
- task: Task status change
```

---

## Database Schema

See `DATABASE.md` for full schema. Key tables:

- `tasks` — Task management
- `projects` — Task grouping
- `contacts` — CRM
- `content_calendar` — Content planning
- `token_usage` — Cost tracking
- `error_logs` — Error monitoring
- `memory` — Agent memory (queryable)
- `call_history` — Call logs

---

## Real-time Updates

Using Server-Sent Events for simplicity:

```typescript
// app/api/stream/route.ts
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to database changes
      db.on('change', (table, row) => {
        controller.enqueue(`event: ${table}\ndata: ${JSON.stringify(row)}\n\n`);
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Client side
const events = new EventSource('/api/stream');
events.addEventListener('log', (e) => {
  const log = JSON.parse(e.data);
  // Update UI
});
```

---

## Authentication

For starter kit simplicity: **None by default.**

Dashboard runs on localhost:3000, only accessible locally or via SSH tunnel.

**Optional:** Add basic auth via environment variable:
```bash
DASHBOARD_PASSWORD=your-secret
```

---

## Deployment

### Development
```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

### Production (with agent)
```bash
cd dashboard
npm run build
npm start
# Or integrate with pm2
pm2 start npm --name dashboard -- start
```

### With OpenClaw Gateway
Add to startup script to run alongside gateway.

---

## Implementation Order

### Phase 1: Foundation (Day 1-2)
1. Next.js project setup with Tailwind + shadcn
2. Layout with sidebar navigation
3. SQLite connection and basic queries
4. Overview page with static data

### Phase 2: Core Pages (Day 2-3)
5. Tasks page with CRUD
6. Content calendar page
7. Contacts page (basic)

### Phase 3: Monitoring (Day 3-4)
8. Costs page with charts
9. Logs page with filtering
10. Health checks integration

### Phase 4: Real-time + Polish (Day 4-5)
11. SSE streaming
12. Settings page
13. Mobile responsiveness
14. Error handling + loading states

---

## Component Library (shadcn/ui)

Install these components:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label select
npx shadcn-ui@latest add table tabs badge avatar
npx shadcn-ui@latest add dialog dropdown-menu calendar
npx shadcn-ui@latest add toast skeleton separator
```

---

## Notes for Implementation

1. **DeepSeek can build all of this** — Use Aider with clear specs
2. **Start with mock data** — Get UI right before wiring DB
3. **Mobile-first** — Tailwind makes this easy
4. **Incremental delivery** — Each page can ship independently
5. **Keep API simple** — REST is fine, no GraphQL needed

---

*Spec version: 1.0*
*Created: 2026-02-04*
*Author: Maximus Carapax*
