#!/usr/bin/env node
/**
 * RAG Tool - Vector memory using ChromaDB + Gemini embeddings (free!)
 * 
 * Usage:
 *   node rag.js add "text to remember" [--collection name]
 *   node rag.js search "query" [--collection name] [--top 5]
 *   node rag.js ingest <file> [--collection name]
 *   node rag.js list [--collection name]
 *   node rag.js collections
 *   node rag.js delete <id> [--collection name]
 */

const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');

// Config
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const DEFAULT_COLLECTION = 'memories';

// Load API key for embeddings
function loadKey(keyName) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(new RegExp(`${keyName}=(.+)`));
    if (match) return match[1].trim();
  }
  return process.env[keyName] || null;
}

const GEMINI_API_KEY = loadKey('GEMINI_API_KEY');

// Get embedding using Gemini (free)
async function getEmbedding(text) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY required - add to .env file');
  
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

// Get embeddings for multiple texts
async function getEmbeddings(texts) {
  return Promise.all(texts.map(t => getEmbedding(t)));
}

// Chunk text for documents
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  return chunks;
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
  const collectionName = args.collection || DEFAULT_COLLECTION;
  
  // Connect to Chroma
  const client = new ChromaClient({ path: CHROMA_URL });
  
  try {
    await client.heartbeat();
  } catch (e) {
    console.error('❌ Cannot connect to ChromaDB at', CHROMA_URL);
    console.error('   Start it with: npm run chroma:start');
    console.error('   Or: docker run -d --name openclaw-chroma -p 8000:8000 chromadb/chroma');
    process.exit(1);
  }

  switch (cmd) {
    case 'add': {
      const text = args._.join(' ');
      if (!text) { 
        console.log('Usage: node rag.js add "text to remember" [--collection name]'); 
        return; 
      }
      
      const collection = await client.getOrCreateCollection({ name: collectionName });
      const embedding = await getEmbedding(text);
      const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      await collection.add({
        ids: [id],
        embeddings: [embedding],
        documents: [text],
        metadatas: [{ timestamp: Date.now(), type: 'memory' }]
      });
      
      console.log(`✓ Added to "${collectionName}" collection`);
      break;
    }

    case 'search': {
      const query = args._.join(' ');
      const topK = parseInt(args.top) || 5;
      
      if (!query) { 
        console.log('Usage: node rag.js search "query" [--collection name] [--top 5]'); 
        return; 
      }
      
      const collection = await client.getOrCreateCollection({ name: collectionName });
      const queryEmbedding = await getEmbedding(query);
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK
      });
      
      if (!results.documents[0]?.length) {
        console.log('No results found');
        return;
      }
      
      console.log(`\nResults from "${collectionName}":\n`);
      results.documents[0].forEach((doc, i) => {
        const distance = results.distances?.[0]?.[i]?.toFixed(3) || '?';
        const meta = results.metadatas?.[0]?.[i] || {};
        console.log(`[${i + 1}] (distance: ${distance})`);
        if (meta.source) console.log(`    Source: ${meta.source}`);
        console.log(`    ${doc.substring(0, 200)}${doc.length > 200 ? '...' : ''}`);
        console.log('');
      });
      break;
    }

    case 'ingest': {
      const filePath = args._[0];
      if (!filePath) {
        console.log('Usage: node rag.js ingest <file> [--collection name]');
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const chunks = chunkText(content);
      const fileName = path.basename(filePath);
      
      console.log(`Ingesting ${fileName} (${chunks.length} chunks)...`);
      
      const collection = await client.getOrCreateCollection({ name: collectionName });
      const embeddings = await getEmbeddings(chunks);
      
      const ids = chunks.map((_, i) => `${fileName}_chunk_${i}_${Date.now()}`);
      const metadatas = chunks.map((_, i) => ({
        source: fileName,
        chunk: i,
        totalChunks: chunks.length,
        timestamp: Date.now(),
        type: 'document'
      }));
      
      await collection.add({
        ids,
        embeddings,
        documents: chunks,
        metadatas
      });
      
      console.log(`✓ Ingested ${chunks.length} chunks from ${fileName} into "${collectionName}"`);
      break;
    }

    case 'list': {
      const collection = await client.getOrCreateCollection({ name: collectionName });
      const count = await collection.count();
      const peek = await collection.peek({ limit: 10 });
      
      console.log(`\nCollection: ${collectionName}`);
      console.log(`Total items: ${count}\n`);
      
      if (peek.documents.length > 0) {
        console.log('Recent items:');
        peek.documents.forEach((doc, i) => {
          const meta = peek.metadatas?.[i] || {};
          const preview = doc.substring(0, 60).replace(/\n/g, ' ');
          console.log(`  ${i + 1}. ${preview}...`);
          if (meta.source) console.log(`     (source: ${meta.source})`);
        });
      }
      break;
    }

    case 'collections': {
      const collections = await client.listCollections();
      console.log('\nCollections:');
      for (const col of collections) {
        const c = await client.getCollection({ name: col.name });
        const count = await c.count();
        console.log(`  - ${col.name} (${count} items)`);
      }
      break;
    }

    case 'delete': {
      const collection = await client.getOrCreateCollection({ name: collectionName });
      const id = args._[0];
      
      if (args.all) {
        await client.deleteCollection({ name: collectionName });
        console.log(`✓ Deleted collection "${collectionName}"`);
      } else if (id) {
        await collection.delete({ ids: [id] });
        console.log(`✓ Deleted item ${id}`);
      } else {
        console.log('Usage: node rag.js delete <id> [--collection name]');
        console.log('       node rag.js delete --all --collection name');
      }
      break;
    }

    default:
      console.log(`
OpenClaw RAG Tool (ChromaDB)

Usage:
  node rag.js add "text to remember" [--collection name]
  node rag.js search "query" [--collection name] [--top 5]
  node rag.js ingest <file> [--collection name]
  node rag.js list [--collection name]
  node rag.js collections
  node rag.js delete <id> [--collection name]
  node rag.js delete --all --collection name

Default collection: ${DEFAULT_COLLECTION}
ChromaDB URL: ${CHROMA_URL}
      `);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
