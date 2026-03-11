/**
 * Alpha Search Scraper Service
 * 
 * Cloud Run service that uses Puppeteer to scrape Google search results.
 * Google's search page requires JavaScript execution, which this service handles
 * by running a real headless Chrome browser.
 */

const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// User agent pool — rotate on each request
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
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Scrape Google search results using Puppeteer
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of result objects with link, title, snippet
 */
async function scrapeGoogle(query) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set real browser fingerprint
    await page.setUserAgent(getRandomUserAgent());
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    // Random delay before request (800-2000ms)
    await new Promise(r => setTimeout(r, 800 + Math.floor(Math.random() * 1200)));

    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=en&gl=us`;
    console.log(`[scraper] Navigating to: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for results to render
    await page.waitForSelector('div#search', { timeout: 8000 }).catch(() => {
      console.warn('[scraper] Timeout waiting for div#search');
    });

    // Extract results from rendered DOM
    const results = await page.evaluate(() => {
      const items = [];
      
      // Try multiple selector patterns for Google's changing HTML
      const resultEls = document.querySelectorAll('div.g, div[data-hveid]');

      resultEls.forEach(el => {
        if (items.length >= 10) return;

        const linkEl = el.querySelector('a[href]');
        const titleEl = el.querySelector('h3');
        
        // Try multiple snippet selectors
        const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe, div[style="-webkit-line-clamp:2"]');

        const link = linkEl?.href;
        const title = titleEl?.textContent?.trim();
        const snippet = snippetEl?.textContent?.trim() || '';

        // Only include results with valid HTTP links and titles
        // Exclude Google's own links
        if (link && link.startsWith('http') && title && !link.includes('google.com')) {
          items.push({ link, title, snippet });
        }
      });

      return items;
    });

    console.log(`[scraper] Extracted ${results.length} results`);
    return results;

  } finally {
    await browser.close();
  }
}

/**
 * POST /search
 * 
 * Request body: { "query": "search term" }
 * Response: { "results": [{ link, title, snippet }] }
 */
app.post('/search', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query required', results: [] });
  }

  console.log(`[scraper] Received search request: "${query}"`);

  try {
    const results = await scrapeGoogle(query);
    console.log(`[scraper] Returning ${results.length} results for "${query}"`);
    res.json({ results });
  } catch (err) {
    console.error(`[scraper] Error:`, err.message);
    res.status(500).json({ error: err.message, results: [] });
  }
});

/**
 * GET /health
 * 
 * Health check endpoint for Cloud Run
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'alpha-search-scraper' });
});

/**
 * GET /
 * 
 * Root endpoint - returns service info
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Alpha Search Scraper',
    version: '1.0.0',
    endpoints: {
      'POST /search': 'Search Google with Puppeteer',
      'GET /health': 'Health check'
    }
  });
});

app.listen(PORT, () => {
  console.log(`[scraper] Alpha Search Scraper running on port ${PORT}`);
  console.log(`[scraper] Endpoints: POST /search, GET /health`);
});
