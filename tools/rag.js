#!/usr/bin/env node
/**
 * RAG Tool - Vector memory using Vectra + Gemini embeddings (free!)
 * 
 * Usage:
 *   node rag.js add "text to remember" [--source "note"]
 *   node rag.js search "query" [--top 5]
 *   node rag.js list
 *   node rag.js stats
 */

const { LocalIndex } = require('vectra');
const fs = require('fs');
const path = require('path');

// Config
const INDEX_PATH = path.join(__dirname, '..', 'data', 'vectors');

// Load API key
function loadKey(keyName) {
  // Try .env file
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(new RegExp(`${keyName}=(.+)`));
    if (match) return match[1].trim();
  }
  // Fall back to environment
  return process.env[keyName] || null;
}

const GEMINI_API_KEY = loadKey('GEMINI_API_KEY');

// Get embedding using Gemini (free!)
async function getEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY required - add to .env file (free: https://aistudio.google.com/apikey)');
  }
  
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.embedding.values;
}

// Parse CLI args
function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    } else {
      result._.push(args[i]);
    }
  }
  return result;
}

async function main() {
  const [,, cmd, ...rawArgs] = process.argv;
  const args = parseArgs(rawArgs);
  
  // Ensure index directory exists
  if (!fs.existsSync(INDEX_PATH)) {
    fs.mkdirSync(INDEX_PATH, { recursive: true });
  }
  
  const index = new LocalIndex(INDEX_PATH);
  if (!await index.isIndexCreated()) {
    await index.createIndex();
  }

  switch (cmd) {
    case 'add': {
      const text = args._.join(' ');
      if (!text) {
        console.log('Usage: node rag.js add "text to remember" [--source "note"]');
        return;
      }
      
      const vector = await getEmbedding(text);
      await index.insertItem({
        vector,
        metadata: {
          text,
          source: args.source || 'manual',
          timestamp: Date.now()
        }
      });
      console.log('✓ Added to memory');
      break;
    }

    case 'search': {
      const query = args._.join(' ');
      const topK = parseInt(args.top) || 5;
      
      if (!query) {
        console.log('Usage: node rag.js search "query" [--top 5]');
        return;
      }
      
      const vector = await getEmbedding(query);
      const results = await index.queryItems(vector, topK);
      
      if (results.length === 0) {
        console.log('No results found');
        return;
      }
      
      console.log(`\nTop ${results.length} results:\n`);
      results.forEach((r, i) => {
        const meta = r.item.metadata;
        console.log(`[${i + 1}] (score: ${r.score.toFixed(3)})`);
        if (meta.source) console.log(`    Source: ${meta.source}`);
        console.log(`    ${meta.text}`);
        console.log('');
      });
      break;
    }

    case 'list': {
      const items = await index.listItems();
      console.log(`\nTotal items: ${items.length}\n`);
      
      items.slice(0, 10).forEach((item, i) => {
        const meta = item.metadata;
        const preview = meta.text?.substring(0, 60).replace(/\n/g, ' ') || '?';
        console.log(`  ${i + 1}. ${preview}...`);
        if (meta.source) console.log(`     (source: ${meta.source})`);
      });
      
      if (items.length > 10) {
        console.log(`\n  ... and ${items.length - 10} more`);
      }
      break;
    }

    case 'stats': {
      const items = await index.listItems();
      const sources = {};
      items.forEach(item => {
        const src = item.metadata.source || 'unknown';
        sources[src] = (sources[src] || 0) + 1;
      });
      
      console.log(`\nRAG Statistics:`);
      console.log(`  Total items: ${items.length}`);
      console.log(`  Index path: ${INDEX_PATH}`);
      console.log(`\n  By source:`);
      Object.entries(sources).forEach(([src, count]) => {
        console.log(`    ${src}: ${count}`);
      });
      break;
    }

    case 'delete': {
      const id = args._[0];
      if (!id) {
        console.log('Usage: node rag.js delete <id>');
        console.log('       node rag.js delete --all');
        return;
      }
      
      if (args.all) {
        fs.rmSync(INDEX_PATH, { recursive: true, force: true });
        console.log('✓ Cleared all memories');
      } else {
        // Vectra doesn't have direct delete by ID, would need to rebuild index
        console.log('Note: Vectra requires index rebuild for deletion. Use --all to clear everything.');
      }
      break;
    }

    default:
      console.log(`
OpenClaw RAG Tool (Vectra)

Usage:
  node rag.js add "text to remember" [--source "note"]
  node rag.js search "query" [--top 5]
  node rag.js list
  node rag.js stats
  node rag.js delete --all

Index path: ${INDEX_PATH}
      `);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
