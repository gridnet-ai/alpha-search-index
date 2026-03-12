# Phase 1: Extend Current System for People & Products

## Goal
Add support for indexing **people** and **products** using the existing Firestore infrastructure, with 24-hour cache for all entity types.

**Timeline**: 1 week  
**Effort**: ~20 hours

---

## 🗄️ Firestore Collections

### 1. Update `index` collection (domains)
Add `entity_type` field for future migration:
```javascript
{
  entity_type: 'domain',  // NEW FIELD
  domain: 'stripe.com',
  alphaRankScore: 95,
  grade: 'AI Native',
  gradeClass: 'ai-native',
  machineProfile: { ... },
  lastCrawled: Timestamp,
  firstCrawled: Timestamp,
  crawlCount: 5,
  cacheValidUntil: Timestamp  // NEW: explicit cache expiry
}
```

### 2. Create `people_index` collection
```javascript
{
  entity_type: 'person',
  person_id: 'sam-altman',  // normalized name (lowercase, hyphenated)
  display_name: 'Sam Altman',
  alphaRankScore: 88,
  grade: 'AI Ready',
  gradeClass: 'ai-ready',
  machineProfile: {
    linkedin: {
      found: true,
      url: 'https://linkedin.com/in/sama',
      structured_data: true
    },
    twitter: {
      found: true,
      url: 'https://twitter.com/sama',
      verified: true
    },
    github: {
      found: true,
      url: 'https://github.com/sama',
      structured_data: false
    },
    personal_website: {
      found: true,
      url: 'https://blog.samaltman.com',
      jsonLd: true,
      llmsTxt: false,
      hCard: true
    },
    wikipedia: {
      found: true,
      url: 'https://en.wikipedia.org/wiki/Sam_Altman',
      structured_data: true
    }
  },
  sources: [
    { platform: 'LinkedIn', url: '...', score_contribution: 25 },
    { platform: 'Twitter', url: '...', score_contribution: 20 },
    { platform: 'Personal Site', url: '...', score_contribution: 30 },
    { platform: 'GitHub', url: '...', score_contribution: 13 }
  ],
  lastCrawled: Timestamp,
  firstCrawled: Timestamp,
  crawlCount: 2,
  cacheValidUntil: Timestamp
}
```

### 3. Create `products_index` collection
```javascript
{
  entity_type: 'product',
  product_id: 'iphone-15-pro',  // normalized name
  display_name: 'iPhone 15 Pro',
  manufacturer: 'Apple',
  category: 'Smartphones',
  alphaRankScore: 92,
  grade: 'AI Native',
  gradeClass: 'ai-native',
  machineProfile: {
    product_page: {
      found: true,
      url: 'https://www.apple.com/iphone-15-pro/',
      schema_org_product: true,
      jsonLd: true
    },
    manufacturer_api: {
      found: true,
      url: 'https://api.apple.com/products/iphone-15-pro',
      openApi: true
    },
    reviews: {
      structured_data: true,
      sources: ['Apple', 'Amazon', 'Best Buy']
    },
    pricing: {
      structured_data: true,
      real_time_api: true
    },
    inventory: {
      api_available: true,
      real_time: true
    },
    specifications: {
      structured_data: true,
      machine_readable: true
    }
  },
  sources: [
    { platform: 'Apple.com', url: '...', score_contribution: 40 },
    { platform: 'Amazon', url: '...', score_contribution: 25 },
    { platform: 'Best Buy', url: '...', score_contribution: 15 },
    { platform: 'Product API', url: '...', score_contribution: 12 }
  ],
  lastCrawled: Timestamp,
  firstCrawled: Timestamp,
  crawlCount: 3,
  cacheValidUntil: Timestamp
}
```

---

## 🔍 Scoring Algorithms

### Domain Score (existing, 0-100)
```
JSON-LD:     10 pts
llms.txt:    12 pts
OpenAPI:     13 pts
MCP:         15 pts
Resolves:    50 pts (base requirement)
Total:       100 pts
```

### Person Score (0-100)
```
LinkedIn profile:        20 pts
  └─ with structured data: +5 pts
Twitter/X profile:       15 pts
  └─ verified:           +5 pts
GitHub profile:          10 pts
  └─ with README:        +3 pts
Personal website:        25 pts
  └─ with JSON-LD:       +5 pts
  └─ with llms.txt:      +5 pts
  └─ with hCard/vCard:   +5 pts
Wikipedia page:          10 pts
  └─ with structured data: +5 pts
Contact methods (email): 5 pts
Total:                   100 pts
```

### Product Score (0-100)
```
Product page exists:           15 pts
  └─ with Schema.org Product:  +10 pts
Manufacturer API:              15 pts
  └─ with OpenAPI spec:        +5 pts
Structured reviews:            10 pts
Real-time pricing API:         15 pts
Inventory API:                 10 pts
Detailed specifications:       10 pts
  └─ machine-readable:         +5 pts
Multi-platform presence:       10 pts
Total:                         100 pts
```

---

## 🛠️ Implementation Tasks

### Task 1: Update Firestore Rules
**File**: `firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Domain index
    match /index/{domain} {
      allow read: if true;
      allow write: if false;
    }
    
    // People index
    match /people_index/{personId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Products index
    match /products_index/{productId} {
      allow read: if true;
      allow write: if false;
    }
    
    // ... existing rules ...
  }
}
```

### Task 2: Create Person Crawler
**New file**: `functions/crawlers/person-crawler.js`

```javascript
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Crawl a person's online presence and calculate AI Readiness Score
 * @param {string} personName - Full name to search
 * @returns {Promise<Object>} Person AI Record
 */
async function crawlPerson(personName) {
  const personId = normalizeName(personName);
  
  const profile = {
    linkedin: await checkLinkedIn(personName),
    twitter: await checkTwitter(personName),
    github: await checkGitHub(personName),
    personal_website: await findPersonalWebsite(personName),
    wikipedia: await checkWikipedia(personName)
  };
  
  const score = calculatePersonScore(profile);
  const grade = getGrade(score);
  
  return {
    entity_type: 'person',
    person_id: personId,
    display_name: personName,
    alphaRankScore: score,
    grade: grade.name,
    gradeClass: grade.class,
    machineProfile: profile,
    sources: extractSources(profile)
  };
}

function calculatePersonScore(profile) {
  let score = 0;
  
  // LinkedIn (20 pts + 5 bonus)
  if (profile.linkedin.found) {
    score += 20;
    if (profile.linkedin.structured_data) score += 5;
  }
  
  // Twitter (15 pts + 5 bonus)
  if (profile.twitter.found) {
    score += 15;
    if (profile.twitter.verified) score += 5;
  }
  
  // GitHub (10 pts + 3 bonus)
  if (profile.github.found) {
    score += 10;
    if (profile.github.readme) score += 3;
  }
  
  // Personal website (25 pts + 15 bonus)
  if (profile.personal_website.found) {
    score += 25;
    if (profile.personal_website.jsonLd) score += 5;
    if (profile.personal_website.llmsTxt) score += 5;
    if (profile.personal_website.hCard) score += 5;
  }
  
  // Wikipedia (10 pts + 5 bonus)
  if (profile.wikipedia.found) {
    score += 10;
    if (profile.wikipedia.structured_data) score += 5;
  }
  
  return Math.min(score, 100);
}

// Helper functions
async function checkLinkedIn(name) {
  // Use SerpAPI or LinkedIn API to find profile
  // Check for structured data (JSON-LD)
  return {
    found: true,
    url: '...',
    structured_data: true
  };
}

async function checkTwitter(name) {
  // Use Twitter API to find profile
  return {
    found: true,
    url: '...',
    verified: true
  };
}

// ... more helpers ...

module.exports = { crawlPerson };
```

### Task 3: Create Product Crawler
**New file**: `functions/crawlers/product-crawler.js`

```javascript
/**
 * Crawl a product's online presence and calculate AI Readiness Score
 * @param {string} productName - Product name to search
 * @returns {Promise<Object>} Product AI Record
 */
async function crawlProduct(productName) {
  const productId = normalizeProductName(productName);
  
  // Find product across multiple platforms
  const profile = {
    product_page: await findProductPage(productName),
    manufacturer_api: await checkManufacturerAPI(productName),
    reviews: await checkReviews(productName),
    pricing: await checkPricing(productName),
    inventory: await checkInventory(productName),
    specifications: await checkSpecifications(productName)
  };
  
  const score = calculateProductScore(profile);
  const grade = getGrade(score);
  
  return {
    entity_type: 'product',
    product_id: productId,
    display_name: productName,
    manufacturer: profile.product_page.manufacturer,
    category: profile.product_page.category,
    alphaRankScore: score,
    grade: grade.name,
    gradeClass: grade.class,
    machineProfile: profile,
    sources: extractSources(profile)
  };
}

function calculateProductScore(profile) {
  let score = 0;
  
  // Product page (15 pts + 10 bonus)
  if (profile.product_page.found) {
    score += 15;
    if (profile.product_page.schema_org_product) score += 10;
  }
  
  // Manufacturer API (15 pts + 5 bonus)
  if (profile.manufacturer_api.found) {
    score += 15;
    if (profile.manufacturer_api.openApi) score += 5;
  }
  
  // Structured reviews (10 pts)
  if (profile.reviews.structured_data) {
    score += 10;
  }
  
  // Real-time pricing API (15 pts)
  if (profile.pricing.real_time_api) {
    score += 15;
  }
  
  // Inventory API (10 pts)
  if (profile.inventory.api_available) {
    score += 10;
  }
  
  // Specifications (10 pts + 5 bonus)
  if (profile.specifications.structured_data) {
    score += 10;
    if (profile.specifications.machine_readable) score += 5;
  }
  
  // Multi-platform presence (10 pts)
  const platforms = countPlatforms(profile);
  if (platforms >= 3) score += 10;
  
  return Math.min(score, 100);
}

module.exports = { crawlProduct };
```

### Task 4: Update Cloud Functions API
**File**: `functions/index.js`

Add new endpoints:

```javascript
// Route to endpoints
if (path === '/check' || path === '/api/check') {
  await handleCheck(req, res);  // existing - domains
} else if (path === '/search' || path === '/api/search') {
  await handleNameSearch(req, res);  // existing - name search
} else if (path === '/person' || path === '/api/person') {
  await handlePersonSearch(req, res);  // NEW
} else if (path === '/product' || path === '/api/product') {
  await handleProductSearch(req, res);  // NEW
} else {
  res.status(404).json({ error: 'Not found' });
}

/**
 * Handle POST /api/person
 */
async function handlePersonSearch(req, res) {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ 
        error: 'Missing or invalid "name" parameter' 
      });
    }
    
    const personId = normalizeName(name);
    console.log(`Person search for: ${name} (ID: ${personId})`);
    
    // Check Firestore cache (24 hours)
    const docRef = db.collection('people_index').doc(personId);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      const cacheValidUntil = data.cacheValidUntil?.toDate();
      
      if (cacheValidUntil && cacheValidUntil > new Date()) {
        console.log(`✓ CACHE HIT for ${name} - score ${data.alphaRankScore}`);
        return res.json({ ...data, cached: true });
      }
    }
    
    // Fresh crawl
    console.log(`Running fresh crawl for person: ${name}...`);
    const crawlResult = await crawlPerson(name);
    
    // Save to Firestore with 24hr cache
    const now = new Date();
    const cacheValidUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    await docRef.set({
      ...crawlResult,
      lastCrawled: now,
      firstCrawled: doc.exists ? doc.data().firstCrawled : now,
      crawlCount: doc.exists ? (doc.data().crawlCount || 0) + 1 : 1,
      cacheValidUntil: cacheValidUntil
    }, { merge: true });
    
    console.log(`Person crawl complete: ${name} - ${crawlResult.alphaRankScore}/100`);
    
    res.json({ ...crawlResult, cached: false });
    
  } catch (error) {
    console.error('Error in /api/person:', error);
    res.status(500).json({ 
      error: 'Failed to crawl person',
      message: error.message 
    });
  }
}

/**
 * Handle POST /api/product
 */
async function handleProductSearch(req, res) {
  // Similar implementation for products
  // ...
}
```

### Task 5: Update Frontend UI
**File**: `public/index.html`

Add entity type selector:

```html
<!-- Search bar with entity type selector -->
<div id="searchWrap" class="search-wrap center">
  <div class="search-bar">
    <!-- Entity type selector -->
    <select id="entityType" class="entity-type-selector">
      <option value="auto">Auto-detect</option>
      <option value="domain">Domain</option>
      <option value="person">Person</option>
      <option value="product">Product</option>
    </select>
    
    <input 
      type="text" 
      id="searchInput" 
      placeholder="Search any domain, person, or product..."
      autocomplete="off"
    />
    
    <button id="sendBtn" class="send-btn">
      <!-- ... existing button ... -->
    </button>
  </div>
</div>
```

Add CSS for entity type selector:

```css
.entity-type-selector {
  padding: 12px 16px;
  background: var(--bg);
  border: none;
  border-right: 1px solid rgba(255,255,255,0.05);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  border-radius: 20px 0 0 20px;
}

.entity-type-selector:focus {
  color: var(--text);
}
```

Update search handler:

```javascript
async function handleSearch() {
  const input = document.getElementById('searchInput').value.trim();
  const entityType = document.getElementById('entityType').value;
  
  if (!input) return;
  
  // Auto-detect or use selected type
  const detectedType = entityType === 'auto' 
    ? detectEntityType(input) 
    : entityType;
  
  if (detectedType === 'domain') {
    await handleUrlCheck(input);
  } else if (detectedType === 'person') {
    await handlePersonSearch(input);
  } else if (detectedType === 'product') {
    await handleProductSearch(input);
  }
}

function detectEntityType(input) {
  // URL pattern → domain
  if (/^https?:\/\//i.test(input) || /\S+\.\S+/.test(input)) {
    return 'domain';
  }
  
  // Product patterns (contains brand names, model numbers)
  if (/\b(iphone|macbook|galaxy|pixel|airpods)\b/i.test(input)) {
    return 'product';
  }
  
  // Default to person for names
  return 'person';
}
```

---

## 🧪 Testing Plan

### Test Cases

**Domains** (existing):
- ✅ stripe.com → AI Native (95/100)
- ✅ example.com → Not AI Ready (0/100)

**People** (new):
- [ ] "Sam Altman" → AI Ready (88/100)
- [ ] "Elon Musk" → AI Native (95/100)
- [ ] "Unknown Person" → Not Found (0/100)

**Products** (new):
- [ ] "iPhone 15 Pro" → AI Native (92/100)
- [ ] "Tesla Model 3" → AI Ready (85/100)
- [ ] "Unknown Product" → Not Found (0/100)

### Cache Testing
- [ ] Search same entity twice within 24 hours → cache hit
- [ ] Search same entity after 24 hours → fresh crawl
- [ ] Verify `cacheValidUntil` timestamp is set correctly

---

## 📊 Success Criteria

- [ ] All three entity types (domain, person, product) are searchable
- [ ] 24-hour cache works for all entity types
- [ ] Scores are calculated correctly per entity type
- [ ] UI displays entity-specific machine profiles
- [ ] Frontend auto-detects entity type from query
- [ ] Manual entity type selection works
- [ ] All tests pass
- [ ] Performance: < 5 seconds for fresh crawl, < 100ms for cache hit

---

## 🚀 Deployment

```bash
# 1. Deploy Firestore rules
firebase deploy --only firestore:rules

# 2. Deploy Cloud Functions
firebase deploy --only functions

# 3. Deploy Frontend
firebase deploy --only hosting

# 4. Test in production
curl -X POST https://alphasearch.gridnetai.com/api/person \
  -H "Content-Type: application/json" \
  -d '{"name": "Sam Altman"}'
```

---

## 📝 Next Steps (Phase 2)

After Phase 1 is complete:
1. Migrate to Cloud SQL for better performance and lower costs
2. Implement background indexer for automated updates
3. Add full-text search across all entity types
4. Build analytics dashboard
5. Scale to 30M AI Records

