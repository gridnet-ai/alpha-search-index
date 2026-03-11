/**
 * Alpha Search Index — Cloud Functions API
 * 
 * Provides the /api/check endpoint for crawling domains
 * and storing results in Firestore.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { normalizeDomain, extractDomain, crawlDomain, getGrade } = require('./crawler');
const { googleSearch } = require('./scraper');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * API endpoint: POST /api/check
 * 
 * Request body: { "url": "stripe.com" }
 * 
 * Returns crawl results with Alpha Rank Score
 */
exports.apiHandler = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes for name searches with multiple crawls
    memory: '512MB',
    invoker: 'public'
  })
  .https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Route to endpoints
  // Firebase hosting rewrite adds /api prefix, so we need to check for both
  const path = req.path;
  
  if ((path === '/check' || path === '/api/check') && req.method === 'POST') {
    await handleCheck(req, res);
  } else if ((path === '/search' || path === '/api/search') && req.method === 'POST') {
    await handleNameSearch(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

/**
 * Handle POST /api/check
 */
async function handleCheck(req, res) {
  try {
    // Validate request body
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "url" parameter' 
      });
    }
    
    // Normalize domain
    const domain = normalizeDomain(url);
    
    if (!domain || domain.length < 3) {
      return res.status(400).json({ 
        error: 'Invalid domain format' 
      });
    }
    
    console.log(`Checking domain: ${domain}`);
    
    // Check Firestore cache
    const docRef = db.collection('index').doc(domain);
    const doc = await docRef.get();
    
    // If cached and fresh (< 24 hours), return immediately
    if (doc.exists) {
      const data = doc.data();
      const lastCrawled = data.lastCrawled?.toDate();
      const now = new Date();
      const hoursSinceLastCrawl = (now - lastCrawled) / (1000 * 60 * 60);
      
      if (hoursSinceLastCrawl < 24) {
        console.log(`✓ CACHE HIT for ${domain} - score ${data.alphaRankScore} (${hoursSinceLastCrawl.toFixed(1)}h old)`);
        
        return res.json({
          domain: data.domain,
          score: data.alphaRankScore,
          grade: data.grade,
          gradeClass: data.gradeClass,
          machineProfile: data.machineProfile,
          cached: true,
          lastCrawled: data.lastCrawled
        });
      } else {
        console.log(`Cache expired for ${domain} (${hoursSinceLastCrawl.toFixed(1)}h old) - recrawling`);
      }
    } else {
      console.log(`No cache found for ${domain} - fresh crawl`);
    }
    
    // Run fresh crawl
    console.log(`Running fresh crawl for ${domain}...`);
    const crawlResult = await crawlDomain(domain);
    
    // Prepare Firestore document
    const now = new Date();
    const isNewDomain = !doc.exists;
    
    const firestoreData = {
      domain: crawlResult.domain,
      alphaRankScore: crawlResult.score,
      grade: crawlResult.grade,
      gradeClass: crawlResult.gradeClass,
      machineProfile: {
        jsonLd: crawlResult.machineProfile.jsonLd,
        llmsTxt: crawlResult.machineProfile.llmsTxt,
        openApi: crawlResult.machineProfile.openApi,
        mcp: crawlResult.machineProfile.mcp
      },
      verification: {
        resolves: crawlResult.machineProfile.resolves,
        crawlVerified: true,
        claimedByOwner: false
      },
      lastCrawled: now,
      crawlCount: isNewDomain ? 1 : (doc.data().crawlCount || 0) + 1
    };
    
    // Add firstCrawled timestamp for new domains
    if (isNewDomain) {
      firestoreData.firstCrawled = now;
    }
    
    // Write to Firestore
    await docRef.set(firestoreData, { merge: true });
    
    console.log(`Crawl complete for ${domain}: ${crawlResult.score}/100 (${crawlResult.grade})`);
    
    // Return result
    res.json({
      domain: crawlResult.domain,
      score: crawlResult.score,
      grade: crawlResult.grade,
      gradeClass: crawlResult.gradeClass,
      machineProfile: crawlResult.machineProfile,
      cached: false
    });
    
  } catch (error) {
    console.error('Error in /api/check:', error);
    
    // Return user-friendly error
    res.status(500).json({ 
      error: 'Failed to crawl domain',
      message: error.message 
    });
  }
}

/**
 * Find pages using SerpAPI (Google Search Results)
 * 
 * @param {string} query - Name to search for
 * @returns {Promise<Array>} - Array of page objects with url, title, description
 */
async function findPagesWithSerpAPI(query) {
  const serpApiKey = process.env.SERPAPI_KEY || functions.config().serpapi?.key;
  
  if (!serpApiKey) {
    throw new Error('SerpAPI key not configured');
  }
  
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=10&api_key=${serpApiKey}`;
  
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': 'AlphaSearchBot/1.0 (+https://alpha-search-index.web.app)'
    }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SerpAPI returned ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.organic_results?.map(item => ({
    url: item.link,
    provider: 'serpapi',
    title: item.title,
    description: item.snippet
  })) || [];
}

/**
 * Find pages using Google Custom Search API
 * 
 * @param {string} query - Name to search for
 * @returns {Promise<Array>} - Array of page objects with url, title, description
 */
async function findPagesWithGoogle(query) {
  const apiKey = process.env.GOOGLE_API_KEY || functions.config().google?.api_key;
  const cx = process.env.GOOGLE_CX || functions.config().google?.cx;
  
  if (!apiKey || !cx) {
    throw new Error('Google Custom Search API credentials not configured');
  }
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
  
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'AlphaSearchBot/1.0 (+https://alpha-search-index.web.app)' }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google API returned ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.items?.map(item => ({
    url: item.link,
    title: item.title,
    description: item.snippet
  })) || [];
}

/**
 * Find pages for a given name using available search methods
 * Tries direct scraper first, then Google Custom Search, then SerpAPI
 * 
 * @param {string} query - Name to search for
 * @returns {Promise<Array>} - Array of page objects with url, title, description
 */
async function findPagesForName(query) {
  console.log(`Searching for: ${query}`);
  
  // Go straight to SerpAPI (Cloud Run scraper and Google Custom Search don't work)
  try {
    console.log('→ Using SerpAPI...');
    const results = await findPagesWithSerpAPI(query);
    console.log(`✓ SerpAPI returned ${results.length} results`);
    return results;
  } catch (serpError) {
    console.error(`✗ SerpAPI failed: ${serpError.message}`);
    return [];
  }
}

/**
 * Get cached result from Firestore if fresh (< 24h)
 * 
 * @param {string} domain - Domain to check
 * @returns {Promise<Object|null>} - Cached result or null
 */
async function getCachedResult(domain) {
  try {
    const docRef = db.collection('index').doc(domain);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;
    
    const data = doc.data();
    const lastCrawled = data.lastCrawled?.toDate();
    const now = new Date();
    const hoursSinceLastCrawl = (now - lastCrawled) / (1000 * 60 * 60);
    
    if (hoursSinceLastCrawl < 24) {
      return {
        domain: data.domain,
        score: data.alphaRankScore,
        grade: data.grade,
        gradeClass: data.gradeClass,
        machineProfile: data.machineProfile
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking cache for ${domain}:`, error);
    return null;
  }
}

/**
 * Handle POST /api/search
 * Search for a name and score all pages found
 */
async function handleNameSearch(req, res) {
  try {
    // Validate request body
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "query" parameter' 
      });
    }
    
    console.log(`Name search for: ${query}`);
    
    // Step 1: Find pages using Google Custom Search
    const pages = await findPagesForName(query);
    
    if (pages.length === 0) {
      return res.json({
        query,
        totalPages: 0,
        avgScore: 0,
        grade: 'Not AI Ready',
        gradeClass: 'not-ready',
        results: [],
        message: 'No pages found'
      });
    }
    
    // Step 2: Extract unique domains
    const seen = new Set();
    const uniquePages = pages.filter(page => {
      const domain = extractDomain(page.url);
      if (!domain || seen.has(domain)) return false;
      seen.add(domain);
      return true;
    }).slice(0, 10); // Cap at 10 pages
    
    console.log(`Found ${uniquePages.length} unique domains to crawl`);
    
    // Step 3: Crawl all domains in parallel (check cache first)
    console.log(`Starting parallel crawl of ${uniquePages.length} domains...`);
    const crawlStartTime = Date.now();
    
    // Capture admin and db in this scope to avoid closure issues
    const firestore = admin.firestore;
    const database = db;
    
    const crawlResults = await Promise.allSettled(
      uniquePages.map(async (page, index) => {
        const domain = extractDomain(page.url);
        const domainStartTime = Date.now();
        
        // Check cache first
        const cached = await getCachedResult(domain);
        if (cached) {
          const elapsed = Date.now() - domainStartTime;
          console.log(`[${index + 1}/${uniquePages.length}] ✓ ${domain} - CACHE HIT - score ${cached.score} (${elapsed}ms)`);
          return {
            ...cached,
            pageTitle: page.title,
            pageUrl: page.url,
            fromCache: true
          };
        }
        
        // Otherwise crawl
        console.log(`[${index + 1}/${uniquePages.length}] Crawling ${domain}...`);
        const crawled = await crawlDomain(domain);
        const elapsed = Date.now() - domainStartTime;
        console.log(`[${index + 1}/${uniquePages.length}] ✓ ${domain} - score ${crawled.score} (${elapsed}ms)`);
        
        // TODO: Save to Firestore (skipping for now to fix scoring display)
        // Will implement proper Firestore writes after scores are displaying
        
        // Return result
        return {
          domain: crawled.domain,
          score: crawled.score,
          grade: crawled.grade,
          gradeClass: crawled.gradeClass,
          machineProfile: crawled.machineProfile,
          pageTitle: page.title,
          pageUrl: page.url,
          fromCache: false
        };
      })
    );
    
    // Step 4: Filter successful results
    const crawlTotalTime = Date.now() - crawlStartTime;
    console.log(`Parallel crawl completed in ${crawlTotalTime}ms`);
    
    // Debug: log the status of each result
    console.log(`DEBUG: crawlResults statuses:`, crawlResults.map((r, i) => `[${i}] ${r.status}`).join(', '));
    
    const results = crawlResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    const failedCount = crawlResults.filter(r => r.status === 'rejected').length;
    const rejectedReasons = crawlResults
      .filter(r => r.status === 'rejected')
      .map((r, i) => `[${i}] ${r.reason?.message || r.reason}`)
      .join('; ');
    
    console.log(`Results: ${results.length} successful, ${failedCount} failed`);
    if (failedCount > 0) {
      console.log(`Rejection reasons: ${rejectedReasons}`);
    }
    
    if (results.length === 0) {
      return res.json({
        query,
        totalPages: uniquePages.length,
        avgScore: 0,
        grade: 'Not AI Ready',
        gradeClass: 'not-ready',
        results: [],
        message: 'Pages were found but none were reachable'
      });
    }
    
    // Step 5: Calculate aggregate score
    const avgScore = Math.round(
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    );
    const { grade, gradeClass } = getGrade(avgScore);
    
    // TODO: Step 6: Store detailed search metadata (skipping for now)
    // Will implement after scores are displaying correctly
    
    console.log(`Name search complete: ${results.length} pages, avg score ${avgScore}`);
    
    // Step 7: Return results
    res.json({
      query,
      totalPages: results.length,
      avgScore,
      grade,
      gradeClass,
      results: results.map(r => ({
        domain: r.domain,
        pageTitle: r.pageTitle,
        pageUrl: r.pageUrl,
        score: r.score,
        grade: r.grade,
        gradeClass: r.gradeClass,
        machineProfile: r.machineProfile,
        fromCache: r.fromCache
      }))
    });
    
  } catch (error) {
    console.error('Error in /api/search:', error);
    
    // Return user-friendly error
    res.status(500).json({ 
      error: 'Failed to search for name',
      message: error.message 
    });
  }
}

