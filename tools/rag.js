#!/usr/bin/env node
/**
 * RAG Tool - Vector memory using Vectra + OpenAI embeddings
 * 
 * Usage:
 *   node rag.js add "text to remember" --source "brain dump"
 *   node rag.js search "what did I say about X"
 *   node rag.js list
 *   node rag.js stats
 */

const { LocalIndex } = require('vectra');
const fs = require('fs');
const path = require('path');

// Config
const INDEX_PATH = path.join(__dirname, '..', 'data', 'vectors');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || (() => {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/OPENAI_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
})();

// Use Anthropic key for embeddings via a proxy or fall back to text-based
const EMBEDDING_MODEL = 'text-embedding-3-small';

async function getEmbedding(text) {
  // Try OpenAI embeddings
  if (OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.data[0].embedding;
  }
  
  // Fallback: Use Gemini embeddings (free)
  const geminiKey = (() => {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      const match = env.match(/GEMINI_API_KEY=(.+)/);
      if (match) return match[1].trim();
    }
    return null;
  })();
  
  if (geminiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.embedding.values;
  }
  
  throw new Error('No embedding API key found (OPENAI_API_KEY or GEMINI_API_KEY)');
}

async function getIndex() {
  const index = new LocalIndex(INDEX_PATH);
  if (!await index.isIndexCreated()) {
    await index.createIndex();
  }
  return index;
}

async function addDocument(text, metadata = {}) {
  const index = await getIndex();
  const embedding = await getEmbedding(text);
  
  const item = {
    vector: embedding,
    metadata: {
      text,
      source: metadata.source || 'unknown',
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
  
  await index.insertItem(item);
  return item.metadata;
}

async function search(query, topK = 5) {
  const index = await getIndex();
  const queryEmbedding = await getEmbedding(query);
  
  const results = await index.queryItems(queryEmbedding, topK);
  return results.map(r => ({
    score: r.score,
    text: r.item.metadata.text,
    source: r.item.metadata.source,
    timestamp: r.item.metadata.timestamp
  }));
}

async function listRecent(limit = 10) {
  const index = await getIndex();
  const items = await index.listItems();
  
  return items
    .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))
    .slice(0, limit)
    .map(item => ({
      text: item.metadata.text?.substring(0, 100) + '...',
      source: item.metadata.source,
      timestamp: item.metadata.timestamp
    }));
}

async function getStats() {
  const index = await getIndex();
  const items = await index.listItems();
  
  const sources = {};
  items.forEach(item => {
    const src = item.metadata.source || 'unknown';
    sources[src] = (sources[src] || 0) + 1;
  });
  
  return {
    totalItems: items.length,
    sources,
    oldestItem: items.length ? items.reduce((a, b) => 
      new Date(a.metadata.timestamp) < new Date(b.metadata.timestamp) ? a : b
    ).metadata.timestamp : null,
    newestItem: items.length ? items.reduce((a, b) => 
      new Date(a.metadata.timestamp) > new Date(b.metadata.timestamp) ? a : b
    ).metadata.timestamp : null
  };
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  try {
    switch (command) {
      case 'add': {
        const text = args[1];
        const sourceIdx = args.indexOf('--source');
        const source = sourceIdx !== -1 ? args[sourceIdx + 1] : 'cli';
        
        if (!text) {
          console.log('Usage: rag.js add "text" --source "source name"');
          return;
        }
        
        const result = await addDocument(text, { source });
        console.log('✅ Added to vector memory');
        console.log(`   Source: ${result.source}`);
        console.log(`   Time: ${result.timestamp}`);
        break;
      }
      
      case 'search': {
        const query = args[1];
        const topK = parseInt(args[2]) || 5;
        
        if (!query) {
          console.log('Usage: rag.js search "query" [topK]');
          return;
        }
        
        const results = await search(query, topK);
        console.log(`\n🔍 Top ${results.length} results for: "${query}"\n`);
        results.forEach((r, i) => {
          console.log(`[${i + 1}] Score: ${r.score.toFixed(3)} | ${r.source} | ${r.timestamp}`);
          console.log(`    ${r.text}\n`);
        });
        break;
      }
      
      case 'list': {
        const limit = parseInt(args[1]) || 10;
        const items = await listRecent(limit);
        console.log(`\n📋 Recent ${items.length} items:\n`);
        items.forEach((item, i) => {
          console.log(`[${i + 1}] ${item.source} | ${item.timestamp}`);
          console.log(`    ${item.text}\n`);
        });
        break;
      }
      
      case 'stats': {
        const stats = await getStats();
        console.log('\n📊 Vector Memory Stats\n');
        console.log(`Total items: ${stats.totalItems}`);
        console.log(`Sources: ${JSON.stringify(stats.sources, null, 2)}`);
        console.log(`Oldest: ${stats.oldestItem}`);
        console.log(`Newest: ${stats.newestItem}`);
        break;
      }
      
      default:
        console.log(`
RAG Tool - Vector Memory

Commands:
  add "text" --source "name"   Add text to memory
  search "query" [topK]        Search memory
  list [limit]                 List recent items
  stats                        Show statistics

Examples:
  node rag.js add "Remember to review the quarterly report" --source "brain dump"
  node rag.js search "quarterly report"
  node rag.js list 5
  node rag.js stats
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { addDocument, search, listRecent, getStats, getEmbedding };

main();
