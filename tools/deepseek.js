#!/usr/bin/env node
/**
 * DeepSeek CLI - Cheap coding/summarization workhorse
 * Usage: node deepseek.js "your prompt here"
 * 
 * Uses OpenAI-compatible API at api.deepseek.com
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API key (checks .env first, then credentials.json)
function getApiKey() {
  // 1. Check environment variable
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  
  // 2. Check .env file in workspace
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      const match = env.match(/DEEPSEEK_API_KEY=(.+)/);
      if (match) return match[1].trim();
    }
  } catch (e) {}
  
  // 3. Check credentials.json
  try {
    const credsPath = path.join(process.env.HOME, '.openclaw/secrets/credentials.json');
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (creds.deepseek?.apiKey) return creds.deepseek.apiKey;
  } catch (e) {}
  
  console.error('Error: DEEPSEEK_API_KEY not found in .env or credentials.json');
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
let prompt = '';
let model = 'deepseek-chat'; // default model, can also use 'deepseek-coder'
let systemPrompt = 'You are a helpful assistant. Be concise and direct.';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-m' || args[i] === '--model') {
    model = args[++i];
  } else if (args[i] === '-s' || args[i] === '--system') {
    systemPrompt = args[++i];
  } else if (args[i] === '-c' || args[i] === '--coder') {
    model = 'deepseek-coder';
  } else if (args[i] === '-h' || args[i] === '--help') {
    console.log(`
DeepSeek CLI - Cheap AI for coding and summarization

Usage: node deepseek.js [options] "prompt"

Options:
  -m, --model <name>   Model to use (default: deepseek-chat)
  -c, --coder          Use deepseek-coder model
  -s, --system <text>  System prompt
  -h, --help           Show this help

Examples:
  node deepseek.js "Summarize the key points of quantum computing"
  node deepseek.js -c "Write a Python function to merge two sorted arrays"
  node deepseek.js -s "You are a coding expert" "Explain async/await"
`);
    process.exit(0);
  } else {
    prompt += (prompt ? ' ' : '') + args[i];
  }
}

if (!prompt) {
  console.error('Error: No prompt provided');
  console.error('Usage: node deepseek.js "your prompt"');
  process.exit(1);
}

// Make request
const data = JSON.stringify({
  model,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ],
  stream: false
});

const options = {
  hostname: 'api.deepseek.com',
  port: 443,
  path: '/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      
      if (json.error) {
        console.error('API Error:', json.error.message || json.error);
        process.exit(1);
      }
      
      if (json.choices && json.choices[0]) {
        console.log(json.choices[0].message.content);
        
        // Show usage stats on stderr
        if (json.usage) {
          const cost = (json.usage.prompt_tokens * 0.14 + json.usage.completion_tokens * 0.28) / 1000000;
          console.error(`\n[Tokens: ${json.usage.prompt_tokens} in / ${json.usage.completion_tokens} out | Cost: $${cost.toFixed(6)}]`);
        }
      } else {
        console.error('Unexpected response:', body);
        process.exit(1);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.error('Response:', body);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
