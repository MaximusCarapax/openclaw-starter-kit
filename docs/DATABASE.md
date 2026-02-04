# Self-Hosted Database Options

For agents that need persistent structured data beyond markdown files.

## When You Need a Database

Markdown files work great for:
- Memory/journal entries
- Configuration
- Simple lists and notes

Consider a database when you need:
- Fast queries across lots of records
- Relational data (contacts → interactions → tasks)
- Search/filter capabilities
- Concurrent access
- Data integrity constraints

## Recommended: SQLite

**Why SQLite?**
- Zero configuration — just a file
- No server to run
- Surprisingly powerful (handles millions of rows)
- Built into Node.js ecosystem
- Easy backup (just copy the file)

### Setup

```bash
cd ~/.openclaw/workspace
npm install better-sqlite3
```

### Example: Contacts Database

Create `tools/contacts-db.js`:

```javascript
#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/contacts.db'));

// Initialize schema
db.exec(\`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id),
    type TEXT NOT NULL,  -- 'call', 'sms', 'email', 'meeting'
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_contact_name ON contacts(name);
  CREATE INDEX IF NOT EXISTS idx_interaction_contact ON interactions(contact_id);
\`);

// CLI commands
const cmd = process.argv[2];
const args = process.argv.slice(3);

switch (cmd) {
  case 'add':
    const [name, phone, email] = args;
    const result = db.prepare(
      'INSERT INTO contacts (name, phone, email) VALUES (?, ?, ?)'
    ).run(name, phone || null, email || null);
    console.log('Added contact:', result.lastInsertRowid);
    break;
    
  case 'find':
    const query = args[0];
    const contacts = db.prepare(
      'SELECT * FROM contacts WHERE name LIKE ?'
    ).all(\`%\${query}%\`);
    console.log(JSON.stringify(contacts, null, 2));
    break;
    
  case 'list':
    const all = db.prepare('SELECT * FROM contacts ORDER BY name').all();
    all.forEach(c => console.log(\`\${c.id}. \${c.name} - \${c.phone || 'no phone'}\`));
    break;
    
  case 'log':
    const [contactId, type, summary] = args;
    db.prepare(
      'INSERT INTO interactions (contact_id, type, summary) VALUES (?, ?, ?)'
    ).run(contactId, type, summary);
    console.log('Logged interaction');
    break;
    
  case 'history':
    const cid = args[0];
    const history = db.prepare(\`
      SELECT i.*, c.name 
      FROM interactions i 
      JOIN contacts c ON i.contact_id = c.id 
      WHERE contact_id = ? 
      ORDER BY created_at DESC
    \`).all(cid);
    console.log(JSON.stringify(history, null, 2));
    break;
    
  default:
    console.log(\`
Contacts Database

Commands:
  add <name> [phone] [email]  Add a contact
  find <query>                Search contacts
  list                        List all contacts
  log <id> <type> <summary>   Log an interaction
  history <id>                View contact history
    \`);
}

db.close();
```

Usage:
```bash
node tools/contacts-db.js add "Kevin" "+61478079770" "kevin@example.com"
node tools/contacts-db.js find "Kevin"
node tools/contacts-db.js log 1 call "Discussed lunch plans"
node tools/contacts-db.js history 1
```

## Alternative: PocketBase

If you want a more complete solution with:
- REST API built-in
- Admin UI
- Auth system
- Real-time subscriptions

### Setup

```bash
# Download PocketBase
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip -o pb.zip
unzip pb.zip -d ~/.openclaw/pocketbase
rm pb.zip

# Start it
~/.openclaw/pocketbase/pocketbase serve --http="127.0.0.1:8090"
```

### Access

- Admin UI: http://127.0.0.1:8090/_/
- API: http://127.0.0.1:8090/api/

### Using from Your Agent

```javascript
const PocketBase = require('pocketbase');
const pb = new PocketBase('http://127.0.0.1:8090');

// Create a record
const contact = await pb.collection('contacts').create({
  name: 'Kevin',
  phone: '+61478079770'
});

// Query records
const results = await pb.collection('contacts').getList(1, 50, {
  filter: 'name ~ "Kevin"'
});
```

## Data Patterns

### Contact + CRM

```
contacts
├── id, name, phone, email, notes
├── tags (JSON array)
└── last_contact_date

interactions
├── contact_id (FK)
├── type (call/sms/email/meeting)
├── summary
├── sentiment (positive/neutral/negative)
└── follow_up_date

tasks
├── contact_id (FK, optional)
├── title, description
├── due_date
├── status
└── priority
```

### Call Log Storage

```
calls
├── id
├── contact_id (FK)
├── direction (inbound/outbound)
├── phone_number
├── duration_seconds
├── transcript (TEXT)
├── summary (AI-generated)
├── sentiment
└── created_at
```

### Content Calendar

```
content
├── id
├── platform (linkedin/x/newsletter)
├── status (idea/draft/scheduled/published)
├── title
├── body
├── scheduled_for
├── published_at
├── engagement_stats (JSON)
└── created_at
```

## Migration from JSON Files

If you have existing JSON data:

```javascript
const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('data/app.db');
const jsonData = JSON.parse(fs.readFileSync('data/contacts.json'));

const insert = db.prepare(
  'INSERT INTO contacts (name, phone, email) VALUES (?, ?, ?)'
);

const migrate = db.transaction((contacts) => {
  for (const c of contacts) {
    insert.run(c.name, c.phone, c.email);
  }
});

migrate(jsonData);
console.log('Migrated', jsonData.length, 'contacts');
```

## Backup Strategy

### SQLite
```bash
# Simple copy
cp data/contacts.db data/backups/contacts-$(date +%Y%m%d).db

# Or use SQLite's backup command
sqlite3 data/contacts.db ".backup data/backups/contacts-$(date +%Y%m%d).db"
```

### PocketBase
```bash
# Built-in backup
~/.openclaw/pocketbase/pocketbase backup

# Backups go to pb_data/backups/
```

## When to Use What

| Need | Solution |
|------|----------|
| Simple key-value | JSON files |
| Structured data, <10K records | SQLite |
| Need an API/UI | PocketBase |
| Full relational DB | PostgreSQL (overkill for most agents) |

## Getting Started

1. **Start simple** — Use JSON files until they become painful
2. **Graduate to SQLite** — When you need queries/relationships
3. **Consider PocketBase** — If you want a UI or API access

Most agents never need more than SQLite.

---

*Part of the [OpenClaw Starter Kit](https://github.com/MaximusCarapax/openclaw-starter-kit)*
