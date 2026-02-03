#!/usr/bin/env node
/**
 * Google Calendar Tool - Read and manage calendar events
 * Requires Google OAuth credentials (same as Gmail)
 * 
 * Setup:
 *   1. Go to https://console.cloud.google.com
 *   2. Enable Google Calendar API
 *   3. Use same OAuth credentials as Gmail
 *   4. Run: node google-calendar.js auth
 * 
 * Usage:
 *   node google-calendar.js auth                  - Set up authentication
 *   node google-calendar.js today                 - Today's events
 *   node google-calendar.js upcoming [days]       - Upcoming events (default: 7 days)
 *   node google-calendar.js add <title> <start> [end]  - Create event
 *   node google-calendar.js free                  - Find free time today
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const CREDENTIALS_PATH = path.join(process.env.HOME, '.openclaw/secrets/gmail-credentials.json');
const TOKEN_PATH = path.join(process.env.HOME, '.openclaw/secrets/gcal-token.json');

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log(`
Google credentials not found.

Setup instructions:
1. Go to https://console.cloud.google.com
2. Enable Google Calendar API: APIs & Services → Library → Google Calendar API
3. Use same OAuth credentials as Gmail (or create new Desktop app credentials)
4. Save to: ${CREDENTIALS_PATH}
5. Run: node google-calendar.js auth
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

async function authenticate() {
  const creds = loadCredentials();
  const { client_id, client_secret } = creds.installed || creds.web;
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ];
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${client_id}&` +
    `redirect_uri=${encodeURIComponent('http://localhost:3334/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  console.log('Opening browser for authentication...\n');
  console.log('If browser does not open, visit this URL:\n');
  console.log(authUrl + '\n');
  
  const { exec } = require('child_process');
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${authUrl}"`);
  
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:3334');
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
          server.close();
          
          try {
            const token = await exchangeCode(code, client_id, client_secret);
            saveToken(token);
            console.log('✓ Authentication successful! Token saved.');
            resolve(token);
          } catch (err) {
            reject(err);
          }
        }
      }
    });
    
    server.listen(3334, () => {
      console.log('Waiting for authentication callback on http://localhost:3334 ...\n');
    });
  });
}

function exchangeCode(code, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'http://localhost:3334/callback',
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
    console.error('Not authenticated. Run: node google-calendar.js auth');
    process.exit(1);
  }
  
  if (token.expiry_date && Date.now() > token.expiry_date - 300000) {
    token = await refreshToken(token);
  }
  
  return token.access_token;
}

function calendarAPI(method, endpoint, body = null) {
  return new Promise(async (resolve, reject) => {
    const accessToken = await getAccessToken();
    
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/calendar/v3${endpoint}`,
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

function formatDateTime(dateTime, timeZone) {
  if (!dateTime) return 'All day';
  const d = new Date(dateTime);
  return d.toLocaleString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || undefined
  });
}

function formatTime(dateTime) {
  if (!dateTime) return '';
  const d = new Date(dateTime);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Parse natural date/time input
function parseDateTime(input) {
  const now = new Date();
  
  // Try ISO format first
  if (input.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(input);
  }
  
  // Handle "today 3pm", "tomorrow 10am", etc.
  const lower = input.toLowerCase();
  let date = new Date(now);
  
  if (lower.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  } else if (lower.includes('next week')) {
    date.setDate(date.getDate() + 7);
  }
  
  // Extract time
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]) || 0;
    const ampm = timeMatch[3]?.toLowerCase();
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    date.setHours(hours, minutes, 0, 0);
  }
  
  return date;
}

async function main() {
  const [,, cmd, ...args] = process.argv;
  
  try {
    switch (cmd) {
      case 'auth':
        await authenticate();
        break;
        
      case 'today': {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        
        const result = await calendarAPI('GET', 
          `/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`
        );
        
        console.log(`\n📅 Today's Events (${result.items?.length || 0}):\n`);
        for (const event of (result.items || [])) {
          const start = event.start.dateTime || event.start.date;
          const end = event.end.dateTime || event.end.date;
          console.log(`  ${formatTime(start)} - ${formatTime(end)}`);
          console.log(`  📌 ${event.summary || '(No title)'}`);
          if (event.location) console.log(`  📍 ${event.location}`);
          console.log('');
        }
        if (!result.items?.length) console.log('  No events today! 🎉\n');
        break;
      }
      
      case 'upcoming': {
        const days = parseInt(args[0]) || 7;
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        const result = await calendarAPI('GET', 
          `/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${future.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=20`
        );
        
        console.log(`\n📅 Upcoming Events (next ${days} days):\n`);
        for (const event of (result.items || [])) {
          const start = formatDateTime(event.start.dateTime || event.start.date);
          console.log(`  ${start}`);
          console.log(`  📌 ${event.summary || '(No title)'}`);
          if (event.location) console.log(`  📍 ${event.location}`);
          console.log('');
        }
        if (!result.items?.length) console.log('  No upcoming events!\n');
        break;
      }
      
      case 'add': {
        const [title, startStr, endStr] = args;
        if (!title || !startStr) {
          console.log('Usage: node google-calendar.js add "Meeting" "today 3pm" ["today 4pm"]');
          return;
        }
        
        const start = parseDateTime(startStr);
        const end = endStr ? parseDateTime(endStr) : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
        
        const event = {
          summary: title,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() }
        };
        
        const result = await calendarAPI('POST', '/calendars/primary/events', event);
        console.log(`✓ Created: ${result.summary}`);
        console.log(`  ${formatDateTime(result.start.dateTime)} - ${formatDateTime(result.end.dateTime)}`);
        console.log(`  Link: ${result.htmlLink}`);
        break;
      }
      
      case 'free': {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(18, 0, 0, 0); // Assume work ends at 6pm
        
        const result = await calendarAPI('GET', 
          `/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`
        );
        
        const events = result.items || [];
        const busyTimes = events
          .filter(e => e.start.dateTime)
          .map(e => ({
            start: new Date(e.start.dateTime),
            end: new Date(e.end.dateTime)
          }));
        
        console.log('\n🕐 Free time today:\n');
        
        let current = new Date(now);
        current.setMinutes(Math.ceil(current.getMinutes() / 30) * 30, 0, 0); // Round to next 30 min
        
        for (const busy of busyTimes) {
          if (current < busy.start) {
            console.log(`  ✅ ${formatTime(current)} - ${formatTime(busy.start)} (free)`);
          }
          current = new Date(Math.max(current.getTime(), busy.end.getTime()));
        }
        
        if (current < endOfDay) {
          console.log(`  ✅ ${formatTime(current)} - ${formatTime(endOfDay)} (free)`);
        }
        
        console.log('');
        break;
      }
      
      default:
        console.log(`
Google Calendar Tool

Setup:
  node google-calendar.js auth          Authenticate with Google

Commands:
  node google-calendar.js today         Today's events
  node google-calendar.js upcoming [n]  Next n days (default: 7)
  node google-calendar.js add <title> <start> [end]  Create event
  node google-calendar.js free          Find free time today

Examples:
  node google-calendar.js add "Team sync" "today 3pm" "today 4pm"
  node google-calendar.js add "Dentist" "tomorrow 10am"
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
