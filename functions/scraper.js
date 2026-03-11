/**
 * Google Search Scraper
 * 
 * Direct scraper for Google search results.
 * Returns results in SerpAPI-compatible format for drop-in replacement.
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Pool of realistic browser user agents for rotation
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1'
];

/**
 * Get a random user agent from the pool
 * @returns {string} Random user agent string
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Add random delay to avoid pattern detection
 * @returns {Promise<void>} Promise that resolves after random delay (800-2000ms)
 */
async function randomDelay() {
  const ms = 800 + Math.floor(Math.random() * 1200); // 800-2000ms
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if the HTML response indicates a Google block or CAPTCHA
 * @param {string} html - HTML response from Google
 * @returns {boolean} True if blocked, false otherwise
 */
function isBlocked(html) {
  if (!html || html.length < 5000) {
    return true; // Real results pages are much larger
  }
  
  const blockIndicators = [
    'detected unusual traffic',
    'captcha',
    '/sorry/',
    'unusual traffic from your computer network'
  ];
  
  const lowerHtml = html.toLowerCase();
  return blockIndicators.some(indicator => lowerHtml.includes(indicator));
}

/**
 * Parse Google search results HTML and extract result objects
 * @param {string} html - HTML response from Google
 * @returns {Array} Array of result objects with url, title, description
 */
function parseGoogleResults(html) {
  const results = [];
  
  try {
    const $ = cheerio.load(html);
    
    // Google search result containers
    $('div.g').each((i, el) => {
      if (results.length >= 10) return false; // Stop after 10 results
      
      try {
        const $el = $(el);
        
        // Extract link
        const linkEl = $el.find('a[href]').first();
        const link = linkEl.attr('href');
        
        // Extract title
        const titleEl = $el.find('h3').first();
        const title = titleEl.text().trim();
        
        // Extract snippet - try multiple selectors
        let snippet = '';
        const snippetSelectors = [
          'div[data-sncf]',
          'div.VwiC3b',
          'span.aCOpRe',
          'div.s',
          'span.st'
        ];
        
        for (const selector of snippetSelectors) {
          const snippetEl = $el.find(selector).first();
          if (snippetEl.length > 0) {
            snippet = snippetEl.text().trim();
            break;
          }
        }
        
        // Only add if we have at least a link and title
        // Note: Return 'url' to match downstream code expectations (not 'link')
        if (link && link.startsWith('http') && title) {
          results.push({
            url: link,
            title,
            description: snippet || ''
          });
        }
      } catch (parseError) {
        // Skip this result if parsing fails, don't throw
        console.warn('[scraper] Failed to parse individual result:', parseError.message);
      }
    });
    
    console.log(`[scraper] Parsed ${results.length} results from HTML`);
  } catch (error) {
    console.error('[scraper] Error parsing Google results:', error.message);
  }
  
  return results;
}

/**
 * Fetch Google search results for a query
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of result objects
 */
async function fetchGoogleResults(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${encodedQuery}&num=10&hl=en&gl=us`;
  
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  };
  
  console.log(`[scraper] Fetching Google results for: "${query}"`);
  
  const response = await axios.get(url, {
    headers,
    timeout: 8000,
    maxRedirects: 5,
    validateStatus: (status) => status === 200
  });
  
  const html = response.data;
  
  // Check if blocked
  if (isBlocked(html)) {
    console.warn('[scraper] Google block detected');
    throw new Error('Google block detected');
  }
  
  // Parse results
  const results = parseGoogleResults(html);
  
  if (results.length === 0) {
    console.warn('[scraper] No results parsed from HTML');
  }
  
  return results;
}

/**
 * Get authentication token for Cloud Run
 * @returns {Promise<string|null>} Auth token or null if not available
 */
async function getAuthToken() {
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(process.env.SCRAPER_URL);
    const token = await client.idTokenProvider.fetchIdToken(process.env.SCRAPER_URL);
    return token;
  } catch (err) {
    console.warn('[scraper] Could not get auth token:', err.message);
    return null;
  }
}

/**
 * Main Google search function - calls Cloud Run Puppeteer service
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of result objects with url, title, description
 */
async function googleSearch(query) {
  const scraperUrl = process.env.SCRAPER_URL;

  if (!scraperUrl) {
    console.error('[scraper] SCRAPER_URL not configured');
    return [];
  }

  try {
    console.log(`[scraper] Calling Cloud Run service: ${scraperUrl}`);
    
    // Get authentication token
    const token = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth header if token is available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[scraper] Using authenticated request');
    } else {
      console.log('[scraper] Using unauthenticated request');
    }
    
    const response = await fetch(`${scraperUrl}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`Cloud Run returned ${response.status}`);
    }

    const data = await response.json();
    
    // CRITICAL MAPPING: Cloud Run returns {link, title, snippet}
    // but downstream code expects {url, title, description}
    const results = (data.results || []).map(r => ({
      url: r.link,
      title: r.title,
      description: r.snippet
    }));
    
    console.log(`[scraper] Cloud Run returned ${results.length} results`);
    return results;

  } catch (err) {
    console.error('[scraper] Cloud Run call failed:', err.message);
    return [];
  }
}

module.exports = {
  googleSearch,
  getRandomUserAgent,
  randomDelay,
  isBlocked,
  parseGoogleResults
};
