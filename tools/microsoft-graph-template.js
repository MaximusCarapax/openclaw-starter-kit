#!/usr/bin/env node
/**
 * Microsoft Graph API Tool Template
 * 
 * Covers: Outlook Mail, Calendar, OneDrive, To Do
 * 
 * Setup:
 * 1. Register app in Azure AD (portal.azure.com)
 * 2. Get: Client ID, Client Secret, Tenant ID
 * 3. Add to credentials.json:
 *    {
 *      "microsoft": {
 *        "clientId": "...",
 *        "clientSecret": "...",
 *        "tenantId": "...",
 *        "refreshToken": "..."  // after OAuth flow
 *      }
 *    }
 * 
 * Scopes needed:
 * - Mail.Read, Mail.Send, Mail.ReadWrite
 * - Calendars.Read, Calendars.ReadWrite
 * - Files.Read, Files.ReadWrite
 * - Tasks.Read, Tasks.ReadWrite
 * - User.Read
 */

const fs = require('fs');
const path = require('path');

// Load credentials
const CREDS_PATH = path.join(process.env.HOME, '.openclaw/secrets/credentials.json');
let creds = {};
try {
  creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8')).microsoft || {};
} catch (e) {
  console.error('No Microsoft credentials found. Run setup first.');
  process.exit(1);
}

const { clientId, clientSecret, tenantId, refreshToken } = creds;
let accessToken = null;
let tokenExpiry = 0;

// Token refresh
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/.default offline_access'
  });
  
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  const data = await res.json();
  if (data.error) throw new Error(data.error_description);
  
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return accessToken;
}

// Graph API helper
async function graphRequest(endpoint, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res.json();
}

// === MAIL ===

async function getInbox(count = 10) {
  const data = await graphRequest(`/me/mailFolders/inbox/messages?$top=${count}&$orderby=receivedDateTime desc`);
  return data.value?.map(m => ({
    id: m.id,
    from: m.from?.emailAddress?.address,
    subject: m.subject,
    received: m.receivedDateTime,
    preview: m.bodyPreview?.substring(0, 100)
  }));
}

async function readEmail(id) {
  const m = await graphRequest(`/me/messages/${id}`);
  return {
    from: m.from?.emailAddress?.address,
    to: m.toRecipients?.map(r => r.emailAddress?.address),
    subject: m.subject,
    body: m.body?.content,
    received: m.receivedDateTime
  };
}

async function sendEmail(to, subject, body, isHtml = false) {
  return graphRequest('/me/sendMail', {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: isHtml ? 'HTML' : 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }]
      }
    })
  });
}

// === CALENDAR ===

async function getEvents(days = 7) {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const data = await graphRequest(`/me/calendarView?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime`);
  return data.value?.map(e => ({
    id: e.id,
    subject: e.subject,
    start: e.start?.dateTime,
    end: e.end?.dateTime,
    location: e.location?.displayName
  }));
}

async function createEvent(subject, start, end, location = '') {
  return graphRequest('/me/events', {
    method: 'POST',
    body: JSON.stringify({
      subject,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' },
      location: { displayName: location }
    })
  });
}

// === TO DO ===

async function getTasks() {
  const lists = await graphRequest('/me/todo/lists');
  const tasks = [];
  for (const list of lists.value || []) {
    const t = await graphRequest(`/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'`);
    tasks.push(...(t.value || []).map(task => ({
      id: task.id,
      listId: list.id,
      title: task.title,
      dueDate: task.dueDateTime?.dateTime,
      importance: task.importance
    })));
  }
  return tasks;
}

async function createTask(listId, title, dueDate = null) {
  return graphRequest(`/me/todo/lists/${listId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      dueDateTime: dueDate ? { dateTime: dueDate, timeZone: 'UTC' } : undefined
    })
  });
}

// === CLI ===

const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  switch (cmd) {
    case 'inbox':
      console.log(JSON.stringify(await getInbox(args[0] || 10), null, 2));
      break;
    case 'read':
      console.log(JSON.stringify(await readEmail(args[0]), null, 2));
      break;
    case 'send':
      await sendEmail(args[0], args[1], args[2]);
      console.log('✓ Sent');
      break;
    case 'events':
      console.log(JSON.stringify(await getEvents(args[0] || 7), null, 2));
      break;
    case 'tasks':
      console.log(JSON.stringify(await getTasks(), null, 2));
      break;
    default:
      console.log(`
Microsoft Graph Tool

Usage:
  node microsoft.js inbox [count]     - Get inbox messages
  node microsoft.js read <id>         - Read full email
  node microsoft.js send <to> <subj> <body> - Send email
  node microsoft.js events [days]     - Get calendar events
  node microsoft.js tasks             - Get To Do tasks

Setup required: Add Microsoft credentials to ~/.openclaw/secrets/credentials.json
      `);
  }
}

main().catch(console.error);
