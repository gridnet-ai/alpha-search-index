/**
 * Alpha Search Index — Cloud Functions API
 * 
 * Provides the /api/check endpoint for crawling domains
 * and storing results in Firestore.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
const { URL: NodeURL } = require('url');
const { normalizeDomain, extractDomain, crawlDomain, getGrade } = require('./crawler');
const { googleSearch } = require('./scraper');
const { verifyToken, attachUser } = require('./auth');
const { createUserProfile, getUserProfile, incrementSearchCount } = require('./db/users');
const { saveSearchToHistory, getUserSearchHistory, saveAiRecord, getUserSavedRecords, removeSavedRecord } = require('./db/searchHistory');
const { createCheckoutSession, createNfcCheckoutSession, createBillingPortalSession, handleWebhook } = require('./stripe');

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
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // Route to endpoints
  // Firebase hosting rewrite adds /api prefix, so we need to check for both
  const path = req.path;
  
  if ((path === '/check' || path === '/api/check') && req.method === 'POST') {
    await attachUser(req, res, () => handleCheck(req, res));
  } else if ((path === '/search' || path === '/api/search') && req.method === 'POST') {
    await attachUser(req, res, () => handleNameSearch(req, res));
  } else if ((path === '/user/profile' || path === '/api/user/profile') && req.method === 'GET') {
    await verifyToken(req, res, () => handleGetUserProfile(req, res));
  } else if ((path === '/user/history' || path === '/api/user/history') && req.method === 'GET') {
    await verifyToken(req, res, () => handleGetUserHistory(req, res));
  } else if ((path === '/user/saved' || path === '/api/user/saved') && req.method === 'GET') {
    await verifyToken(req, res, () => handleGetUserSaved(req, res));
  } else if ((path === '/user/saved' || path === '/api/user/saved') && req.method === 'POST') {
    await verifyToken(req, res, () => handleSaveRecord(req, res));
  } else if ((path === '/user/saved' || path === '/api/user/saved') && req.method === 'DELETE') {
    await verifyToken(req, res, () => handleDeleteSaved(req, res));
  } else if ((path === '/createCheckoutSession' || path === '/api/createCheckoutSession') && req.method === 'POST') {
    await verifyToken(req, res, () => handleCreateCheckoutSession(req, res));
  } else if ((path === '/createNfcCheckoutSession' || path === '/api/createNfcCheckoutSession') && req.method === 'POST') {
    await verifyToken(req, res, () => handleCreateNfcCheckoutSession(req, res));
  } else if ((path === '/createBillingPortalSession' || path === '/api/createBillingPortalSession') && req.method === 'POST') {
    await verifyToken(req, res, () => handleCreateBillingPortalSession(req, res));
  } else if ((path === '/link-preview' || path === '/api/link-preview') && req.method === 'POST') {
    handleLinkPreview(req, res);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

/**
 * POST /api/link-preview — fetch basic OG metadata (title, description, image) for a URL.
 */
function fetchUrlBodyForPreview(href, maxBytes) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new NodeURL(href);
    } catch (e) {
      reject(e);
      return;
    }
    const lib = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: (u.pathname || '/') + (u.search || ''),
      method: 'GET',
      headers: { 'User-Agent': 'AlphaSearchLinkPreview/1.0' },
      timeout: 12000
    };
    const req = lib.request(opts, (r) => {
      let buf = '';
      r.setEncoding('utf8');
      r.on('data', (chunk) => {
        if (Buffer.byteLength(buf, 'utf8') < maxBytes) buf += chunk;
        if (Buffer.byteLength(buf, 'utf8') >= maxBytes) {
          r.destroy();
          resolve(buf.slice(0, maxBytes));
        }
      });
      r.on('end', () => resolve(buf));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

async function handleLinkPreview(req, res) {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url' });
    }
    let target;
    try {
      target = new NodeURL(url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim());
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid protocol' });
    }
    const html = await fetchUrlBodyForPreview(target.href, 98304);
    const ogTitle =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogDesc =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const site = target.hostname.replace(/^www\./, '');
    const favicon = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(site) + '&sz=64';
    const title = (ogTitle && ogTitle[1] ? ogTitle[1].trim() : null) || (titleTag && titleTag[1] ? titleTag[1].trim() : site);
    res.json({
      title: title || site,
      description: ogDesc && ogDesc[1] ? ogDesc[1].trim() : '',
      thumbnail: ogImage && ogImage[1] ? ogImage[1].trim() : null,
      favicon,
      url: target.href
    });
  } catch (err) {
    console.error('link-preview', err);
    res.status(500).json({ error: err.message || 'Failed to fetch preview' });
  }
}

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

    // Step 5b: Alpha pages matching the search query (for inline results)
    let alphaPages = [];
    try {
      const alphaSnap = await db.collection('alpha_pages_index').limit(50).get();
      const q = (query || '').toLowerCase().trim();
      if (q.length >= 2) {
        alphaPages = alphaSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => {
            const name = (p.name || '').toLowerCase();
            const slug = (p.slug || '').toLowerCase();
            const caption = (p.caption || p.bio || '').toLowerCase();
            const business = (p.businessName || '').toLowerCase();
            return name.includes(q) || slug.includes(q) || caption.includes(q) || business.includes(q);
          })
          .slice(0, 10);
      }
    } catch (alphaErr) {
      console.warn('Alpha pages lookup failed (non-fatal):', alphaErr.message);
    }
    
    console.log(`Name search complete: ${results.length} pages, avg score ${avgScore}, alpha pages: ${alphaPages.length}`);
    
    // Step 6: Write to search_log (second index: every search + every file found)
    const sessionId = req.body?.sessionId || req.headers['x-session-id'] || null;
    const searchLogPayload = {
      query,
      userId: req.user?.uid || null,
      sessionId: sessionId || null,
      searchedAt: admin.firestore.FieldValue.serverTimestamp(),
      avgScore,
      grade,
      gradeClass,
      totalResults: results.length,
      results: results.map(r => ({
        domain: r.domain,
        pageUrl: r.pageUrl,
        pageTitle: r.pageTitle,
        score: r.score,
        grade: r.grade,
        gradeClass: r.gradeClass,
        machineProfile: r.machineProfile || null,
        fromCache: r.fromCache || false
      }))
    };
    try {
      await db.collection('search_log').add(searchLogPayload);
    } catch (logErr) {
      console.warn('Search log write failed (non-fatal):', logErr.message);
    }

    // Step 7: Save to user's search history if authenticated
    if (req.user) {
      try {
        await saveSearchToHistory(req.user.uid, {
          query,
          entityType: 'person',
          alphaScore: avgScore,
          grade,
          cacheHit: false,
          serpApiUsed: true
        });
      } catch (historyErr) {
        console.warn('User search history write failed (non-fatal):', historyErr.message);
      }
    }

    // Step 8: Return results + matching alpha pages
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
      })),
      alphaPages: alphaPages.map(p => ({
        id: p.id,
        name: p.name || p.displayName || 'Alpha Page',
        slug: p.slug,
        publicUrl: p.public_url,
        caption: p.caption || p.bio || '',
        avatarDataUrl: p.avatarDataUrl || null,
        coverDataUrl: p.coverDataUrl || null
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

// ============================================================================
// USER API ENDPOINTS
// ============================================================================

/**
 * GET /api/user/profile
 * Get or create user profile
 */
async function handleGetUserProfile(req, res) {
  try {
    const uid = req.user.uid;
    
    // Get existing profile
    let profile = await getUserProfile(uid);
    
    // Create profile if doesn't exist
    if (!profile) {
      await createUserProfile(uid, {
        email: req.user.email,
        displayName: req.user.name,
        photoURL: req.user.picture
      });
      profile = await getUserProfile(uid);
    }
    
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error in /api/user/profile:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/user/history
 * Get user's search history
 */
async function handleGetUserHistory(req, res) {
  try {
    const uid = req.user.uid;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await getUserSearchHistory(uid, limit);
    
    res.json({ 
      success: true, 
      count: history.length,
      history 
    });
  } catch (error) {
    console.error('Error in /api/user/history:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/user/saved
 * Get user's saved AI Records
 */
async function handleGetUserSaved(req, res) {
  try {
    const uid = req.user.uid;
    const limit = parseInt(req.query.limit) || 100;
    
    const saved = await getUserSavedRecords(uid, limit);
    
    res.json({ 
      success: true, 
      count: saved.length,
      saved 
    });
  } catch (error) {
    console.error('Error in /api/user/saved:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/user/saved
 * Save an AI Record to user's collection
 */
async function handleSaveRecord(req, res) {
  try {
    const uid = req.user.uid;
    const { entityType, entityId, alphaScore, grade } = req.body;
    
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const recordId = await saveAiRecord(uid, {
      entityType,
      entityId,
      alphaScore,
      grade
    });
    
    res.json({ 
      success: true, 
      recordId,
      message: 'Record saved successfully' 
    });
  } catch (error) {
    console.error('Error in POST /api/user/saved:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/user/saved
 * Remove a saved AI Record
 */
async function handleDeleteSaved(req, res) {
  try {
    const uid = req.user.uid;
    const { recordId } = req.body;
    
    if (!recordId) {
      return res.status(400).json({ error: 'Missing recordId' });
    }
    
    await removeSavedRecord(uid, recordId);
    
    res.json({ 
      success: true,
      message: 'Record removed successfully' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/user/saved:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/createCheckoutSession
 * Body: { plan: 'starter' | 'premium' | 'pro', successUrl?, cancelUrl? }
 * Returns: { url } — redirect user to this URL for Stripe Checkout
 */
async function handleCreateCheckoutSession(req, res) {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const { plan, successUrl, cancelUrl, addNfcCard, nfcQty } = req.body || {};
    if (!plan || !['starter', 'premium', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Use "starter", "premium", or "pro".' });
    }
    const origin = process.env.FIREBASE_HOSTING_URL || 'https://alpha-search-index.web.app';
    const result = await createCheckoutSession(
      uid,
      email,
      plan,
      successUrl || `${origin}/?checkout=success`,
      cancelUrl || `${origin}/?checkout=cancelled`,
      !!addNfcCard,
      nfcQty
    );
    res.json({ url: result.url });
  } catch (error) {
    console.error('CreateCheckoutSession error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
}

/**
 * POST /api/createNfcCheckoutSession
 * Body: { returnUrl? }
 * Returns: { url } — redirect user to Stripe Checkout for Stream Disc (one-time payment)
 */
async function handleCreateNfcCheckoutSession(req, res) {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const { returnUrl, quantity } = req.body || {};
    const origin = process.env.FIREBASE_HOSTING_URL || 'https://alpha-search-index.web.app';
    const result = await createNfcCheckoutSession(uid, email, returnUrl || `${origin}/`, quantity);
    res.json({ url: result.url });
  } catch (error) {
    console.error('CreateNfcCheckoutSession error:', error);
    res.status(500).json({ error: error.message || 'Failed to create NFC checkout session' });
  }
}

/**
 * POST /api/createBillingPortalSession
 * Body: { returnUrl? }
 * Returns: { url } — redirect user to Stripe Customer Portal
 */
async function handleCreateBillingPortalSession(req, res) {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });
    const { returnUrl } = req.body || {};
    const origin = process.env.FIREBASE_HOSTING_URL || 'https://alpha-search-index.web.app';
    const result = await createBillingPortalSession(uid, returnUrl || origin);
    res.json({ url: result.url });
  } catch (error) {
    console.error('CreateBillingPortalSession error:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
}

/**
 * Stripe webhook — must be a separate function to read raw body for signature verification.
 * In Stripe Dashboard: add endpoint https://us-central1-alpha-search-index.cloudfunctions.net/stripeWebhook
 * and set stripe.webhook_secret in Firebase config from the signing secret.
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  try {
    const rawBody = req.rawBody != null ? req.rawBody : await readRawBody(req);
    const signature = req.headers['stripe-signature'] || '';
    await handleWebhook(rawBody, signature);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
