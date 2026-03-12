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
  
  -- Metadata
  first_indexed TIMESTAMP DEFAULT NOW(),
  last_indexed TIMESTAMP DEFAULT NOW(),
  index_count INTEGER DEFAULT 1,
  cache_valid_until TIMESTAMP,     -- 24hr cache expiry
  
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
```

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
│  4. Set cache_valid_until = NOW() + 24 hours           │
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

# Job 4: Discover new entities (from submissions, trending searches)
0 */6 * * *  # Every 6 hours
→ Triggers: /api/indexer/discover
```

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
  - **Total: ~$270/month** (vs $2,000+/month with Firestore at scale)

### Performance Targets
- Cache hit: < 50ms
- Cache miss (fresh crawl): 2-5 seconds
- Background re-index: 100 records/minute
- Full index refresh: ~5 hours (30M / 100/min)

---

## 🚀 Migration Path

### Phase 1: Extend Firestore (Current)
- Add `entity_type` field to existing `index` collection
- Create new collections: `people_index`, `products_index`
- Keep 24hr cache logic
- **Timeline**: 1 week

### Phase 2: Implement Cloud SQL
- Set up PostgreSQL database
- Create unified `ai_records` table
- Migrate existing Firestore data
- Run dual-write (Firestore + SQL) for validation
- **Timeline**: 2 weeks

### Phase 3: Build Background Indexer
- Deploy Cloud Run service for automated re-indexing
- Set up Cloud Scheduler jobs
- Implement Cloud Storage archival
- **Timeline**: 1 week

### Phase 4: Cutover
- Switch all reads to Cloud SQL
- Deprecate Firestore writes
- Monitor performance and costs
- **Timeline**: 1 week

**Total migration: ~5 weeks**

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

