/**
 * Debug script to see actual Google HTML response
 */

const axios = require('./functions/node_modules/axios').default;
const fs = require('fs');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

async function debugFetch() {
  const query = 'Terry French San Antonio founder';
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${encodedQuery}&num=10&hl=en&gl=us`;
  
  const headers = {
    'User-Agent': USER_AGENTS[0],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  };
  
  console.log('Fetching:', url);
  console.log('');
  
  try {
    const response = await axios.get(url, {
      headers,
      timeout: 8000,
      maxRedirects: 5
    });
    
    const html = response.data;
    
    console.log('Response length:', html.length);
    console.log('Status:', response.status);
    console.log('');
    
    // Check for block indicators
    if (html.includes('detected unusual traffic')) {
      console.log('⚠️  BLOCKED: Detected unusual traffic message');
    } else if (html.includes('captcha')) {
      console.log('⚠️  BLOCKED: CAPTCHA detected');
    } else {
      console.log('✓ Not blocked (no obvious block indicators)');
    }
    
    // Save HTML to file for inspection
    fs.writeFileSync('google-response.html', html);
    console.log('\n✓ HTML saved to google-response.html');
    console.log('Open this file to inspect the actual HTML structure');
    
    // Look for common result container patterns
    const patterns = [
      'div.g',
      'div class="g"',
      'div class="Gx5Zad',
      'div class="yuRUbf"',
      '<h3',
      'data-hveid'
    ];
    
    console.log('\nSearching for common Google result patterns:');
    patterns.forEach(pattern => {
      const count = (html.match(new RegExp(pattern, 'g')) || []).length;
      console.log(`  ${pattern}: ${count} occurrences`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugFetch();
