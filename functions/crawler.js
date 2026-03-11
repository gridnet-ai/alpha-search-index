/**
 * Alpha Search Index — Core Crawler Logic
 * 
 * Crawls domains for AI readiness signals:
 * - JSON-LD structured data
 * - llms.txt file
 * - OpenAPI specification
 * - MCP endpoint
 * 
 * Calculates Alpha Rank Score based on locked formula.
 */

/**
 * Normalize domain input to consistent format
 * Strips protocol, www prefix, and paths
 * Used for raw user input from the URL checker
 * 
 * @param {string} input - Raw URL or domain input
 * @returns {string} - Normalized domain (e.g., "stripe.com")
 */
function normalizeDomain(input) {
  try {
    // Try parsing as URL first
    const url = input.startsWith('http') ? input : 'https://' + input;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // Fallback: manual string manipulation
    return input
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .toLowerCase()
      .trim();
  }
}

/**
 * Extract domain from a full URL
 * Used for extracting domains from Google Custom Search API results
 * This is DIFFERENT from normalizeDomain - it handles full URLs with paths
 * 
 * @param {string} url - Full URL (e.g., "https://gridnetai.com/about/team")
 * @returns {string|null} - Domain (e.g., "gridnetai.com") or null if invalid
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Parse HTML for JSON-LD structured data
 * 
 * @param {string} html - HTML content from homepage
 * @returns {boolean} - True if JSON-LD script tag found
 */
function parseJsonLd(html) {
  // Check for <script type="application/ld+json">
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["']/i;
  return jsonLdRegex.test(html);
}

/**
 * Calculate Alpha Rank Score based on machine profile
 * 
 * Locked scoring formula:
 * - JSON-LD: +10 pts
 * - llms.txt: +12 pts
 * - OpenAPI: +13 pts
 * - MCP: +15 pts
 * - Domain resolves: +8 pts
 * 
 * @param {Object} results - Crawl results object
 * @returns {number} - Score from 0-100
 */
function calculateScore(results) {
  let score = 0;
  
  // Layer 1: Machine Profile (50 pts max)
  if (results.jsonLd) score += 10;
  if (results.llmsTxt) score += 12;
  if (results.openApi) score += 13;
  if (results.mcp) score += 15;
  
  // Layer 2: Verification (base: resolves = 8 pts)
  if (results.resolves) score += 8;
  
  // Future layers (engagement, claimed status, etc.) will add remaining 42 pts
  
  return score;
}

/**
 * Map score to grade tier
 * 
 * @param {number} score - Alpha Rank Score (0-100)
 * @returns {Object} - { grade, gradeClass }
 */
function getGrade(score) {
  if (score >= 90) return { grade: 'AI Native', gradeClass: 'ai-native' };
  if (score >= 70) return { grade: 'AI Ready', gradeClass: 'ai-ready' };
  if (score >= 50) return { grade: 'Machine Ready', gradeClass: 'machine-ready' };
  if (score >= 30) return { grade: 'Listed', gradeClass: 'listed' };
  return { grade: 'Not AI Ready', gradeClass: 'not-ready' };
}

/**
 * Crawl a domain for AI readiness signals
 * Performs parallel HTTP requests to check for:
 * - llms.txt
 * - MCP endpoint
 * - OpenAPI spec
 * - Homepage (for JSON-LD)
 * 
 * @param {string} domain - Normalized domain (e.g., "stripe.com")
 * @returns {Promise<Object>} - Crawl results with score and grade (or error state)
 */
async function crawlDomain(domain) {
  const base = `https://${domain}`;
  
  try {
    // Parallel fetch all endpoints with timeouts
    // Increased timeouts: 15s for files, 20s for homepage (handles slow servers)
    const [llmsTxtResult, mcpResult, openApiResult, homepageResult] = await Promise.allSettled([
      fetch(`${base}/llms.txt`, { 
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'AlphaSearchBot/1.0 (+https://alpha-search-index.web.app)' }
      }),
      fetch(`${base}/.well-known/mcp`, { 
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'AlphaSearchBot/1.0 (+https://alpha-search-index.web.app)' }
      }),
      fetch(`${base}/openapi.json`, { 
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'AlphaSearchBot/1.0 (+https://alpha-search-index.web.app)' }
      }),
      fetch(base, { 
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'AlphaSearchBot/1.0 (+https://alpha-search-index.web.app)' }
      })
    ]);
    
    // Build results object
    const results = {
      llmsTxt: llmsTxtResult.status === 'fulfilled' && llmsTxtResult.value.ok,
      mcp: mcpResult.status === 'fulfilled' && mcpResult.value.ok,
      openApi: openApiResult.status === 'fulfilled' && openApiResult.value.ok,
      jsonLd: false,
      resolves: false
    };
    
    // Parse homepage for JSON-LD
    if (homepageResult.status === 'fulfilled' && homepageResult.value.ok) {
      try {
        const html = await homepageResult.value.text();
        results.jsonLd = parseJsonLd(html);
        results.resolves = true;
        
        // Debug logging for JSON-LD detection
        console.log(`[${domain}] Homepage fetched: ${html.length} bytes, JSON-LD: ${results.jsonLd}`);
        
        // Log first 500 chars of HTML for debugging
        if (process.env.DEBUG_CRAWL === 'true') {
          console.log(`[${domain}] HTML preview:`, html.substring(0, 500));
        }
      } catch (error) {
        console.error(`Failed to parse homepage for ${domain}:`, error.message);
        results.resolves = false;
      }
    } else {
      results.resolves = false;
      console.log(`[${domain}] Homepage fetch failed:`, 
        homepageResult.status === 'rejected' ? homepageResult.reason?.message : 'unknown error');
    }
    
    // If domain doesn't resolve at all, return error state
    if (!results.resolves) {
      return {
        domain,
        score: null,
        grade: 'Could Not Score',
        gradeClass: 'error',
        machineProfile: results,
        crawledAt: new Date(),
        error: 'Domain unreachable or timed out'
      };
    }
    
    // Calculate score and grade
    const score = calculateScore(results);
    const { grade, gradeClass } = getGrade(score);
    
    return {
      domain,
      score,
      grade,
      gradeClass,
      machineProfile: results,
      crawledAt: new Date()
    };
    
  } catch (error) {
    // Network error, DNS failure, or catastrophic timeout
    console.error(`[${domain}] Crawl failed:`, error.message);
    return {
      domain,
      score: null,
      grade: 'Could Not Score',
      gradeClass: 'error',
      machineProfile: {
        llmsTxt: false,
        mcp: false,
        openApi: false,
        jsonLd: false,
        resolves: false
      },
      crawledAt: new Date(),
      error: error.message
    };
  }
}

// Export functions
module.exports = {
  normalizeDomain,
  extractDomain,
  parseJsonLd,
  calculateScore,
  getGrade,
  crawlDomain
};
