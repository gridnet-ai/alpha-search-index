const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Crawl a person's online presence and calculate their Alpha Score
 * 
 * @param {string} name - Person's full name
 * @param {Array} urls - Array of URLs to check (from SerpAPI results)
 * @returns {Promise<Object>} - Person AI Record data
 */
async function crawlPerson(name, urls = []) {
  console.log(`Crawling person: ${name}`);
  
  const result = {
    full_name: name,
    linkedin_url: null,
    github_url: null,
    wikipedia_url: null,
    personal_site: null,
    twitter_url: null,
    agent_card: false,
    agent_card_url: null,
    title: null,
    company: null,
    bio: null,
    signals: {
      linkedin: false,
      github: false,
      wikipedia: false,
      personal_site: false,
      agent_card: false,
      structured_data: false,
      social_presence: false
    }
  };
  
  // Categorize URLs by platform
  for (const url of urls) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('linkedin.com/in/')) {
      result.linkedin_url = url;
      result.signals.linkedin = true;
    } else if (urlLower.includes('github.com/') && !urlLower.includes('/repos/')) {
      result.github_url = url;
      result.signals.github = true;
    } else if (urlLower.includes('wikipedia.org/wiki/')) {
      result.wikipedia_url = url;
      result.signals.wikipedia = true;
    } else if (urlLower.includes('twitter.com/') || urlLower.includes('x.com/')) {
      result.twitter_url = url;
      result.signals.social_presence = true;
    } else if (!result.personal_site) {
      // First non-platform URL is likely personal site
      result.personal_site = url;
    }
  }
  
  // Check personal site for agent card and structured data
  if (result.personal_site) {
    try {
      await checkPersonalSite(result.personal_site, result);
    } catch (error) {
      console.error(`Error checking personal site for ${name}:`, error.message);
    }
  }
  
  // Calculate Alpha Score
  const score = calculatePersonScore(result.signals);
  const { grade, gradeClass } = getGrade(score);
  
  return {
    entity_type: 'person',
    entity_id: name,
    alpha_score: score,
    grade,
    grade_class: gradeClass,
    type_data: result
  };
}

/**
 * Check personal site for agent card and structured data
 */
async function checkPersonalSite(url, result) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AlphaSearchBot/1.0 (https://alphasearch.gridnetai.com)'
      },
      maxRedirects: 3
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Check for agent card at /.well-known/agent.json
    const baseUrl = new URL(url).origin;
    try {
      const agentCardResponse = await axios.get(`${baseUrl}/.well-known/agent.json`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (agentCardResponse.status === 200) {
        result.agent_card = true;
        result.agent_card_url = `${baseUrl}/.well-known/agent.json`;
        result.signals.agent_card = true;
      }
    } catch (error) {
      // Agent card not found - that's okay
    }
    
    // Check for JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    if (jsonLdScripts.length > 0) {
      result.signals.structured_data = true;
      
      // Try to extract person info from JSON-LD
      jsonLdScripts.each((i, elem) => {
        try {
          const jsonLd = JSON.parse($(elem).html());
          if (jsonLd['@type'] === 'Person') {
            result.title = result.title || jsonLd.jobTitle;
            result.company = result.company || jsonLd.worksFor?.name;
            result.bio = result.bio || jsonLd.description;
          }
        } catch (error) {
          // Invalid JSON-LD - skip
        }
      });
    }
    
    // Extract basic info from meta tags if not found in JSON-LD
    if (!result.bio) {
      result.bio = $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content');
    }
    
    result.signals.personal_site = true;
  } catch (error) {
    console.error(`Failed to check personal site ${url}:`, error.message);
  }
}

/**
 * Calculate person Alpha Score based on signals
 * 
 * Scoring breakdown:
 * - LinkedIn profile: 20 points
 * - GitHub profile: 20 points
 * - Wikipedia page: 25 points
 * - Personal website: 15 points
 * - Agent card (/.well-known/agent.json): 10 points
 * - Structured data (JSON-LD): 5 points
 * - Social presence (Twitter/X): 5 points
 * 
 * Total: 100 points
 */
function calculatePersonScore(signals) {
  let score = 0;
  
  if (signals.linkedin)        score += 20;
  if (signals.github)          score += 20;
  if (signals.wikipedia)       score += 25;
  if (signals.personal_site)   score += 15;
  if (signals.agent_card)      score += 10;
  if (signals.structured_data) score += 5;
  if (signals.social_presence) score += 5;
  
  return score;
}

/**
 * Get grade and grade class from score
 */
function getGrade(score) {
  if (score === null) {
    return { grade: 'Could Not Score', gradeClass: 'error' };
  }
  
  if (score >= 90) return { grade: 'A+', gradeClass: 'excellent' };
  if (score >= 85) return { grade: 'A',  gradeClass: 'excellent' };
  if (score >= 80) return { grade: 'B+', gradeClass: 'good' };
  if (score >= 70) return { grade: 'B',  gradeClass: 'good' };
  if (score >= 60) return { grade: 'C+', gradeClass: 'fair' };
  if (score >= 50) return { grade: 'C',  gradeClass: 'fair' };
  if (score >= 40) return { grade: 'D',  gradeClass: 'poor' };
  return { grade: 'F', gradeClass: 'fail' };
}

/**
 * Extract person info from a single URL
 * Used for targeted crawling when we have a specific profile URL
 */
async function extractPersonInfo(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'AlphaSearchBot/1.0 (https://alphasearch.gridnetai.com)'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const info = {
      title: null,
      company: null,
      bio: null
    };
    
    // LinkedIn-specific extraction
    if (url.includes('linkedin.com')) {
      info.title = $('div.text-body-medium').first().text().trim();
      info.company = $('div.inline-show-more-text').first().text().trim();
    }
    
    // GitHub-specific extraction
    if (url.includes('github.com')) {
      info.bio = $('div[data-bio-text]').text().trim();
      info.company = $('span[itemprop="worksFor"]').text().trim();
    }
    
    // Generic extraction
    if (!info.bio) {
      info.bio = $('meta[name="description"]').attr('content') || 
                 $('meta[property="og:description"]').attr('content');
    }
    
    return info;
  } catch (error) {
    console.error(`Failed to extract info from ${url}:`, error.message);
    return null;
  }
}

module.exports = { 
  crawlPerson, 
  extractPersonInfo,
  calculatePersonScore,
  getGrade
};
