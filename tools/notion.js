#!/usr/bin/env node
/**
 * Notion Tool - Read/write pages, databases, tasks
 * Perfect for project management, notes, knowledge base
 * 
 * Setup:
 *   1. Go to https://www.notion.so/my-integrations
 *   2. Create new integration
 *   3. Copy the Internal Integration Token
 *   4. Add NOTION_API_KEY to .env
 *   5. Share your pages/databases with the integration
 * 
 * Usage:
 *   node notion.js search "query"                 - Search pages
 *   node notion.js page <id>                      - Get page content
 *   node notion.js databases                      - List databases
 *   node notion.js db <id>                        - Query database
 *   node notion.js add <db-id> <title> [props]    - Add item to database
 *   node notion.js update <page-id> <props>       - Update page properties
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API key
function getApiKey() {
  // Check environment
  if (process.env.NOTION_API_KEY) return process.env.NOTION_API_KEY;
  
  // Check .env file
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/NOTION_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  
  console.error(`
Notion API key not found.

Setup:
1. Go to https://www.notion.so/my-integrations
2. Create new integration (give it a name like "OpenClaw")
3. Copy the Internal Integration Token
4. Add to your .env file:
   NOTION_API_KEY=secret_xxxxx

5. IMPORTANT: Share your Notion pages/databases with the integration!
   - Open the page in Notion
   - Click "..." menu → "Add connections" → Select your integration
`);
  process.exit(1);
}

function notionAPI(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.notion.com',
      path: `/v1${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (res.statusCode >= 400) {
          reject(new Error(`Notion API error: ${json.message || JSON.stringify(json)}`));
        } else {
          resolve(json);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Extract plain text from rich text array
function richTextToPlain(richText) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(t => t.plain_text || '').join('');
}

// Extract value from property
function extractPropertyValue(prop) {
  if (!prop) return '';
  
  switch (prop.type) {
    case 'title':
      return richTextToPlain(prop.title);
    case 'rich_text':
      return richTextToPlain(prop.rich_text);
    case 'number':
      return prop.number;
    case 'select':
      return prop.select?.name || '';
    case 'multi_select':
      return prop.multi_select?.map(s => s.name).join(', ') || '';
    case 'date':
      return prop.date?.start || '';
    case 'checkbox':
      return prop.checkbox ? '✓' : '';
    case 'url':
      return prop.url || '';
    case 'email':
      return prop.email || '';
    case 'phone_number':
      return prop.phone_number || '';
    case 'status':
      return prop.status?.name || '';
    case 'people':
      return prop.people?.map(p => p.name).join(', ') || '';
    default:
      return JSON.stringify(prop[prop.type]);
  }
}

// Build property value for creating/updating
function buildPropertyValue(type, value) {
  switch (type) {
    case 'title':
      return { title: [{ text: { content: value } }] };
    case 'rich_text':
      return { rich_text: [{ text: { content: value } }] };
    case 'number':
      return { number: parseFloat(value) };
    case 'select':
      return { select: { name: value } };
    case 'multi_select':
      return { multi_select: value.split(',').map(v => ({ name: v.trim() })) };
    case 'date':
      return { date: { start: value } };
    case 'checkbox':
      return { checkbox: value === 'true' || value === '1' };
    case 'url':
      return { url: value };
    case 'status':
      return { status: { name: value } };
    default:
      return null;
  }
}

async function main() {
  const [,, cmd, ...args] = process.argv;
  
  try {
    switch (cmd) {
      case 'search': {
        const query = args.join(' ');
        if (!query) {
          console.log('Usage: node notion.js search "query"');
          return;
        }
        
        const result = await notionAPI('POST', '/search', {
          query,
          page_size: 10
        });
        
        console.log(`\n🔍 Search: "${query}" (${result.results.length} results)\n`);
        
        for (const item of result.results) {
          const title = item.properties?.title 
            ? richTextToPlain(item.properties.title.title)
            : item.properties?.Name 
              ? richTextToPlain(item.properties.Name.title)
              : 'Untitled';
          
          const type = item.object === 'database' ? '📊 Database' : '📄 Page';
          console.log(`${type}: ${title}`);
          console.log(`   ID: ${item.id}`);
          console.log(`   URL: ${item.url}\n`);
        }
        break;
      }
      
      case 'page': {
        const pageId = args[0];
        if (!pageId) {
          console.log('Usage: node notion.js page <page-id>');
          return;
        }
        
        const page = await notionAPI('GET', `/pages/${pageId}`);
        const blocks = await notionAPI('GET', `/blocks/${pageId}/children`);
        
        // Get title
        const titleProp = Object.values(page.properties).find(p => p.type === 'title');
        const title = titleProp ? richTextToPlain(titleProp.title) : 'Untitled';
        
        console.log(`\n# ${title}\n`);
        console.log(`URL: ${page.url}\n`);
        console.log('---\n');
        
        // Render blocks
        for (const block of blocks.results) {
          const text = richTextToPlain(block[block.type]?.rich_text);
          
          switch (block.type) {
            case 'paragraph':
              if (text) console.log(text + '\n');
              break;
            case 'heading_1':
              console.log(`\n# ${text}\n`);
              break;
            case 'heading_2':
              console.log(`\n## ${text}\n`);
              break;
            case 'heading_3':
              console.log(`\n### ${text}\n`);
              break;
            case 'bulleted_list_item':
              console.log(`• ${text}`);
              break;
            case 'numbered_list_item':
              console.log(`1. ${text}`);
              break;
            case 'to_do':
              const checked = block.to_do.checked ? '✓' : ' ';
              console.log(`[${checked}] ${text}`);
              break;
            case 'code':
              console.log(`\`\`\`${block.code.language || ''}`);
              console.log(text);
              console.log('```\n');
              break;
            case 'divider':
              console.log('---\n');
              break;
            default:
              if (text) console.log(text);
          }
        }
        break;
      }
      
      case 'databases':
      case 'dbs': {
        const result = await notionAPI('POST', '/search', {
          filter: { property: 'object', value: 'database' },
          page_size: 20
        });
        
        console.log(`\n📊 Databases (${result.results.length}):\n`);
        
        for (const db of result.results) {
          const title = richTextToPlain(db.title);
          console.log(`${title || 'Untitled'}`);
          console.log(`   ID: ${db.id}`);
          
          // Show properties
          const props = Object.entries(db.properties).map(([name, p]) => `${name}:${p.type}`);
          console.log(`   Properties: ${props.slice(0, 5).join(', ')}${props.length > 5 ? '...' : ''}`);
          console.log('');
        }
        break;
      }
      
      case 'db': {
        const dbId = args[0];
        const filter = args[1]; // Optional: status=Done, etc.
        
        if (!dbId) {
          console.log('Usage: node notion.js db <database-id> [filter]');
          console.log('Example: node notion.js db abc123 "status=In Progress"');
          return;
        }
        
        let body = { page_size: 20 };
        
        // Parse simple filter
        if (filter && filter.includes('=')) {
          const [prop, value] = filter.split('=');
          body.filter = {
            property: prop,
            status: { equals: value }  // Assumes status, could be smarter
          };
        }
        
        const result = await notionAPI('POST', `/databases/${dbId}/query`, body);
        
        // Get database info for property names
        const dbInfo = await notionAPI('GET', `/databases/${dbId}`);
        const propNames = Object.keys(dbInfo.properties);
        
        console.log(`\n📊 ${richTextToPlain(dbInfo.title) || 'Database'} (${result.results.length} items)\n`);
        
        for (const page of result.results) {
          // Find title property
          const titleProp = Object.entries(page.properties).find(([_, p]) => p.type === 'title');
          const title = titleProp ? richTextToPlain(titleProp[1].title) : 'Untitled';
          
          console.log(`• ${title}`);
          
          // Show key properties
          for (const [name, prop] of Object.entries(page.properties)) {
            if (prop.type === 'title') continue;
            const value = extractPropertyValue(prop);
            if (value) {
              console.log(`   ${name}: ${value}`);
            }
          }
          console.log(`   ID: ${page.id}\n`);
        }
        break;
      }
      
      case 'add': {
        const [dbId, title, ...propArgs] = args;
        
        if (!dbId || !title) {
          console.log('Usage: node notion.js add <database-id> "Title" [prop=value ...]');
          console.log('Example: node notion.js add abc123 "New task" "Status=To Do" "Priority=High"');
          return;
        }
        
        // Get database schema
        const dbInfo = await notionAPI('GET', `/databases/${dbId}`);
        
        // Build properties
        const properties = {};
        
        // Find and set title property
        const titlePropName = Object.entries(dbInfo.properties).find(([_, p]) => p.type === 'title')?.[0] || 'Name';
        properties[titlePropName] = { title: [{ text: { content: title } }] };
        
        // Parse additional properties
        for (const arg of propArgs) {
          const [name, value] = arg.split('=');
          const propSchema = dbInfo.properties[name];
          if (propSchema) {
            const propValue = buildPropertyValue(propSchema.type, value);
            if (propValue) properties[name] = propValue;
          }
        }
        
        const result = await notionAPI('POST', '/pages', {
          parent: { database_id: dbId },
          properties
        });
        
        console.log(`✓ Created: ${title}`);
        console.log(`  ID: ${result.id}`);
        console.log(`  URL: ${result.url}`);
        break;
      }
      
      case 'update': {
        const [pageId, ...propArgs] = args;
        
        if (!pageId || propArgs.length === 0) {
          console.log('Usage: node notion.js update <page-id> prop=value [prop=value ...]');
          console.log('Example: node notion.js update abc123 "Status=Done"');
          return;
        }
        
        // Get page to understand properties
        const page = await notionAPI('GET', `/pages/${pageId}`);
        
        // Build properties update
        const properties = {};
        
        for (const arg of propArgs) {
          const [name, value] = arg.split('=');
          const prop = page.properties[name];
          if (prop) {
            const propValue = buildPropertyValue(prop.type, value);
            if (propValue) properties[name] = propValue;
          }
        }
        
        await notionAPI('PATCH', `/pages/${pageId}`, { properties });
        
        console.log(`✓ Updated page ${pageId}`);
        break;
      }
      
      case 'tasks': {
        // Convenience: find a database that looks like tasks and show it
        const result = await notionAPI('POST', '/search', {
          filter: { property: 'object', value: 'database' },
          page_size: 10
        });
        
        // Find database with Status property
        const taskDb = result.results.find(db => 
          db.properties.Status || db.properties.status
        );
        
        if (!taskDb) {
          console.log('No task database found. Create a database with a "Status" property.');
          return;
        }
        
        console.log(`Found task database: ${richTextToPlain(taskDb.title)}\n`);
        
        // Query non-done tasks
        const tasks = await notionAPI('POST', `/databases/${taskDb.id}/query`, {
          filter: {
            property: 'Status',
            status: { does_not_equal: 'Done' }
          },
          page_size: 20
        });
        
        console.log(`📋 Open Tasks (${tasks.results.length}):\n`);
        
        for (const task of tasks.results) {
          const titleProp = Object.entries(task.properties).find(([_, p]) => p.type === 'title');
          const title = titleProp ? richTextToPlain(titleProp[1].title) : 'Untitled';
          const status = extractPropertyValue(task.properties.Status || task.properties.status);
          
          console.log(`• [${status || '?'}] ${title}`);
        }
        break;
      }
      
      default:
        console.log(`
Notion Tool

Setup:
  1. Create integration at https://www.notion.so/my-integrations
  2. Add NOTION_API_KEY=secret_xxx to .env
  3. Share pages/databases with your integration in Notion

Commands:
  node notion.js search "query"              Search pages & databases
  node notion.js page <id>                   Get page content
  node notion.js databases                   List all databases
  node notion.js db <id>                     Query database items
  node notion.js add <db-id> "Title" [props] Add item to database
  node notion.js update <page-id> prop=val   Update page properties
  node notion.js tasks                       Show open tasks

Examples:
  node notion.js add abc123 "Fix bug" "Status=To Do" "Priority=High"
  node notion.js update xyz789 "Status=Done"
  node notion.js db abc123 "Status=In Progress"
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
