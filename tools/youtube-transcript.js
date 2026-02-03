#!/usr/bin/env node
/**
 * YouTube Transcript Tool - Get transcripts from YouTube videos
 * No API key needed - uses public transcript data
 * 
 * Usage:
 *   node youtube-transcript.js "https://youtube.com/watch?v=VIDEO_ID"
 *   node youtube-transcript.js VIDEO_ID
 *   node youtube-transcript.js VIDEO_ID --timestamps
 */

const https = require('https');

// Extract video ID from various URL formats
function extractVideoId(input) {
  if (!input.includes('/') && !input.includes('.')) {
    return input;  // Already a video ID
  }
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  
  throw new Error('Could not extract video ID from: ' + input);
}

// Fetch page content
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse transcript from YouTube's player response
async function getTranscript(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const html = await fetchPage(url);
  
  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Unknown';
  
  // Find captions URL in player response
  const captionsMatch = html.match(/"captions":\s*(\{[^}]+\})/);
  if (!captionsMatch) {
    // Try alternative: look for timedtext URL
    const timedTextMatch = html.match(/timedtext[^"]*lang=en[^"]*/);
    if (!timedTextMatch) {
      throw new Error('No captions available for this video');
    }
  }
  
  // Extract caption track URL
  const captionUrlMatch = html.match(/"captionTracks":\s*\[([^\]]+)\]/);
  if (!captionUrlMatch) {
    throw new Error('No caption tracks found');
  }
  
  // Parse caption tracks to find English
  const tracksJson = `[${captionUrlMatch[1]}]`;
  let tracks;
  try {
    tracks = JSON.parse(tracksJson);
  } catch (e) {
    // Try to extract URL directly
    const urlMatch = html.match(/"baseUrl":\s*"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
    if (urlMatch) {
      const captionUrl = urlMatch[1].replace(/\\u0026/g, '&');
      const captionData = await fetchPage(captionUrl);
      return { title, transcript: parseTranscriptXml(captionData) };
    }
    throw new Error('Could not parse caption tracks');
  }
  
  // Find English track (or first available)
  const englishTrack = tracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) || tracks[0];
  if (!englishTrack || !englishTrack.baseUrl) {
    throw new Error('No suitable caption track found');
  }
  
  // Fetch caption data
  const captionUrl = englishTrack.baseUrl.replace(/\\u0026/g, '&');
  const captionData = await fetchPage(captionUrl);
  
  return { title, transcript: parseTranscriptXml(captionData) };
}

// Parse transcript XML/JSON
function parseTranscriptXml(data) {
  const segments = [];
  
  // Try XML format
  const xmlRegex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = xmlRegex.exec(data)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();
    
    if (text) {
      segments.push({ start, duration, text });
    }
  }
  
  return segments;
}

// Format timestamp
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function main() {
  const args = process.argv.slice(2);
  
  let input = null;
  let showTimestamps = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--timestamps' || args[i] === '-t') showTimestamps = true;
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
YouTube Transcript Tool (no API key needed)

Usage:
  node youtube-transcript.js <video-url-or-id>
  node youtube-transcript.js <video-url> --timestamps

Examples:
  node youtube-transcript.js "https://youtube.com/watch?v=dQw4w9WgXcQ"
  node youtube-transcript.js dQw4w9WgXcQ --timestamps

Note: Only works for videos with captions/subtitles enabled.
`);
      return;
    }
    else input = args[i];
  }
  
  if (!input) {
    console.error('Usage: node youtube-transcript.js <video-url-or-id>');
    process.exit(1);
  }
  
  try {
    const videoId = extractVideoId(input);
    console.error(`Fetching transcript for: ${videoId}\n`);
    
    const { title, transcript } = await getTranscript(videoId);
    
    console.log(`# ${title}\n`);
    console.log(`Video: https://youtube.com/watch?v=${videoId}\n`);
    console.log('---\n');
    
    if (showTimestamps) {
      transcript.forEach(seg => {
        console.log(`[${formatTime(seg.start)}] ${seg.text}`);
      });
    } else {
      // Combine into paragraphs
      let currentParagraph = [];
      let lastEnd = 0;
      
      transcript.forEach(seg => {
        // Start new paragraph if gap > 2 seconds
        if (seg.start - lastEnd > 2 && currentParagraph.length > 0) {
          console.log(currentParagraph.join(' ') + '\n');
          currentParagraph = [];
        }
        currentParagraph.push(seg.text);
        lastEnd = seg.start + seg.duration;
      });
      
      if (currentParagraph.length > 0) {
        console.log(currentParagraph.join(' '));
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error('\nNote: This only works for videos with captions enabled.');
    process.exit(1);
  }
}

main();
