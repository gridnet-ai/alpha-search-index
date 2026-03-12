const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Crawl a product and calculate its Alpha Score
 * 
 * @param {string} productName - Product name
 * @param {string} productUrl - Product page URL
 * @returns {Promise<Object>} - Product AI Record data
 */
async function crawlProduct(productName, productUrl) {
  console.log(`Crawling product: ${productName} at ${productUrl}`);
  
  const result = {
    product_name: productName,
    product_url: productUrl,
    schema_org_product: false,
    api_available: false,
    api_docs_url: null,
    pricing_structured: false,
    inventory_api: false,
    brand: null,
    category: null,
    description: null,
    price: null,
    currency: null,
    platform: null,
    signals: {
      schema_org_product: false,
      api_available: false,
      pricing_structured: false,
      inventory_api: false,
      reviews_structured: false,
      availability_data: false
    }
  };
  
  try {
    // Detect platform from URL
    result.platform = detectPlatform(productUrl);
    
    // Fetch product page
    const response = await axios.get(productUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'AlphaSearchBot/1.0 (https://alphasearch.gridnetai.com)'
      },
      maxRedirects: 5
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Check for schema.org/Product structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((i, elem) => {
      try {
        const jsonLd = JSON.parse($(elem).html());
        
        if (jsonLd['@type'] === 'Product' || 
            (Array.isArray(jsonLd['@graph']) && jsonLd['@graph'].some(item => item['@type'] === 'Product'))) {
          result.schema_org_product = true;
          result.signals.schema_org_product = true;
          
          // Extract product data from JSON-LD
          const productData = jsonLd['@type'] === 'Product' 
            ? jsonLd 
            : jsonLd['@graph']?.find(item => item['@type'] === 'Product');
          
          if (productData) {
            result.brand = result.brand || productData.brand?.name;
            result.description = result.description || productData.description;
            
            // Extract price
            if (productData.offers) {
              const offer = Array.isArray(productData.offers) 
                ? productData.offers[0] 
                : productData.offers;
              
              if (offer.price) {
                result.price = parseFloat(offer.price);
                result.currency = offer.priceCurrency || 'USD';
                result.pricing_structured = true;
                result.signals.pricing_structured = true;
              }
              
              // Check for availability
              if (offer.availability) {
                result.signals.availability_data = true;
              }
            }
            
            // Check for reviews
            if (productData.aggregateRating || productData.review) {
              result.signals.reviews_structured = true;
            }
          }
        }
      } catch (error) {
        // Invalid JSON-LD - skip
      }
    });
    
    // Check for API documentation
    const apiLinks = $('a[href*="api"], a[href*="API"], a[href*="developer"]');
    if (apiLinks.length > 0) {
      const apiUrl = apiLinks.first().attr('href');
      if (apiUrl) {
        result.api_docs_url = new URL(apiUrl, productUrl).href;
        result.api_available = true;
        result.signals.api_available = true;
      }
    }
    
    // Extract basic info from meta tags if not found in JSON-LD
    if (!result.description) {
      result.description = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content');
    }
    
    if (!result.brand) {
      result.brand = $('meta[property="og:site_name"]').attr('content');
    }
    
    // Platform-specific extraction
    if (result.platform === 'amazon') {
      await extractAmazonData($, result);
    } else if (result.platform === 'shopify') {
      await extractShopifyData($, result);
    }
    
  } catch (error) {
    console.error(`Failed to crawl product ${productName}:`, error.message);
    
    // Return null score if completely unreachable
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return {
        entity_type: 'product',
        entity_id: productName,
        alpha_score: null,
        grade: 'Could Not Score',
        grade_class: 'error',
        type_data: result
      };
    }
  }
  
  // Calculate Alpha Score
  const score = calculateProductScore(result.signals);
  const { grade, gradeClass } = getGrade(score);
  
  return {
    entity_type: 'product',
    entity_id: productName,
    alpha_score: score,
    grade,
    grade_class: gradeClass,
    type_data: result
  };
}

/**
 * Detect e-commerce platform from URL
 */
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('amazon.com') || urlLower.includes('amazon.')) {
    return 'amazon';
  } else if (urlLower.includes('shopify.com') || urlLower.includes('myshopify.com')) {
    return 'shopify';
  } else if (urlLower.includes('ebay.com')) {
    return 'ebay';
  } else if (urlLower.includes('etsy.com')) {
    return 'etsy';
  }
  
  return 'custom';
}

/**
 * Extract Amazon-specific data
 */
async function extractAmazonData($, result) {
  // Amazon has rich structured data
  result.signals.pricing_structured = true;
  result.signals.reviews_structured = true;
  result.signals.availability_data = true;
  
  // Extract brand
  if (!result.brand) {
    result.brand = $('#bylineInfo').text().trim().replace('Visit the ', '').replace(' Store', '');
  }
  
  // Extract price
  if (!result.price) {
    const priceText = $('.a-price .a-offscreen').first().text().trim();
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      result.price = parseFloat(priceMatch[0].replace(',', ''));
      result.currency = 'USD';
    }
  }
}

/**
 * Extract Shopify-specific data
 */
async function extractShopifyData($, result) {
  // Shopify sites often have good structured data
  result.signals.pricing_structured = true;
  result.signals.availability_data = true;
  
  // Check for Shopify API
  const baseUrl = new URL(result.product_url).origin;
  result.api_docs_url = `${baseUrl}/admin/api`;
  result.api_available = true;
  result.signals.api_available = true;
}

/**
 * Calculate product Alpha Score based on signals
 * 
 * Scoring breakdown:
 * - schema.org/Product markup: 30 points
 * - API available: 25 points
 * - Structured pricing: 15 points
 * - Inventory API: 15 points
 * - Structured reviews: 10 points
 * - Availability data: 5 points
 * 
 * Total: 100 points
 */
function calculateProductScore(signals) {
  let score = 0;
  
  if (signals.schema_org_product)   score += 30;
  if (signals.api_available)        score += 25;
  if (signals.pricing_structured)   score += 15;
  if (signals.inventory_api)        score += 15;
  if (signals.reviews_structured)   score += 10;
  if (signals.availability_data)    score += 5;
  
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

module.exports = { 
  crawlProduct, 
  detectPlatform,
  calculateProductScore,
  getGrade
};
