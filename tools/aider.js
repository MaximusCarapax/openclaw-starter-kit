#!/usr/bin/env node
/**
 * Aider CLI Wrapper - AI-powered coding through Aider
 * 
 * Usage:
 *   node tools/aider.js "add rate limiting" --files src/api.js
 *   node tools/aider.js "fix the bug in auth" --files src/auth.js src/utils.js
 *   node tools/aider.js "refactor to typescript" --files src/*.js --model openrouter/anthropic/claude-sonnet-4
 *   node tools/aider.js status                    # Check if aider is installed
 * 
 * Options:
 *   --files, -f     Files to edit (required for coding tasks)
 *   --model, -m     Model to use (default: deepseek/deepseek-chat)
 *   --read-only     Add files as read-only context
 *   --yes           Auto-confirm all prompts
 *   --dry-run       Show what would be done without making changes
 *   --message       Alternative way to pass the prompt
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Default model (cheap and good for coding)
const DEFAULT_MODEL = 'deepseek/deepseek-chat';

// Check for API keys
function getApiKeyEnv() {
  const env = { ...process.env };
  
  // Ensure at least one key is available
  if (!env.DEEPSEEK_API_KEY && !env.OPENROUTER_API_KEY && !env.ANTHROPIC_API_KEY) {
    console.error('Error: No API key found.');
    console.error('Set one of: DEEPSEEK_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY in .env');
    process.exit(1);
  }
  
  return env;
}

// Check if aider is installed
function checkAider() {
  try {
    const version = execSync('aider --version 2>&1', { encoding: 'utf8' }).trim();
    return { installed: true, version };
  } catch (e) {
    return { installed: false, version: null };
  }
}

// Parse arguments
function parseArgs(args) {
  const result = {
    prompt: null,
    files: [],
    readOnly: [],
    model: DEFAULT_MODEL,
    yes: true,        // Default to auto-confirm for non-interactive use
    dryRun: false,
    cwd: process.cwd()
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--files' || arg === '-f') {
      // Collect all following args until next flag
      i++;
      while (i < args.length && !args[i].startsWith('-')) {
        result.files.push(args[i]);
        i++;
      }
      continue;
    } else if (arg === '--read-only' || arg === '-r') {
      i++;
      while (i < args.length && !args[i].startsWith('-')) {
        result.readOnly.push(args[i]);
        i++;
      }
      continue;
    } else if (arg === '--model' || arg === '-m') {
      result.model = args[++i];
    } else if (arg === '--yes' || arg === '-y') {
      result.yes = true;
    } else if (arg === '--no-yes') {
      result.yes = false;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--cwd') {
      result.cwd = args[++i];
    } else if (arg === '--message') {
      result.prompt = args[++i];
    } else if (!arg.startsWith('-') && !result.prompt) {
      result.prompt = arg;
    }
    i++;
  }
  
  return result;
}

// Build aider command
function buildCommand(options) {
  const args = ['aider'];
  
  // Model
  args.push('--model', options.model);
  
  // Auto-confirm
  if (options.yes) {
    args.push('--yes');
  }
  
  // No auto-commits for dry run
  if (options.dryRun) {
    args.push('--dry-run', '--no-auto-commits');
  }
  
  // Non-interactive mode for scripting
  args.push('--no-pretty', '--no-stream');
  
  // Add files
  for (const file of options.files) {
    args.push(file);
  }
  
  // Add read-only files
  for (const file of options.readOnly) {
    args.push('--read', file);
  }
  
  // Message
  if (options.prompt) {
    args.push('--message', options.prompt);
  }
  
  return args;
}

// Run aider
async function runAider(options) {
  const args = buildCommand(options);
  const env = getApiKeyEnv();
  
  console.log(`\n🔧 Running: ${args.join(' ')}\n`);
  console.log(`📁 Directory: ${options.cwd}`);
  console.log(`🤖 Model: ${options.model}\n`);
  
  if (options.dryRun) {
    console.log('(Dry run - no changes will be made)\n');
  }
  
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0], args.slice(1), {
      cwd: options.cwd,
      env,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout, stderr });
      } else {
        reject(new Error(`Aider exited with code ${code}\n${stderr}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(new Error(`Failed to run aider: ${err.message}`));
    });
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  // Status check
  if (args[0] === 'status') {
    const status = checkAider();
    if (status.installed) {
      console.log(`✅ Aider installed: ${status.version}`);
      console.log(`\nAPI Keys:`);
      console.log(`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '✓ set' : '✗ not set'}`);
      console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✓ set' : '✗ not set'}`);
      console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ not set'}`);
    } else {
      console.log('❌ Aider not installed');
      console.log('\nInstall with: pip install aider-chat');
    }
    return;
  }
  
  // Help
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    console.log(`
Aider CLI Wrapper - AI-powered coding

Usage:
  node tools/aider.js "your coding request" --files file1.js file2.js
  node tools/aider.js status

Examples:
  node tools/aider.js "add input validation" --files src/api.js
  node tools/aider.js "refactor to use async/await" --files src/*.js
  node tools/aider.js "add tests" --files src/utils.js --read-only src/types.ts

Options:
  --files, -f      Files to edit (required)
  --read-only, -r  Files to include as read-only context
  --model, -m      Model to use (default: deepseek/deepseek-chat)
  --dry-run        Preview changes without applying
  --cwd            Working directory
  --yes            Auto-confirm prompts (default: true)
  --no-yes         Require confirmation for changes

Models:
  deepseek/deepseek-chat              (default, $0.14/M tokens)
  openrouter/anthropic/claude-sonnet-4  (smarter, ~$3/M tokens)  
  openrouter/google/gemini-2.0-flash    (free tier available)

Status:
  node tools/aider.js status          Check installation and API keys
`);
    return;
  }
  
  // Check aider is installed
  const status = checkAider();
  if (!status.installed) {
    console.error('❌ Aider is not installed.');
    console.error('\nInstall with: pip install aider-chat');
    process.exit(1);
  }
  
  // Parse and run
  const options = parseArgs(args);
  
  if (!options.prompt) {
    console.error('Error: No prompt provided');
    console.error('Usage: node tools/aider.js "your request" --files file1.js');
    process.exit(1);
  }
  
  if (options.files.length === 0) {
    console.error('Error: No files specified');
    console.error('Usage: node tools/aider.js "your request" --files file1.js');
    process.exit(1);
  }
  
  try {
    const result = await runAider(options);
    console.log('\n✅ Aider completed successfully');
  } catch (err) {
    console.error('\n❌ Aider failed:', err.message);
    process.exit(1);
  }
}

main();
