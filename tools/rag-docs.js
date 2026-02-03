#!/usr/bin/env node
/**
 * Contextual RAG for Documents
 * Uses Anthropic's contextual retrieval approach
 * 
 * Usage:
 *   node rag-docs.js ingest <file> --name "Document Name"
 *   node rag-docs.js search "query" [topK]
 *   node rag-docs.js list
 *   node rag-docs.js stats
 */

const { LocalIndex } = require('vectra');
const fs = require('fs');
const path = require('path');

// Config
const INDEX_PATH = path.join(__dirname, '..', 'data', 'doc-vectors');
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200;

// Load API keys
function loadEnvKey(keyName) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(new RegExp(`${keyName}=(.+)`));
    if (match) return match[1].trim();
  }
  return process.env[keyName] || null;
}

const GEMINI_API_KEY = loadEnvKey('GEMINI_API_KEY');

// Get embedding using Gemini (free)
async function getEmbedding(text) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not found');
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
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

// Generate context for a chunk using Gemini
async function generateContext(chunk, docName, chunkIndex, totalChunks) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not found');
  
  const prompt = `You are adding context to a document chunk for better retrieval.

Document: "${docName}"
Chunk ${chunkIndex + 1} of ${totalChunks}

Chunk content:
"""
${chunk}
"""

Write a 1-2 sentence context prefix that describes what this chunk is about and where it fits in the document. Be specific and include key terms that would help retrieval. Output ONLY the context prefix, nothing else.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 150 }
    })
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// Chunk text with overlap
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);
    
    // Try to break at sentence/paragraph boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('. ');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }
    
    chunks.push(chunk.trim());
    start += chunk.length - overlap;
    if (start <= chunks.length * (chunkSize - overlap) - chunkSize) {
      start = chunks.length * (chunkSize - overlap);
    }
  }
  
  return chunks.filter(c => c.length > 50); // Skip tiny chunks
}

async function getIndex() {
  const index = new LocalIndex(INDEX_PATH);
  if (!await index.isIndexCreated()) {
    await index.createIndex();
  }
  return index;
}

// Ingest a document with contextual embeddings
async function ingestDocument(filePath, docName) {
  const index = await getIndex();
  
  // Read file
  const content = fs.readFileSync(filePath, 'utf8');
  const chunks = chunkText(content);
  
  console.log(`📄 Processing: ${docName}`);
  console.log(`   ${chunks.length} chunks to process\n`);
  
  const results = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate context (the key innovation)
    process.stdout.write(`   [${i + 1}/${chunks.length}] Generating context...`);
    const context = await generateContext(chunk, docName, i, chunks.length);
    
    // Combine context + chunk for embedding
    const contextualizedText = `${context}\n\n${chunk}`;
    
    process.stdout.write(` embedding...`);
    const embedding = await getEmbedding(contextualizedText);
    
    // Store with metadata
    await index.insertItem({
      vector: embedding,
      metadata: {
        text: chunk, // Store original chunk for display
        context: context, // Store context separately
        contextualizedText: contextualizedText, // Full text that was embedded
        docName: docName,
        chunkIndex: i,
        totalChunks: chunks.length,
        source: 'document',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(` ✅`);
    results.push({ chunkIndex: i, context });
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n✅ Ingested "${docName}" (${chunks.length} chunks)`);
  return results;
}

// Search documents
async function searchDocs(query, topK = 5) {
  const index = await getIndex();
  const queryEmbedding = await getEmbedding(query);
  
  const results = await index.queryItems(queryEmbedding, topK);
  return results.map(r => ({
    score: r.score,
    text: r.item.metadata.text,
    context: r.item.metadata.context,
    docName: r.item.metadata.docName,
    chunkIndex: r.item.metadata.chunkIndex,
    timestamp: r.item.metadata.timestamp
  }));
}

// List all documents
async function listDocs() {
  const index = await getIndex();
  const items = await index.listItems();
  
  const docs = {};
  items.forEach(item => {
    const name = item.metadata.docName || 'unknown';
    if (!docs[name]) {
      docs[name] = { chunks: 0, timestamp: item.metadata.timestamp };
    }
    docs[name].chunks++;
  });
  
  return docs;
}

// Stats
async function getStats() {
  const index = await getIndex();
  const items = await index.listItems();
  
  const docs = {};
  items.forEach(item => {
    const name = item.metadata.docName || 'unknown';
    docs[name] = (docs[name] || 0) + 1;
  });
  
  return {
    totalChunks: items.length,
    documents: docs,
    documentCount: Object.keys(docs).length
  };
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  try {
    switch (command) {
      case 'ingest': {
        const filePath = args[1];
        const nameIdx = args.indexOf('--name');
        const docName = nameIdx !== -1 ? args[nameIdx + 1] : path.basename(filePath);
        
        if (!filePath || !fs.existsSync(filePath)) {
          console.log('Usage: rag-docs.js ingest <file> --name "Document Name"');
          console.log('File not found:', filePath);
          return;
        }
        
        await ingestDocument(filePath, docName);
        break;
      }
      
      case 'search': {
        const query = args[1];
        const topK = parseInt(args[2]) || 5;
        
        if (!query) {
          console.log('Usage: rag-docs.js search "query" [topK]');
          return;
        }
        
        const results = await searchDocs(query, topK);
        console.log(`\n🔍 Top ${results.length} results for: "${query}"\n`);
        results.forEach((r, i) => {
          console.log(`[${i + 1}] Score: ${r.score.toFixed(3)} | ${r.docName} (chunk ${r.chunkIndex + 1})`);
          console.log(`    Context: ${r.context}`);
          console.log(`    Text: ${r.text.substring(0, 200)}...\n`);
        });
        break;
      }
      
      case 'list': {
        const docs = await listDocs();
        console.log('\n📚 Indexed Documents:\n');
        Object.entries(docs).forEach(([name, info]) => {
          console.log(`  • ${name}: ${info.chunks} chunks`);
        });
        break;
      }
      
      case 'stats': {
        const stats = await getStats();
        console.log('\n📊 Document RAG Stats\n');
        console.log(`Total chunks: ${stats.totalChunks}`);
        console.log(`Documents: ${stats.documentCount}`);
        console.log('Breakdown:', JSON.stringify(stats.documents, null, 2));
        break;
      }
      
      default:
        console.log(`
Contextual RAG for Documents

Commands:
  ingest <file> --name "Name"   Ingest document with contextual embeddings
  search "query" [topK]         Search across documents
  list                          List indexed documents
  stats                         Show statistics

Examples:
  node rag-docs.js ingest article.txt --name "AI Trends 2026"
  node rag-docs.js search "what are the latest AI trends"
  node rag-docs.js list
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

module.exports = { ingestDocument, searchDocs, listDocs, getStats };

main();
