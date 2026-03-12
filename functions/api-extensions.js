/**
 * API Extensions for Cloud SQL and GCS Integration
 * 
 * These functions extend the existing API endpoints to dual-write to:
 * - Cloud SQL (ai_records + type tables)
 * - Cloud Storage (raw crawl data)
 * - Discovery Queue (for future re-indexing)
 * - User Search History (if authenticated)
 */

const { upsertAiRecord, addToDiscoveryQueue } = require('./db/sql');
const { saveRawCrawl } = require('./db/storage');
const { saveSearchToHistory, incrementSearchCount } = require('./db/searchHistory');
const { incrementSearchCount: incrementUserSearchCount } = require('./db/users');

/**
 * Dual-write domain crawl result to Cloud SQL + GCS
 * Called after successful domain crawl in handleCheck
 * 
 * @param {string} domain - Domain name
 * @param {Object} crawlResult - Result from crawlDomain()
 * @param {Object} req - Express request (for user auth)
 * @returns {Promise<void>}
 */
async function dualWriteDomainResult(domain, crawlResult, req) {
  try {
    // Prepare entity_source metadata
    const entity_source = {
      primary: 'user_submission',
      discovered_via: req.user ? 'authenticated_search' : 'anonymous_search',
      timestamp: new Date().toISOString(),
      user_id: req.user?.uid || null
    };
    
    // Prepare type_data for record_domains
    const type_data = {
      domain,
      homepage_url: `https://${domain}`,
      llms_txt: crawlResult.machineProfile.llmsTxt || false,
      llms_txt_url: crawlResult.machineProfile.llmsTxt ? `https://${domain}/llms.txt` : null,
      json_ld: crawlResult.machineProfile.jsonLd || false,
      json_ld_types: [], // TODO: Extract actual types from crawl
      open_api: crawlResult.machineProfile.openApi || false,
      open_api_url: crawlResult.machineProfile.openApi ? `https://${domain}/openapi.json` : null,
      mcp: crawlResult.machineProfile.mcp || false,
      mcp_url: crawlResult.machineProfile.mcp ? `https://${domain}/.well-known/mcp.json` : null,
      robots_txt: crawlResult.machineProfile.robotsTxt || false,
      sitemap: crawlResult.machineProfile.sitemap || false,
      sitemap_url: crawlResult.machineProfile.sitemap ? `https://${domain}/sitemap.xml` : null,
      title: null, // TODO: Extract from crawl
      description: null, // TODO: Extract from crawl
      favicon_url: null, // TODO: Extract from crawl
      status_code: crawlResult.machineProfile.resolves ? 200 : null,
      response_time_ms: null // TODO: Track response time
    };
    
    // Write to Cloud SQL
    try {
      await upsertAiRecord({
        entity_type: 'domain',
        entity_id: domain,
        alpha_score: crawlResult.score,
        grade: crawlResult.grade,
        grade_class: crawlResult.gradeClass,
        entity_source,
        type_data
      });
      console.log(`✓ Dual-write to Cloud SQL successful for ${domain}`);
    } catch (sqlError) {
      console.error(`✗ Cloud SQL write failed for ${domain}:`, sqlError.message);
      // Don't fail the request - Firestore is still primary
    }
    
    // Write raw crawl to GCS
    try {
      await saveRawCrawl('domain', domain, {
        crawl_result: crawlResult,
        request_metadata: {
          user_id: req.user?.uid || null,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        }
      });
      console.log(`✓ Raw crawl saved to GCS for ${domain}`);
    } catch (gcsError) {
      console.error(`✗ GCS write failed for ${domain}:`, gcsError.message);
      // Don't fail the request
    }
    
    // Add to discovery queue (priority 90 for user submissions)
    try {
      await addToDiscoveryQueue('domain', domain, 'user_submission', 90);
      console.log(`✓ Added ${domain} to discovery queue`);
    } catch (queueError) {
      console.error(`✗ Discovery queue write failed for ${domain}:`, queueError.message);
      // Don't fail the request
    }
    
    // Save to user search history if authenticated
    if (req.user) {
      try {
        await saveSearchToHistory(req.user.uid, {
          query: domain,
          entityType: 'domain',
          alphaScore: crawlResult.score,
          grade: crawlResult.grade,
          cacheHit: false,
          serpApiUsed: false
        });
        
        await incrementUserSearchCount(req.user.uid);
        console.log(`✓ Saved to user ${req.user.uid} search history`);
      } catch (historyError) {
        console.error(`✗ Search history write failed:`, historyError.message);
        // Don't fail the request
      }
    }
  } catch (error) {
    console.error('Error in dual-write:', error);
    // Don't throw - this is a best-effort enhancement
  }
}

/**
 * Dual-write person search result to Cloud SQL + GCS
 * Called after successful name search in handleNameSearch
 * 
 * @param {string} name - Person name
 * @param {Array} pages - SerpAPI results
 * @param {Object} searchResult - Aggregate search result
 * @param {Object} req - Express request (for user auth)
 * @returns {Promise<void>}
 */
async function dualWritePersonResult(name, pages, searchResult, req) {
  try {
    // Prepare entity_source metadata
    const entity_source = {
      primary: 'serp_api',
      discovered_via: req.user ? 'authenticated_search' : 'anonymous_search',
      timestamp: new Date().toISOString(),
      user_id: req.user?.uid || null,
      serp_api_results_count: pages.length
    };
    
    // Extract URLs by platform
    const linkedin_url = pages.find(p => p.url.includes('linkedin.com/in/'))?.url || null;
    const github_url = pages.find(p => p.url.includes('github.com/') && !p.url.includes('/repos/'))?.url || null;
    const wikipedia_url = pages.find(p => p.url.includes('wikipedia.org/wiki/'))?.url || null;
    const twitter_url = pages.find(p => p.url.includes('twitter.com/') || p.url.includes('x.com/'))?.url || null;
    const personal_site = pages.find(p => 
      !p.url.includes('linkedin.com') && 
      !p.url.includes('github.com') && 
      !p.url.includes('wikipedia.org') &&
      !p.url.includes('twitter.com') &&
      !p.url.includes('x.com')
    )?.url || null;
    
    // Prepare type_data for record_people
    const type_data = {
      full_name: name,
      linkedin_url,
      github_url,
      wikipedia_url,
      personal_site,
      twitter_url,
      agent_card: false, // TODO: Check for agent card
      agent_card_url: null,
      title: null, // TODO: Extract from profiles
      company: null, // TODO: Extract from profiles
      bio: null // TODO: Extract from profiles
    };
    
    // Write to Cloud SQL
    try {
      await upsertAiRecord({
        entity_type: 'person',
        entity_id: name,
        alpha_score: searchResult.avgScore,
        grade: searchResult.grade,
        grade_class: searchResult.gradeClass,
        entity_source,
        type_data
      });
      console.log(`✓ Dual-write to Cloud SQL successful for person: ${name}`);
    } catch (sqlError) {
      console.error(`✗ Cloud SQL write failed for ${name}:`, sqlError.message);
    }
    
    // Write raw search to GCS
    try {
      await saveRawCrawl('person', name, {
        serp_api_results: pages,
        crawl_results: searchResult.results,
        request_metadata: {
          user_id: req.user?.uid || null,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        }
      });
      console.log(`✓ Raw search saved to GCS for person: ${name}`);
    } catch (gcsError) {
      console.error(`✗ GCS write failed for ${name}:`, gcsError.message);
    }
    
    // Add person to discovery queue (priority 85 for SerpAPI results)
    try {
      await addToDiscoveryQueue('person', name, 'serp_api_result', 85);
      console.log(`✓ Added person ${name} to discovery queue`);
    } catch (queueError) {
      console.error(`✗ Discovery queue write failed for ${name}:`, queueError.message);
    }
    
    // Add all discovered domains to discovery queue
    try {
      const domains = searchResult.results.map(r => r.domain);
      await Promise.all(
        domains.map(domain => 
          addToDiscoveryQueue('domain', domain, 'serp_api_result', 85)
        )
      );
      console.log(`✓ Added ${domains.length} domains to discovery queue`);
    } catch (queueError) {
      console.error(`✗ Domain discovery queue write failed:`, queueError.message);
    }
    
    // Save to user search history if authenticated
    if (req.user) {
      try {
        await saveSearchToHistory(req.user.uid, {
          query: name,
          entityType: 'person',
          alphaScore: searchResult.avgScore,
          grade: searchResult.grade,
          cacheHit: false,
          serpApiUsed: true
        });
        
        await incrementUserSearchCount(req.user.uid);
        console.log(`✓ Saved to user ${req.user.uid} search history`);
      } catch (historyError) {
        console.error(`✗ Search history write failed:`, historyError.message);
      }
    }
  } catch (error) {
    console.error('Error in dual-write for person:', error);
    // Don't throw - this is a best-effort enhancement
  }
}

module.exports = {
  dualWriteDomainResult,
  dualWritePersonResult
};
