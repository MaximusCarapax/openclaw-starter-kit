#!/usr/bin/env node
/**
 * Gmail Tool - Read, search, draft emails
 * Requires Google OAuth credentials
 * 
 * Setup:
 *   1. Go to https://console.cloud.google.com
 *   2. Create project, enable Gmail API
 *   3. Create OAuth credentials (Desktop app)
 *   4. Run: node gmail.js auth
 * 
 * Usage:
 *   node gmail.js auth                    - Set up authentication
 *   node gmail.js inbox [count]           - List recent inbox
 *   node gmail.js unread [count]          - List unread messages
 *   node gmail.js read <id>               - Read full message
 *   node gmail.js search <query>          - Search (Gmail syntax)
 *   node gmail.js archive <id>            - Archive message
 *   node gmail.js draft <to> <subj> <body> - Create draft
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const CREDENTIALS_PATH = path.join(process.env.HOME, '.openclaw/secrets/gmail-credentials.json');
const TOKEN_PATH = path.join(process.env.HOME, '.openclaw/secrets/gmail-token.json');

// Load or prompt for credentials
function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log(`
Gmail credentials not found.

Setup instructions:
1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Enable the Gmail API: APIs & Services → Library → Gmail API → Enable
4. Create credentials: APIs & Services → Credentials → Create → OAuth client ID
   - Application type: Desktop app
   - Name: OpenClaw Gmail
5. Download the JSON file
6. Save it to: ${CREDENTIALS_PATH}
7. Run: node gmail.js auth
`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
}

function saveToken(token) {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  fs.chmodSync(TOKEN_PATH, 0o600);
}

// OAuth flow
async function authenticate() {
  const creds = loadCredentials();
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose'
  ];
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${client_id}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3333/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('Opening browser for authentication...\n');
  console.log('If browser does not open, visit this URL:\n');
  console.log(authUrl + '\n');
  
  // Try to open browser
  const { exec } = require('child_process');
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${authUrl}"`);
  
  // Start local server to receive callback
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:3333');
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
          server.close();
          
          // Exchange code for tokens
          try {
            const token = await exchangeCode(code, client_id, client_secret);
            saveToken(token);
            console.log('✓ Authentication successful! Token saved.');
            resolve(token);
          } catch (err) {
            reject(err);
          }
        } else {
          res.writeHead(400);
          res.end('No code received');
          reject(new Error('No authorization code received'));
        }
      }
    });
    
    server.listen(3333, () => {
      console.log('Waiting for authentication callback on http://localhost:3333 ...\n');
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('Port 3333 in use. Please close other applications using it.');
      }
      reject(err);
    });
  });
}

function exchangeCode(code, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'http://localhost:3333/callback',
      grant_type: 'authorization_code'
    });
    
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.error) reject(new Error(result.error_description || result.error));
        else resolve(result);
      });
    });
    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

async function refreshToken(token) {
  const creds = loadCredentials();
  const { client_id, client_secret } = creds.installed || creds.web;
  
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      refresh_token: token.refresh_token,
      client_id,
      client_secret,
      grant_type: 'refresh_token'
    });
    
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.error) reject(new Error(result.error_description));
        else {
          const newToken = { ...token, ...result };
          saveToken(newToken);
          resolve(newToken);
        }
      });
    });
    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

async function getAccessToken() {
  let token = loadToken();
  if (!token) {
    console.error('Not authenticated. Run: node gmail.js auth');
    process.exit(1);
  }
  
  // Refresh if expired (with 5 min buffer)
  if (token.expiry_date && Date.now() > token.expiry_date - 300000) {
    token = await refreshToken(token);
  }
  
  return token.access_token;
}

function gmailAPI(method, endpoint, body = null) {
  return new Promise(async (resolve, reject) => {
    const accessToken = await getAccessToken();
    
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: `/gmail/v1/users/me${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API error ${res.statusCode}: ${data}`));
        } else {
          resolve(data ? JSON.parse(data) : {});
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function encodeBase64(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getHeader(headers, name) {
  const h = headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function extractBody(payload) {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return '';
}

async function main() {
  const [,, cmd, ...args] = process.argv;
  
  try {
    switch (cmd) {
      case 'auth':
        await authenticate();
        break;
        
      case 'inbox': {
        const count = parseInt(args[0]) || 10;
        const result = await gmailAPI('GET', `/messages?q=in:inbox&maxResults=${count}`);
        console.log(`\nInbox (${result.messages?.length || 0} messages):\n`);
        for (const m of (result.messages || [])) {
          const msg = await gmailAPI('GET', `/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
          console.log(`[${m.id}]`);
          console.log(`  From: ${getHeader(msg.payload.headers, 'From')}`);
          console.log(`  Subject: ${getHeader(msg.payload.headers, 'Subject')}`);
          console.log(`  Date: ${getHeader(msg.payload.headers, 'Date')}\n`);
        }
        break;
      }
      
      case 'unread': {
        const count = parseInt(args[0]) || 10;
        const result = await gmailAPI('GET', `/messages?q=is:unread&maxResults=${count}`);
        console.log(`\nUnread (${result.messages?.length || 0} messages):\n`);
        for (const m of (result.messages || [])) {
          const msg = await gmailAPI('GET', `/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`);
          console.log(`[${m.id}] ${getHeader(msg.payload.headers, 'Subject')}`);
          console.log(`  From: ${getHeader(msg.payload.headers, 'From')}\n`);
        }
        break;
      }
      
      case 'read': {
        const id = args[0];
        if (!id) { console.log('Usage: node gmail.js read <message-id>'); return; }
        const msg = await gmailAPI('GET', `/messages/${id}?format=full`);
        console.log(`\nFrom: ${getHeader(msg.payload.headers, 'From')}`);
        console.log(`To: ${getHeader(msg.payload.headers, 'To')}`);
        console.log(`Subject: ${getHeader(msg.payload.headers, 'Subject')}`);
        console.log(`Date: ${getHeader(msg.payload.headers, 'Date')}`);
        console.log(`\n${'-'.repeat(60)}\n`);
        console.log(extractBody(msg.payload));
        break;
      }
      
      case 'search': {
        const query = args.join(' ');
        if (!query) { console.log('Usage: node gmail.js search <query>'); return; }
        const result = await gmailAPI('GET', `/messages?q=${encodeURIComponent(query)}&maxResults=20`);
        console.log(`\nSearch: "${query}" (${result.messages?.length || 0} results)\n`);
        for (const m of (result.messages || [])) {
          const msg = await gmailAPI('GET', `/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`);
          console.log(`[${m.id}] ${getHeader(msg.payload.headers, 'Subject')}`);
          console.log(`  From: ${getHeader(msg.payload.headers, 'From')}\n`);
        }
        break;
      }
      
      case 'archive': {
        const id = args[0];
        if (!id) { console.log('Usage: node gmail.js archive <message-id>'); return; }
        await gmailAPI('POST', `/messages/${id}/modify`, { removeLabelIds: ['INBOX'] });
        console.log(`✓ Archived message ${id}`);
        break;
      }
      
      case 'draft': {
        const [to, subject, ...bodyParts] = args;
        if (!to || !subject) { console.log('Usage: node gmail.js draft <to> <subject> <body>'); return; }
        const body = bodyParts.join(' ');
        const raw = encodeBase64(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`);
        const result = await gmailAPI('POST', '/drafts', { message: { raw } });
        console.log(`✓ Draft created (id: ${result.id})`);
        break;
      }
      
      default:
        console.log(`
Gmail Tool

Setup:
  node gmail.js auth              Authenticate with Google

Commands:
  node gmail.js inbox [count]     List recent inbox messages
  node gmail.js unread [count]    List unread messages
  node gmail.js read <id>         Read full message
  node gmail.js search <query>    Search (Gmail syntax)
  node gmail.js archive <id>      Archive message
  node gmail.js draft <to> <subj> <body>  Create draft
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
