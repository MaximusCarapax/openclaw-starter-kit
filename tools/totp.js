#!/usr/bin/env node
/**
 * TOTP Manager - Generate 2FA codes without a phone
 * 
 * Usage:
 *   node totp.js add <name> <secret>   # Add account
 *   node totp.js get <name>            # Get current code
 *   node totp.js list                  # List accounts
 *   node totp.js remove <name>         # Remove account
 * 
 * Setup:
 *   npm install otpauth
 * 
 * Secrets stored in: ~/.openclaw/secrets/totp-secrets.json
 */

const fs = require('fs');
const path = require('path');

// Dynamic import for otpauth (ESM module)
async function getOTPAuth() {
  const { TOTP } = await import('otpauth');
  return { TOTP };
}

const SECRETS_DIR = path.join(process.env.HOME, '.openclaw', 'secrets');
const SECRETS_FILE = path.join(SECRETS_DIR, 'totp-secrets.json');

// Ensure secrets directory exists
function ensureSecretsDir() {
  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true });
  }
}

// Load secrets
function loadSecrets() {
  ensureSecretsDir();
  if (!fs.existsSync(SECRETS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
  } catch (e) {
    console.error('Error reading secrets file:', e.message);
    return {};
  }
}

// Save secrets
function saveSecrets(secrets) {
  ensureSecretsDir();
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), { mode: 0o600 });
}

// Add account
function addAccount(name, secret) {
  const secrets = loadSecrets();
  
  // Clean up secret (remove spaces, uppercase)
  const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
  
  secrets[name.toLowerCase()] = {
    name: name,
    secret: cleanSecret,
    addedAt: new Date().toISOString()
  };
  
  saveSecrets(secrets);
  console.log(`✅ Added TOTP account: ${name}`);
}

// Get current code
async function getCode(name) {
  const { TOTP } = await getOTPAuth();
  const secrets = loadSecrets();
  const key = name.toLowerCase();
  
  if (!secrets[key]) {
    console.error(`❌ Account not found: ${name}`);
    console.log('Available accounts:', Object.keys(secrets).join(', ') || '(none)');
    process.exit(1);
  }
  
  const totp = new TOTP({
    secret: secrets[key].secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30
  });
  
  const code = totp.generate();
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  
  console.log(`🔐 ${secrets[key].name}: ${code} (${remaining}s remaining)`);
  return code;
}

// List accounts
function listAccounts() {
  const secrets = loadSecrets();
  const names = Object.keys(secrets);
  
  if (names.length === 0) {
    console.log('No TOTP accounts configured.');
    console.log('Add one with: node totp.js add <name> <secret>');
    return;
  }
  
  console.log('📋 TOTP Accounts:');
  names.forEach(key => {
    const account = secrets[key];
    console.log(`  - ${account.name} (added: ${account.addedAt?.split('T')[0] || 'unknown'})`);
  });
}

// Remove account
function removeAccount(name) {
  const secrets = loadSecrets();
  const key = name.toLowerCase();
  
  if (!secrets[key]) {
    console.error(`❌ Account not found: ${name}`);
    process.exit(1);
  }
  
  delete secrets[key];
  saveSecrets(secrets);
  console.log(`🗑️ Removed TOTP account: ${name}`);
}

// Show help
function showHelp() {
  console.log(`
TOTP Manager - Generate 2FA codes without a phone

Usage:
  node totp.js add <name> <secret>   Add a new account
  node totp.js get <name>            Get current code for account
  node totp.js list                  List all accounts
  node totp.js remove <name>         Remove an account
  node totp.js help                  Show this help

Examples:
  node totp.js add github JBSWY3DPEHPK3PXP
  node totp.js get github
  
Notes:
  - Secret is the base32 string from your 2FA setup (usually shown as QR code backup)
  - Codes refresh every 30 seconds
  - Secrets stored in: ${SECRETS_FILE}
`);
}

// Main
async function main() {
  const [,, command, ...args] = process.argv;
  
  switch (command) {
    case 'add':
      if (args.length < 2) {
        console.error('Usage: node totp.js add <name> <secret>');
        process.exit(1);
      }
      addAccount(args[0], args.slice(1).join(''));
      break;
      
    case 'get':
      if (args.length < 1) {
        console.error('Usage: node totp.js get <name>');
        process.exit(1);
      }
      await getCode(args[0]);
      break;
      
    case 'list':
      listAccounts();
      break;
      
    case 'remove':
    case 'delete':
      if (args.length < 1) {
        console.error('Usage: node totp.js remove <name>');
        process.exit(1);
      }
      removeAccount(args[0]);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      if (command) {
        // Treat as account name for quick access
        await getCode(command);
      } else {
        showHelp();
      }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
