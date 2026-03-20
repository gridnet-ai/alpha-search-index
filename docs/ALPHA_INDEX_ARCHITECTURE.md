# Alpha Search Index Architecture

## Vision
Build a unified, globally-accessible index of AI Records across three entity types:
- **Domains** (websites, APIs, services)
- **People** (professionals, creators, public figures)
- **Products** (physical goods, software, services)

Each entity gets an **AI Record** — a complete snapshot of how visible and accessible they are to AI agents.

---

## 🗄️ Database Architecture

### Option 1: Firestore (Current - Good for MVP)
**Pros:**
- Already implemented
- Serverless, auto-scaling
- Real-time sync
- Simple queries
- Good for < 10M records

**Cons:**
- Expensive at scale (30M+ records)
- Limited query capabilities
- No full-text search
- Document size limits (1MB)

### Option 2: Cloud SQL + Cloud Storage (Recommended for Scale)
**Pros:**
- Cost-effective at scale
- Complex queries (JOINs, aggregations)
- Full-text search
- Unlimited record size
- Industry-standard PostgreSQL

**Cons:**
- Requires connection pooling
- More complex setup
- Manual scaling

### Hybrid Approach (Recommended)
```
┌─────────────────────────────────────────────────────────────┐
│                     ALPHA SEARCH INDEX                       │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼─────┐ ┌────▼─────┐ ┌────▼──────┐
         │  DOMAINS   │ │  PEOPLE  │ │ PRODUCTS  │
         │   INDEX    │ │  INDEX   │ │   INDEX   │
         └──────┬─────┘ └────┬─────┘ └────┬──────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Cloud SQL        │
                    │   (PostgreSQL)     │
                    │                    │
                    │  - Unified schema  │
                    │  - 24hr cache      │
                    │  - Full-text FTS   │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Cloud Storage     │
                    │  (Buckets)         │
                    │                    │
                    │  - Raw crawl data  │
                    │  - Historical data │
                    │  - Backups         │
                    └────────────────────┘
```

---

## 📊 Unified Schema (Cloud SQL)

### Main Table: `ai_records`
```sql
CREATE TABLE ai_records (
  -- Identity
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL, -- 'domain', 'person', 'product'
  entity_id VARCHAR(500) NOT NULL,  -- domain name, person name, product SKU
  entity_canonical VARCHAR(500),    -- normalized version
  
  -- AI Readiness Score
  alpha_score INTEGER,              -- 0-100 or NULL (not scored)
  grade VARCHAR(50),                -- 'AI Native', 'AI Ready', etc.
  grade_class VARCHAR(50),          -- CSS class for UI
  
  -- Machine Profile (JSON)
  machine_profile JSONB,            -- Structured data about AI signals
  
  -- Source Attribution
  entity_source JSONB,              -- Which sources contributed to this record
  
  -- Metadata
  first_indexed TIMESTAMP DEFAULT NOW(),
  last_indexed TIMESTAMP DEFAULT NOW(),
  index_count INTEGER DEFAULT 1,
  cache_valid_until TIMESTAMP,     -- Cache expiry timestamp
  cache_ttl_hours INTEGER,          -- TTL used for this record (24, 48, 168)
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  claimed_by_user_id VARCHAR(128),
  
  -- Search optimization
  search_vector TSVECTOR,           -- Full-text search
  
  -- Constraints
  UNIQUE(entity_type, entity_id)
);

-- Indexes for performance
CREATE INDEX idx_entity_type ON ai_records(entity_type);
CREATE INDEX idx_cache_valid ON ai_records(cache_valid_until);
CREATE INDEX idx_alpha_score ON ai_records(alpha_score DESC);
CREATE INDEX idx_search_vector ON ai_records USING GIN(search_vector);
CREATE INDEX idx_last_indexed ON ai_records(last_indexed DESC);
CREATE INDEX idx_entity_source ON ai_records USING GIN(entity_source);
CREATE INDEX idx_cache_ttl ON ai_records(cache_ttl_hours);
```

### Source Attribution (in `entity_source` JSONB)

The `entity_source` field tracks which sources contributed to each AI Record, when they were last checked, and their score contributions:

```json
{
  "sources": [
    {
      "platform": "LinkedIn",
      "url": "https://linkedin.com/in/sama",
      "last_checked": "2026-03-12T10:30:00Z",
      "status": "active",
      "score_contribution": 25,
      "signals_found": ["structured_data", "profile_complete"]
    },
    {
      "platform": "GitHub",
      "url": "https://github.com/sama",
      "last_checked": "2026-03-12T10:30:00Z",
      "status": "active",
      "score_contribution": 13,
      "signals_found": ["readme", "repos"]
    },
    {
      "platform": "Personal Website",
      "url": "https://blog.samaltman.com",
      "last_checked": "2026-03-12T10:30:00Z",
      "status": "active",
      "score_contribution": 30,
      "signals_found": ["jsonLd", "hCard"]
    }
  ],
  "primary_source": "LinkedIn",
  "sources_count": 3,
  "last_source_check": "2026-03-12T10:30:00Z"
}
```

**Why this matters:**
- Query which sources contribute most to high-scoring entities
- Re-crawl individual sources independently (e.g., LinkedIn every 7 days, GitHub every 14 days)
- Build source reliability metrics (which sources are most stable/informative)
- API consumers can see data provenance and verify information

### Domain-Specific Fields (in `machine_profile` JSONB)
```json
{
  "domain": {
    "resolves": true,
    "jsonLd": true,
    "llmsTxt": true,
    "openApi": true,
    "mcp": true,
    "robotsTxt": true,
    "sitemap": true,
    "favicon": "https://...",
    "homepage_title": "...",
    "meta_description": "..."
  }
}
```

### Person-Specific Fields
```json
{
  "person": {
    "linkedin_url": "https://linkedin.com/in/...",
    "twitter_url": "https://twitter.com/...",
    "github_url": "https://github.com/...",
    "personal_website": "https://...",
    "bio": "...",
    "structured_data": true,
    "ai_agent_card": true,
    "contact_methods": ["email", "linkedin"],
    "verified_identity": false
  }
}
```

### Product-Specific Fields
```json
{
  "product": {
    "product_url": "https://...",
    "manufacturer": "...",
    "category": "...",
    "schema_org_product": true,
    "api_available": true,
    "pricing_data": true,
    "reviews_structured": true,
    "inventory_api": false
  }
}
```

### Cache Configuration Table: `cache_config`

The `cache_config` table enables tiered TTL caching with different cache durations per entity type:

```sql
CREATE TABLE cache_config (
  entity_type VARCHAR(20) PRIMARY KEY,
  ttl_hours INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO cache_config VALUES
  ('domain', 24, 'Domains change frequently - APIs, docs, endpoints', NOW()),
  ('person', 168, 'People profiles change slowly - 7 days', NOW()),
  ('product', 48, 'Products change moderately - pricing, inventory', NOW());
```

**Tiered TTL Strategy:**

- **Domains**: 24 hours - Domains change frequently (new API endpoints, updated documentation, new structured data)
- **People**: 168 hours (7 days) - People profiles change slowly (career moves, new social profiles, bio updates)
- **Products**: 48 hours (2 days) - Products change moderately (pricing updates, inventory changes, new SKUs)

**Impact on Re-indexing Load at 30M Records:**

Current approach (24hr cache for all entity types):
- 30M records / 24 hours = 1.25M re-crawls/day = 52K/hour = 867/minute

With tiered TTL caching:
- 10M domains / 24 hours = 417K/day
- 10M people / 168 hours = 60K/day
- 10M products / 48 hours = 208K/day
- **Total: 685K/day = 28.5K/hour = 475/minute**

**Reduction: 45% fewer re-crawls** while maintaining data freshness appropriate to each entity type.

**Usage in Application Code:**

```javascript
// Get TTL for entity type
const ttlConfig = await sql`
  SELECT ttl_hours FROM cache_config WHERE entity_type = ${entityType}
`;

// Set cache expiry
const cacheValidUntil = new Date(Date.now() + (ttlConfig.ttl_hours * 60 * 60 * 1000));

// Insert/update record
await sql`
  INSERT INTO ai_records (entity_type, entity_id, cache_valid_until, cache_ttl_hours, ...)
  VALUES (${entityType}, ${entityId}, ${cacheValidUntil}, ${ttlConfig.ttl_hours}, ...)
`;
```

### Discovery Queue Table: `discovery_queue`

The `discovery_queue` table stores candidate entities discovered from various sources, prioritized for indexing:

```sql
CREATE TABLE discovery_queue (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,       -- 'domain', 'person', 'product'
  entity_id VARCHAR(500) NOT NULL,        -- Normalized entity identifier
  priority_score INTEGER DEFAULT 50,      -- 0-100 priority score
  discovered_at TIMESTAMP DEFAULT NOW(),
  discovery_source VARCHAR(100),          -- 'common_crawl', 'tranco', 'linkedin', 'user_submission', etc.
  discovery_phase INTEGER,                -- 1, 2, or 3 (Foundation, Structured, Amplifiers)
  indexed BOOLEAN DEFAULT FALSE,
  indexed_at TIMESTAMP,
  
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_priority ON discovery_queue(priority_score DESC, indexed);
CREATE INDEX idx_discovery_source ON discovery_queue(discovery_source);
CREATE INDEX idx_discovery_phase ON discovery_queue(discovery_phase);
CREATE INDEX idx_indexed ON discovery_queue(indexed) WHERE indexed = FALSE;
```

**Priority Scoring Logic:**

```javascript
function calculatePriority(entity, sources) {
  let priority = 50; // Base score
  
  // Source-based priority
  if (sources.includes('user_submission')) {
    priority = 90; // Highest - immediate demand signal
  } else if (sources.includes('tranco') && sources.includes('common_crawl')) {
    priority = 80; // High - quality + volume signal
  } else if (sources.includes('amazon')) {
    priority = 75; // High - structured product data
  } else if (sources.includes('linkedin')) {
    priority = 70; // High - professional profiles
  } else if (sources.includes('github')) {
    priority = 65; // Medium-high - developer profiles
  } else if (sources.includes('trending')) {
    priority = 60; // Medium - trending signal
  }
  
  return priority;
}
```

**Usage Flow:**

1. **Discovery job runs** (every 6 hours)
2. **Entities discovered** from various sources
3. **Priority calculated** based on source quality
4. **Inserted into discovery_queue** with priority score
5. **Hourly indexer jobs** query queue: `SELECT * FROM discovery_queue WHERE indexed = FALSE ORDER BY priority_score DESC LIMIT 100`
6. **Entities crawled and scored**
7. **Inserted into ai_records** table
8. **discovery_queue record updated**: `indexed = TRUE, indexed_at = NOW()`

---

## 🔄 Automated Routine Updates

### Background Indexer Service (Cloud Run)
```
┌─────────────────────────────────────────────────────────┐
│            ALPHA INDEXER (Cloud Run)                    │
│                                                         │
│  1. Read from Cloud SQL: records where                 │
│     cache_valid_until < NOW()                          │
│                                                         │
│  2. Re-crawl entities in batches (100 at a time)       │
│                                                         │
│  3. Update scores and machine_profile                  │
│                                                         │
│  4. Query cache_config for entity-specific TTL         │
│     Set cache_valid_until = NOW() + TTL hours          │
│     (domains: 24hr, people: 7d, products: 48hr)        │
│                                                         │
│  5. Save raw crawl data to Cloud Storage bucket        │
│                                                         │
│  Runs: Every 1 hour via Cloud Scheduler                │
└─────────────────────────────────────────────────────────┘
```

### Cloud Scheduler Jobs
```bash
# Job 1: Update expired domain records
0 * * * *  # Every hour
→ Triggers: /api/indexer/domains

# Job 2: Update expired person records
15 * * * *  # Every hour at :15
→ Triggers: /api/indexer/people

# Job 3: Update expired product records
30 * * * *  # Every hour at :30
→ Triggers: /api/indexer/products

# Job 4: Discover new entities (systematic crawling + user submissions)
0 */6 * * *  # Every 6 hours
→ Triggers: /api/indexer/discover

# Discovery executes in phases:
# Phase 1 (0-6 months): Common Crawl domain index + Tranco Top 1M
# Phase 2 (6-12 months): LinkedIn + GitHub + Amazon catalog
# Phase 3 (12-18 months): Trending lists + user submissions
```

---

## 🔍 Discovery System Architecture

### The Critical Question

**How does Alpha Search grow from 2.4M to 30M AI Records?**

The discovery job (`0 */6 * * *`) is the growth engine. It executes systematic crawling in a specific order, prioritizing reproducible sources over noisy trending lists.

### Discovery Execution Sequence (Phased Approach)

#### Phase 1: Foundation (0-6 months) - Domains

**1. Common Crawl Domain Index (Primary Source)**

**CRITICAL: Use domain-level index files, NOT the full crawl.**

- **What**: Domain index from Common Crawl (~5GB compressed, not 100TB full crawl)
- **URL**: `https://commoncrawl.org/` → Domain Index files
- **Files to download**: `cc-index.paths.gz` (domain list, not WARC files)
- **Cost**: Free (S3 access to index files)
- **Strategy**:
  - Download domain index file (~5GB compressed)
  - Extract unique registrable domains (e.g., `stripe.com` not `api.stripe.com`)
  - Filter for domains with AI signals in metadata (JSON-LD, OpenAPI references)
  - Queue for indexing in `discovery_queue`
- **Expected yield**: 100M+ unique domains from index
- **Why first**: Systematic, reproducible, free, manageable size, already structured

**2. Tranco Top 1M (Priority Boost)**

- **What**: Research-grade top 1M domains list (better than Alexa)
- **URL**: `https://tranco-list.eu/`
- **Cost**: Free
- **Update frequency**: Daily
- **Strategy**:
  - Download daily Tranco list
  - Cross-reference with Common Crawl list
  - Boost priority score for domains in Tranco (higher quality signal)
  - Queue high-priority domains first
- **Expected yield**: 1M high-signal domains
- **Why second**: Adds quality signal to Common Crawl base, not noisy, free

#### Phase 2: Structured Sources (6-12 months) - People & Products

**3. LinkedIn Directory (People)**

- **Strategy**: Systematic crawl of LinkedIn public profiles by industry/role
- **Target**: C-level executives, founders, technical leaders
- **Rate limit**: 100 profiles/hour (respect LinkedIn ToS)
- **Expected yield**: 2K people/day = 360K/6 months
- **Why**: Structured, crawlable at scale, professional context

**4. GitHub API (People)**

- **Strategy**: GitHub API for developers, maintainers, contributors
- **Target**: Open source maintainers, prolific contributors
- **Expected yield**: 500 people/day = 90K/6 months
- **Why**: Structured data, free API access, developer focus

**5. Amazon Product Catalog (Products)**

- **Strategy**: Parse Amazon product pages with schema.org/Product markup
- **Target**: Best sellers across 50+ categories
- **Expected yield**: 5K products/day = 900K/6 months
- **Why**: Structured data already present (schema.org), high-quality catalog

#### Phase 3: Amplifiers (12-18 months) - Growth Acceleration

**6. Trending Lists (All Entity Types)**

- **Product Hunt**: New products
- **Twitter/X trending**: People, topics
- **Hacker News**: Domains, people
- **Strategy**: Layer on top of existing index as amplifiers
- **Expected yield**: 1K entities/day
- **Why last**: Requires existing index to contextualize trends, noisy without base

**7. User Submissions (All Entity Types)**

- **Strategy**: Users search for entities not in index → queue for indexing
- **Priority**: 90 (highest - immediate demand signals)
- **Expected yield**: Organic growth, scales with user base
- **Why last**: No users at scale yet, grows naturally over time

### Discovery Priority Scoring

Entities in the discovery queue are prioritized by source quality and demand signals:

- **Common Crawl domain**: 50 (base)
- **Common Crawl + Tranco**: 80 (high priority - quality signal)
- **LinkedIn profile**: 70
- **GitHub profile**: 65
- **Amazon product**: 75
- **Trending lists**: 60
- **User submissions**: 90 (highest - immediate demand)

Higher priority entities are indexed first by the hourly indexer jobs.

### Growth Projections

**Current state:** 2.4M domains

**With systematic discovery:**

- **Month 3**: +2M domains (Common Crawl) = 4.4M total
- **Month 6**: +5M domains (Common Crawl + Tranco) = 9.4M total
- **Month 9**: +2M domains, +500K people (LinkedIn/GitHub) = 11.9M total
- **Month 12**: +3M domains, +1M people, +1M products (Amazon) = 16.9M total
- **Month 18**: +5M domains, +5M people, +5M products (all sources) = **31.9M total**

**Timeline to 30M AI Records: 18 months** (Q4 2027)

---

## 🗂️ Cloud Storage Buckets

### Bucket Structure
```
gs://alpha-search-index-data/
├── raw-crawls/
│   ├── domains/
│   │   ├── 2026/03/12/
│   │   │   ├── stripe.com.json
│   │   │   ├── openai.com.json
│   │   │   └── ...
│   ├── people/
│   │   ├── 2026/03/12/
│   │   │   ├── sam-altman.json
│   │   │   └── ...
│   ├── products/
│       ├── 2026/03/12/
│           ├── iphone-15-pro.json
│           └── ...
├── snapshots/
│   ├── daily/
│   │   ├── 2026-03-12-full-index.sql.gz
│   │   └── ...
│   ├── weekly/
│       └── ...
├── analytics/
│   ├── search-trends.json
│   ├── top-domains.json
│   └── ...
```

### Retention Policy
- **Raw crawls**: 90 days
- **Daily snapshots**: 30 days
- **Weekly snapshots**: 1 year
- **Analytics**: Indefinite

---

## 🔍 Search Query Flow (with 24hr Cache)

### User searches "stripe.com"
```
1. Frontend → Cloud Function: POST /api/search
   Body: { query: "stripe.com", type: "domain" }

2. Cloud Function → Cloud SQL:
   SELECT * FROM ai_records 
   WHERE entity_type = 'domain' 
     AND entity_id = 'stripe.com'
     AND cache_valid_until > NOW()
   
3a. IF CACHE HIT (record exists, cache valid):
    → Return cached data immediately
    → Log: "CACHE HIT - stripe.com (score: 95)"
    
3b. IF CACHE MISS (no record or expired):
    → Trigger fresh crawl
    → Update Cloud SQL with new data
    → Set cache_valid_until = NOW() + INTERVAL '24 hours'
    → Save raw crawl to Cloud Storage
    → Return fresh data

4. Frontend renders result
```

### User searches "Sam Altman" (person)
```
1. Frontend → Cloud Function: POST /api/search
   Body: { query: "Sam Altman", type: "person" }

2. Cloud Function → Cloud SQL:
   SELECT * FROM ai_records 
   WHERE entity_type = 'person' 
     AND entity_canonical = normalize('Sam Altman')
     AND cache_valid_until > NOW()
   
3. IF CACHE MISS:
    → Search LinkedIn, Twitter, GitHub, personal sites
    → Extract structured data (JSON-LD, hCard, etc.)
    → Calculate AI Readiness Score for person
    → Store in Cloud SQL with 24hr cache
    → Return result
```

---

## 📈 Scaling to 30M AI Records

### Current State (Firestore)
- ~2.4M domain records
- Cost: ~$50/month (read/write operations)
- Query time: 50-200ms

### Target State (Cloud SQL + Storage)
- 10M domains + 10M people + 10M products = **30M AI Records**
- Cost estimate:
  - Cloud SQL (db-n1-standard-4): $200/month
  - Cloud Storage (1TB): $20/month
  - Cloud Run indexer: $50/month
  - Discovery API costs: $50/month (Common Crawl free, Tranco free, GitHub API free tier)
  - SerpAPI: Variable based on usage (see projections below)
  - **Total: ~$320-$820/month** depending on search volume (vs $2,000+/month with Firestore at scale)

### SerpAPI Cost Projections by Growth Period

**Current Setup:**
- SerpAPI is the primary search provider for name searches
- Cloud Run Puppeteer scraper is blocked by Google (expected)
- Cost: $0.01 per search after free tier (100 searches/month)

**Month 0-3 (Testing/Launch):**
- Search volume: ~500 searches/month
- SerpAPI cost: $0 (free tier) + $4 for 400 searches
- Cache hit rate: ~10% (new index, few repeat searches)
- **Total SerpAPI: ~$4/month**

**Month 3-6 (Early Growth):**
- Search volume: ~2,000 searches/month
- SerpAPI cost: $50/month plan (covers 5,000 searches)
- Cache hit rate: ~20% (index growing, some repeat searches)
- Effective new searches: 1,600 (80% of 2,000)
- **Total SerpAPI: ~$50/month**

**Month 6-12 (Scaling):**
- Search volume: ~10,000 searches/month
- SerpAPI cost: $50/month base + $50 overage (5,000 additional searches)
- Cache hit rate: ~40% (mature index, more repeat searches)
- Effective new searches: 6,000 (60% of 10,000)
- **Total SerpAPI: ~$100/month**

**Month 12-18 (Maturity):**
- Search volume: ~50,000 searches/month
- SerpAPI cost: $50/month base + $450 overage (45,000 additional searches)
- Cache hit rate: ~70% (mature index, high cache efficiency)
- Effective new searches: 15,000 (30% of 50,000)
- **Total SerpAPI: ~$500/month**

**Post-18 Months (Native Search Transition):**
- Search volume: ~100,000+ searches/month
- Strategy: Transition to native search index (Common Crawl + Tranco + systematic crawling)
- SerpAPI usage: Reduced to 20% (fallback only for edge cases)
- Effective SerpAPI searches: 20,000 (20% of 100,000)
- **Total SerpAPI: ~$200/month** (declining as native index matures)

**Key Cost Drivers:**
- **Cache hit rate**: 70% hit rate = 70% cost reduction (mature index)
- **Native search index**: Phase 3 discovery eliminates SerpAPI dependency for systematic discovery
- **SerpAPI role transition**: Primary provider → Fallback for edge cases and new entity types
- **User-driven searches**: SerpAPI handles immediate user demand, native index handles systematic growth

**Total Infrastructure Cost Projection:**
- **Month 0-6**: $320-$370/month (base + low SerpAPI)
- **Month 6-12**: $420/month (base + medium SerpAPI)
- **Month 12-18**: $820/month (base + high SerpAPI)
- **Post-18**: $520/month (base + declining SerpAPI)

### Performance Targets
- Cache hit: < 50ms
- Cache miss (fresh crawl): 2-5 seconds
- Background re-index: 100 records/minute (with tiered TTL: 475/minute effective)
- Full index refresh: ~5 hours (30M / 100/min, but tiered TTL reduces load by 45%)

---

## 🚀 Migration Path

### Phase 1: Extend Firestore - DEPRECATED ⚠️

**DO NOT IMPLEMENT THIS PHASE.**

- ~~Add `entity_type` field to existing `index` collection~~
- ~~Create new collections: `people_index`, `products_index`~~
- ~~Keep 24hr cache logic~~

**Rationale for deprecation:**
- Migrating people/products records twice (Firestore → Cloud SQL) is wasted work
- Cloud SQL is required for scale (30M records)
- Better to implement people/products directly in Cloud SQL from the start

**Recommendation:** Skip Phase 1 entirely and go straight to Phase 2 (Cloud SQL migration).

---

### Phase 2: Cloud SQL Migration (2 weeks)

**Week 1: Setup and Migration Script**
- Set up Cloud SQL PostgreSQL instance
- Create `ai_records`, `cache_config`, `discovery_queue` tables
- Build migration script with validation logic
- Test migration on sample data

**Week 2: Execute Migration with 3-Stage Validation**

#### Stage 1: Export and Count Validation (Days 1-2)

**Critical: Verify no data loss during migration.**

```javascript
// 1. Export Firestore records
const firestoreSnapshot = await db.collection('index').get();
const firestoreCount = firestoreSnapshot.size;
console.log(`Firestore records: ${firestoreCount}`);

// 2. Migrate to Cloud SQL
await migrateToCloudSQL(firestoreSnapshot);

// 3. Count Cloud SQL records
const sqlCount = await sql`SELECT COUNT(*) FROM ai_records WHERE entity_type = 'domain'`;
console.log(`Cloud SQL records: ${sqlCount}`);

// 4. Verify counts match
if (firestoreCount !== sqlCount) {
  throw new Error(`Migration count mismatch: Firestore=${firestoreCount}, SQL=${sqlCount}`);
}
```

**Validation checklist:**
- [ ] Firestore export completed successfully
- [ ] Cloud SQL insert completed without errors
- [ ] Row counts match exactly (Firestore count = Cloud SQL count)
- [ ] Migration logs reviewed for warnings/errors

#### Stage 2: Spot-Check Validation (Days 3-4)

**Critical: Verify data integrity for critical fields.**

```javascript
// Pick 10 sample domains and verify data integrity
const sampleDomains = [
  'stripe.com', 'openai.com', 'anthropic.com', 'google.com', 'apple.com',
  'microsoft.com', 'amazon.com', 'netflix.com', 'spotify.com', 'github.com'
];

for (const domain of sampleDomains) {
  const firestoreDoc = await db.collection('index').doc(domain).get();
  const sqlRow = await sql`SELECT * FROM ai_records WHERE entity_id = ${domain}`;
  
  // Verify critical fields match
  assert(firestoreDoc.data().alphaRankScore === sqlRow.alpha_score, 
    `Score mismatch for ${domain}`);
  assert(JSON.stringify(firestoreDoc.data().machineProfile) === 
    JSON.stringify(sqlRow.machine_profile), 
    `Machine profile mismatch for ${domain}`);
  assert(firestoreDoc.data().grade === sqlRow.grade, 
    `Grade mismatch for ${domain}`);
  
  console.log(`✓ ${domain} verified`);
}
```

**Validation checklist:**
- [ ] All 10 sample domains exist in both databases
- [ ] Scores match exactly for all samples
- [ ] Machine profiles match (JSON comparison)
- [ ] Grades and grade classes match
- [ ] Timestamps are preserved correctly

#### Stage 3: Dual-Read Period (Days 5-9, 1 week)

**Critical: Run both databases in parallel to catch discrepancies before cutover.**

```javascript
// Query both databases and compare results
async function dualReadValidation(domain) {
  const [firestoreResult, sqlResult] = await Promise.all([
    getFromFirestore(domain),
    getFromCloudSQL(domain)
  ]);
  
  // Log any discrepancies
  if (firestoreResult.score !== sqlResult.score) {
    console.error(`Score mismatch for ${domain}: Firestore=${firestoreResult.score}, SQL=${sqlResult.score}`);
    await logDiscrepancy('score', domain, firestoreResult.score, sqlResult.score);
  }
  
  if (firestoreResult.grade !== sqlResult.grade) {
    console.error(`Grade mismatch for ${domain}: Firestore=${firestoreResult.grade}, SQL=${sqlResult.grade}`);
    await logDiscrepancy('grade', domain, firestoreResult.grade, sqlResult.grade);
  }
  
  // Return SQL result (new system)
  return sqlResult;
}

// Run dual-read for all production queries for 1 week
// Monitor logs for discrepancies
// Fix any issues before cutover
```

**Dual-read checklist:**
- [ ] Dual-read enabled for all `/api/check` requests
- [ ] Discrepancy logging configured
- [ ] Monitoring dashboard set up
- [ ] 1 week of dual-read completed (minimum 10,000 queries)
- [ ] Discrepancy rate < 0.1% (less than 1 in 1,000)
- [ ] All discrepancies investigated and resolved

#### Cutover Checklist (Day 10)

**Before cutover:**
- [ ] Row count validation passed (Firestore count = Cloud SQL count)
- [ ] Spot-check validation passed (10 sample domains verified)
- [ ] Dual-read period completed (1 week, < 0.1% discrepancies)
- [ ] Full backup of Firestore data created and stored
- [ ] Rollback plan documented and tested
- [ ] Cloud SQL connection pooling configured (min 5, max 20 connections)
- [ ] Cloud SQL read replicas set up (if needed for high traffic)
- [ ] Monitoring and alerts configured (query latency, error rate, connection pool)
- [ ] Team notified of cutover window (announce 24 hours in advance)
- [ ] Rollback trigger defined (> 5% error rate or > 2s p95 latency)

**During cutover:**
1. Enable maintenance mode (optional, for high-traffic sites)
2. Switch Cloud Functions to read from Cloud SQL only
3. Monitor error rates and latency for 1 hour
4. If issues: rollback to Firestore (< 5 minutes)
5. If stable: disable Firestore reads, keep as backup for 7 days

**After cutover:**
- [ ] Monitor for 24 hours (error rate, latency, cache hit rate)
- [ ] Verify all features working (domain check, name search, caching)
- [ ] Keep Firestore data for 7 days as backup
- [ ] After 7 days: archive Firestore data to Cloud Storage
- [ ] Update documentation to reflect Cloud SQL as primary database

**Without this validation strategy, you risk silent data loss during migration and won't know until a user reports a wrong score.**

---

### Phase 3: Build Background Indexer (1 week)
- Deploy Cloud Run service for automated re-indexing
- Implement tiered TTL logic (domains 24hr, people 7d, products 48hr)
- Set up Cloud Scheduler jobs (hourly)
- Implement Cloud Storage archival
- Monitor and optimize

### Phase 4: Build Discovery System (2 weeks)
- Implement Common Crawl domain index download (5GB files, not 100TB crawl)
- Implement Tranco list integration
- Set up discovery job (every 6 hours)
- Deploy to production

**Total migration: 7 weeks** (2 weeks migration + 1 week indexer + 2 weeks discovery + 2 weeks buffer)

---

## 🔐 Security & Access

### Cloud SQL
- Private IP only (no public access)
- Cloud Functions connect via Cloud SQL Proxy
- Encrypted at rest and in transit
- Automated backups (daily)

### Cloud Storage
- Private buckets (no public access)
- Signed URLs for temporary access
- Lifecycle policies for auto-deletion
- Versioning enabled

### API Rate Limiting
- 100 requests/minute per IP (free tier)
- 1,000 requests/minute per API key (paid tier)
- Implement in Cloud Functions with Redis cache

---

## 📊 Analytics & Monitoring

### Key Metrics
- **Index size**: Total AI Records by entity type
- **Cache hit rate**: % of searches served from cache
- **Crawl success rate**: % of successful crawls
- **Average score**: Mean Alpha Score across all entities
- **Search volume**: Searches per day/week/month
- **Top entities**: Most-searched domains/people/products

### Dashboards
- Cloud Monitoring (GCP native)
- Custom dashboard in Firebase Hosting
- Public stats page: `alphasearch.gridnetai.com/stats`

---

## 💡 Future Enhancements

### 1. Real-time Indexing
- Webhook subscriptions for entity changes
- Instant re-index when domain updates llms.txt

### 2. AI Agent API
- Direct API for AI agents to query the index
- MCP server for Claude/ChatGPT integration
- GraphQL endpoint for complex queries

### 3. Entity Relationships
- Link domains to people (founders, employees)
- Link products to domains (manufacturer websites)
- Build knowledge graph

### 4. Predictive Scoring
- ML model to predict future AI Readiness
- Trend analysis (improving vs declining)
- Recommendations engine

### 5. Competitive Intelligence
- Industry benchmarks (avg score by sector)
- Competitor comparison
- Market share of AI-ready entities

---

## 🎯 Success Metrics

### By Q2 2026
- ✅ 5M AI Records indexed
- ✅ 10K daily searches
- ✅ 95% cache hit rate
- ✅ < 100ms avg response time

### By Q4 2026
- ✅ 30M AI Records indexed
- ✅ 100K daily searches
- ✅ 98% cache hit rate
- ✅ < 50ms avg response time
- ✅ 1,000+ API customers

---

## 📝 Implementation Checklist

- [ ] Set up Cloud SQL PostgreSQL instance
- [ ] Create `ai_records` table with indexes
- [ ] Implement Cloud Storage bucket structure
- [ ] Build background indexer service (Cloud Run)
- [ ] Set up Cloud Scheduler jobs
- [ ] Migrate existing domain data from Firestore
- [ ] Implement person search & indexing
- [ ] Implement product search & indexing
- [ ] Add full-text search (PostgreSQL FTS)
- [ ] Build unified search API endpoint
- [ ] Update frontend to support all entity types
- [ ] Add entity type selector to UI
- [ ] Implement analytics dashboard
- [ ] Set up monitoring & alerts
- [ ] Load test with 1M+ records
- [ ] Document API for external developers

