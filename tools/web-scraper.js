#!/usr/bin/env node
/**
 * Web Scraper Tool - Extract readable content from URLs
 * No API key needed
 * 
 * Usage:
 *   node web-scraper.js "https://example.com"
 *   node web-scraper.js "https://example.com" --raw
 *   node web-scraper.js "https://example.com" --links
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Simple HTML to text extraction
function extractText(html) {
  // Remove scripts and styles
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  
  // Convert common elements
  text = text
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n## $1\n\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
    .replace(/<[^>]+>/g, '')  // Remove remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Collapse multiple newlines
    .trim();
  
  return text;
}

// Extract title
function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : null;
}

// Extract links
function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    let href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    
    // Make absolute URL
    if (href.startsWith('/')) {
      const url = new URL(baseUrl);
      href = `${url.protocol}//${url.host}${href}`;
    } else if (!href.startsWith('http')) {
      continue;  // Skip relative/invalid URLs
    }
    
    if (text && href.startsWith('http')) {
      links.push({ text: text.substring(0, 100), url: href });
    }
  }
  
  return links;
}

// Fetch URL
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenClawBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const u = new URL(url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  let url = null;
  let raw = false;
  let showLinks = false;
  let maxLength = 5000;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--raw' || args[i] === '-r') raw = true;
    else if (args[i] === '--links' || args[i] === '-l') showLinks = true;
    else if (args[i] === '--max' || args[i] === '-m') maxLength = parseInt(args[++i]);
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Web Scraper Tool (no API key needed)

Usage:
  node web-scraper.js <url>              Extract readable text
  node web-scraper.js <url> --raw        Get raw HTML
  node web-scraper.js <url> --links      Extract all links
  node web-scraper.js <url> --max 1000   Limit output length

Examples:
  node web-scraper.js "https://example.com"
  node web-scraper.js "https://news.ycombinator.com" --links
`);
      return;
    }
    else if (args[i].startsWith('http')) url = args[i];
    else url = args[i];  // Assume it's a URL
  }
  
  if (!url) {
    console.error('Usage: node web-scraper.js <url>');
    process.exit(1);
  }
  
  // Add protocol if missing
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  
  try {
    console.error(`Fetching: ${url}\n`);
    const html = await fetchUrl(url);
    
    if (raw) {
      console.log(html.substring(0, maxLength));
      return;
    }
    
    if (showLinks) {
      const links = extractLinks(html, url);
      console.log(`Found ${links.length} links:\n`);
      links.slice(0, 50).forEach((link, i) => {
        console.log(`${i + 1}. ${link.text}`);
        console.log(`   ${link.url}\n`);
      });
      return;
    }
    
    // Extract readable content
    const title = extractTitle(html);
    const text = extractText(html);
    
    if (title) {
      console.log(`# ${title}\n`);
    }
    
    console.log(text.substring(0, maxLength));
    
    if (text.length > maxLength) {
      console.log(`\n... (truncated, ${text.length - maxLength} more characters)`);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
