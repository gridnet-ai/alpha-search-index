---
name: Build Full Backend Infrastructure
overview: "Implement all backend phases (2-5) for Alpha Search Index: Cloud SQL migration with 3-stage validation, background indexer with tiered TTL, people/products crawlers, and user-driven discovery via SerpAPI. Total timeline: 7 weeks."
todos:
  - id: setup-cloud-sql
    content: Set up Cloud SQL PostgreSQL instance in GCP
    status: pending
  - id: create-schema
    content: Create database schema with ai_records, cache_config, discovery_queue
    status: pending
  - id: install-deps
    content: Install Cloud SQL connector and pg dependencies
    status: pending
  - id: create-connection
    content: Create Cloud SQL connection module
    status: pending
  - id: build-migration
    content: Build Firestore to SQL migration script with validation
    status: pending
  - id: run-migration
    content: Execute migration and verify counts
    status: pending
  - id: implement-dual-read
    content: Implement dual-read logic for validation period
    status: pending
  - id: cutover-sql
    content: Cutover to Cloud SQL after validation
    status: pending
  - id: build-indexer
    content: Create background indexer Cloud Run service
    status: pending
  - id: deploy-indexer
    content: Deploy indexer and set up Cloud Scheduler
    status: pending
  - id: person-crawler
    content: Implement person crawler with LinkedIn/GitHub detection
    status: pending
  - id: product-crawler
    content: Implement product crawler with Amazon/schema.org
    status: pending
  - id: user-driven-discovery
    content: Update name search to store results in discovery_queue
    status: pending
---

# Build Full Backend Infrastructure for Alpha Search Index

## Overview

Implement the complete backend infrastructure for Alpha Search Index, migrating from Firestore to Cloud SQL and building the foundation for scaling to 30M AI Records. This plan implements Phases 2-5 with a **user-driven discovery strategy** where every SerpAPI cache miss passively builds the index.

**Total Timeline**: 7 weeks

**Current State**: Firestore with 2.4M domain records, SerpAPI integration working

**Target State**: Cloud SQL with tiered TTL, background indexer, people/products support, user-driven index growth

---

## Discovery Strategy: User-Driven Index Building

### The Elegant Approach

**Every search on Alpha Search that's a cache miss triggers a SerpAPI call. That result gets stored as an AI Record. Users worldwide are passively building the index.**

**Key Benefits:**

1. **Self-selecting quality**: Index only entities people actually search for
2. **Zero crawl costs**: Users fund discovery through their searches
3. **Organic growth**: Cache hit rate climbs as index fills (10% → 70% by month 12)
4. **No wasted work**: Don't crawl random domains nobody cares about

**Implementation:**

- Keep current SerpAPI integration for name searches
- Every cache miss → SerpAPI call → store result as AI Record
- Cache hits cost $0, cache misses cost $0.01
- Common Crawl discovery deferred to month 12+ (when index is mature)

---

## Phase 2: Cloud SQL Migration (2 weeks)

### Week 1: Setup and Migration Script

#### Task 2.1: Set up Cloud SQL PostgreSQL Instance

**GCP Console Steps:**

1. Navigate to Cloud SQL in GCP Console
2. Create new PostgreSQL instance:

   - **Instance ID**: `alpha-search-index-db`
   - **PostgreSQL version**: 15
   - **Region**: `us-central1` (same as Cloud Run/Functions)
   - **Machine type**: `db-n1-standard-2` (2 vCPU, 7.5GB RAM) - start small, scale later
   - **Storage**: 100GB SSD, auto-increase enabled
   - **Backups**: Automated daily backups, 7-day retention
   - **High availability**: Disabled initially (enable in production)
   - **Private IP**: Enable (connect via Cloud SQL Proxy)
   - **Public IP**: Disable (security)

**Estimated cost**: ~$100/month (scales to $200/month at full load)

#### Task 2.2: Create Database Schema

**File**: `functions/db/schema.sql`

```sql
-- Main AI Records table
CREATE TABLE ai_records (
  -- Identity
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL DEFAULT 'domain',
  entity_id VARCHAR(500) NOT NULL,
  entity_canonical VARCHAR(500),
  
  -- AI Readiness Score
  alpha_score INTEGER,
  grade VARCHAR(50),
  grade_class VARCHAR(50),
  
  -- Machine Profile
  machine_profile JSONB,
  
  -- Source Attribution
  entity_source JSONB,
  
  -- Metadata
  first_indexed TIMESTAMP DEFAULT NOW(),
  last_indexed TIMESTAMP DEFAULT NOW(),
  index_count INTEGER DEFAULT 1,
  cache_valid_until TIMESTAMP,
  cache_ttl_hours INTEGER DEFAULT 24,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  claimed_by_user_id VARCHAR(128),
  
  -- Search
  search_vector TSVECTOR,
  
  UNIQUE(entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_entity_type ON ai_records(entity_type);
CREATE INDEX idx_cache_valid ON ai_records(cache_valid_until);
CREATE INDEX idx_alpha_score ON ai_records(alpha_score DESC);
CREATE INDEX idx_search_vector ON ai_records USING GIN(search_vector);
CREATE INDEX idx_last_indexed ON ai_records(last_indexed DESC);
CREATE INDEX idx_entity_source ON ai_records USING GIN(entity_source);
CREATE INDEX idx_cache_ttl ON ai_records(cache_ttl_hours);

-- Cache configuration table
CREATE TABLE cache_config (
  entity_type VARCHAR(20) PRIMARY KEY,
  ttl_hours INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO cache_config VALUES
  ('domain', 24, 'Domains change frequently', NOW()),
  ('person', 168, 'People profiles change slowly - 7 days', NOW()),
  ('product', 48, 'Products change moderately', NOW());

-- Discovery queue table
CREATE TABLE discovery_queue (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_id VARCHAR(500) NOT NULL,
  priority_score INTEGER DEFAULT 50,
  discovered_at TIMESTAMP DEFAULT NOW(),
  discovery_source VARCHAR(100),
  discovery_phase INTEGER,
  indexed BOOLEAN DEFAULT FALSE,
  indexed_at TIMESTAMP,
  
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_priority ON discovery_queue(priority_score DESC, indexed);
CREATE INDEX idx_discovery_source ON discovery_queue(discovery_source);
CREATE INDEX idx_indexed ON discovery_queue(indexed) WHERE indexed = FALSE;
```

#### Task 2.3: Install Cloud SQL Dependencies

**File**: `functions/package.json` (add dependencies)

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.9.0",
    "google-auth-library": "^10.6.1",
    "@google-cloud/sql-connector": "^1.0.0",
    "pg": "^8.11.0"
  }
}
```

Run: `cd functions && npm install`

#### Task 2.4: Create Cloud SQL Connection Module

**File**: `functions/db/connection.js`

```javascript
const { Connector } = require('@google-cloud/sql-connector');
const pg = require('pg');

const connector = new Connector();
let pool = null;

async function getPool() {
  if (pool) return pool;
  
  const clientOpts = await connector.getOptions({
    instanceConnectionName: 'alpha-search-index:us-central1:alpha-search-index-db',
    ipType: 'PRIVATE'
  });
  
  pool = new pg.Pool({
    ...clientOpts,
    user: 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'alpha_search',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  
  return pool;
}

async function query(text, params) {
  const pool = await getPool();
  return pool.query(text, params);
}

module.exports = { getPool, query };
```

#### Task 2.5: Build Migration Script

**File**: `functions/scripts/migrate-firestore-to-sql.js`

```javascript
const admin = require('firebase-admin');
const { query } = require('../db/connection');

admin.initializeApp();
const db = admin.firestore();

async function migrateFirestoreToSQL() {
  console.log('Starting Firestore → Cloud SQL migration...');
  
  // Stage 1: Export and Count Validation
  console.log('\n=== Stage 1: Export and Count Validation ===');
  
  const snapshot = await db.collection('index').get();
  const firestoreCount = snapshot.size;
  console.log(`Firestore records: ${firestoreCount}`);
  
  let migratedCount = 0;
  const batchSize = 100;
  const docs = snapshot.docs;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (doc) => {
      const data = doc.data();
      
      await query(`
        INSERT INTO ai_records (
          entity_type, entity_id, entity_canonical,
          alpha_score, grade, grade_class,
          machine_profile,
          first_indexed, last_indexed, index_count,
          cache_valid_until, cache_ttl_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (entity_type, entity_id) DO UPDATE SET
          alpha_score = EXCLUDED.alpha_score,
          grade = EXCLUDED.grade,
          last_indexed = EXCLUDED.last_indexed,
          index_count = EXCLUDED.index_count
      `, [
        'domain',
        doc.id,
        doc.id.toLowerCase(),
        data.alphaRankScore,
        data.grade,
        data.gradeClass,
        JSON.stringify(data.machineProfile),
        data.firstCrawled?.toDate() || new Date(),
        data.lastCrawled?.toDate() || new Date(),
        data.crawlCount || 1,
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        24
      ]);
      
      migratedCount++;
    }));
    
    console.log(`Migrated ${migratedCount}/${firestoreCount} records...`);
  }
  
  // Verify count
  const result = await query('SELECT COUNT(*) FROM ai_records WHERE entity_type = $1', ['domain']);
  const sqlCount = parseInt(result.rows[0].count);
  
  console.log(`\nCloud SQL records: ${sqlCount}`);
  
  if (firestoreCount !== sqlCount) {
    throw new Error(`Count mismatch! Firestore=${firestoreCount}, SQL=${sqlCount}`);
  }
  
  console.log('✓ Stage 1 complete: Counts match');
  
  // Stage 2: Spot-check validation
  console.log('\n=== Stage 2: Spot-Check Validation ===');
  
  const sampleDomains = [
    'stripe.com', 'openai.com', 'anthropic.com', 'google.com', 'apple.com',
    'microsoft.com', 'amazon.com', 'netflix.com', 'spotify.com', 'github.com'
  ];
  
  for (const domain of sampleDomains) {
    const firestoreDoc = await db.collection('index').doc(domain).get();
    const sqlResult = await query(
      'SELECT * FROM ai_records WHERE entity_id = $1',
      [domain]
    );
    
    if (!firestoreDoc.exists || sqlResult.rows.length === 0) {
      console.log(`⚠ ${domain} not found in one or both databases`);
      continue;
    }
    
    const firestoreData = firestoreDoc.data();
    const sqlData = sqlResult.rows[0];
    
    if (firestoreData.alphaRankScore !== sqlData.alpha_score) {
      throw new Error(`Score mismatch for ${domain}`);
    }
    
    console.log(`✓ ${domain} verified`);
  }
  
  console.log('\n✓ Stage 2 complete: Spot-check passed');
  console.log('\n🎉 Migration complete! Ready for Stage 3 (dual-read period)');
}

migrateFirestoreToSQL().catch(console.error);
```

### Week 2: Execute Migration with 3-Stage Validation

#### Task 2.6: Run Migration (Days 1-2)

```bash
# Set database password
export DB_PASSWORD="your-secure-password"

# Run migration script
node functions/scripts/migrate-firestore-to-sql.js
```

**Checklist:**

- [ ] Firestore export completed
- [ ] Cloud SQL insert completed
- [ ] Row counts match
- [ ] Spot-check passed (10 domains)

#### Task 2.7: Implement Dual-Read Logic (Days 3-4)

**File**: `functions/db/dual-read.js`

```javascript
const admin = require('firebase-admin');
const { query } = require('./connection');

const db = admin.firestore();
const discrepancies = [];

async function dualReadDomain(domain) {
  const [firestoreResult, sqlResult] = await Promise.all([
    getFromFirestore(domain),
    getFromSQL(domain)
  ]);
  
  // Compare results
  if (firestoreResult && sqlResult) {
    if (firestoreResult.score !== sqlResult.alpha_score) {
      const discrepancy = {
        domain,
        field: 'score',
        firestore: firestoreResult.score,
        sql: sqlResult.alpha_score,
        timestamp: new Date()
      };
      discrepancies.push(discrepancy);
      console.error(`Score mismatch for ${domain}:`, discrepancy);
    }
  }
  
  // Return SQL result (new system)
  return sqlResult;
}

async function getFromFirestore(domain) {
  const doc = await db.collection('index').doc(domain).get();
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    domain: doc.id,
    score: data.alphaRankScore,
    grade: data.grade,
    machineProfile: data.machineProfile
  };
}

async function getFromSQL(domain) {
  const result = await query(
    'SELECT * FROM ai_records WHERE entity_id = $1',
    [domain]
  );
  
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

function getDiscrepancies() {
  return discrepancies;
}

module.exports = { dualReadDomain, getDiscrepancies };
```

#### Task 2.8: Enable Dual-Read in Production (Days 5-9)

Update `functions/index.js` to use dual-read:

```javascript
const { dualReadDomain } = require('./db/dual-read');

// In handleCheck function, replace Firestore read with dual-read
const cachedResult = await dualReadDomain(domain);
```

**Monitor for 1 week:**

- [ ] 10,000+ queries processed
- [ ] Discrepancy rate < 0.1%
- [ ] All discrepancies investigated

#### Task 2.9: Cutover to Cloud SQL (Day 10)

**Cutover checklist:**

- [ ] Dual-read completed (1 week)
- [ ] Discrepancy rate < 0.1%
- [ ] Full Firestore backup created
- [ ] Rollback plan documented
- [ ] Connection pooling configured
- [ ] Monitoring configured

**Update `functions/index.js`:**

```javascript
const { query } = require('./db/connection');

async function handleCheck(req, res) {
  // ... validation ...
  
  // Check Cloud SQL cache
  const result = await query(
    'SELECT * FROM ai_records WHERE entity_id = $1 AND cache_valid_until > NOW()',
    [domain]
  );
  
  if (result.rows.length > 0) {
    const data = result.rows[0];
    console.log(`✓ CACHE HIT for ${domain} - score ${data.alpha_score}`);
    
    return res.json({
      domain: data.entity_id,
      score: data.alpha_score,
      grade: data.grade,
      gradeClass: data.grade_class,
      machineProfile: data.machine_profile,
      cached: true
    });
  }
  
  // Fresh crawl
  const crawlResult = await crawlDomain(domain);
  
  // Get TTL from cache_config
  const ttlResult = await query(
    'SELECT ttl_hours FROM cache_config WHERE entity_type = $1',
    ['domain']
  );
  const ttlHours = ttlResult.rows[0].ttl_hours;
  const cacheValidUntil = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  
  // Insert into Cloud SQL
  await query(`
    INSERT INTO ai_records (
      entity_type, entity_id, alpha_score, grade, grade_class,
      machine_profile, cache_valid_until, cache_ttl_hours
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
      alpha_score = EXCLUDED.alpha_score,
      last_indexed = NOW(),
      index_count = ai_records.index_count + 1,
      cache_valid_until = EXCLUDED.cache_valid_until
  `, [
    'domain', domain, crawlResult.score, crawlResult.grade,
    crawlResult.gradeClass, JSON.stringify(crawlResult.machineProfile),
    cacheValidUntil, ttlHours
  ]);
  
  return res.json(crawlResult);
}
```

---

## Phase 3: Background Indexer (1 week)

### Task 3.1: Create Indexer Cloud Run Service

**File**: `indexer-service/index.js`

```javascript
const express = require('express');
const { query } = require('./db/connection');
const { crawlDomain } = require('./crawler');

const app = express();
app.use(express.json());

app.post('/reindex', async (req, res) => {
  try {
    // Get expired records
    const result = await query(`
      SELECT entity_type, entity_id, cache_ttl_hours
      FROM ai_records
      WHERE cache_valid_until < NOW()
      ORDER BY last_indexed ASC
      LIMIT 100
    `);
    
    console.log(`Found ${result.rows.length} expired records`);
    
    const reindexed = [];
    
    for (const record of result.rows) {
      try {
        const crawlResult = await crawlDomain(record.entity_id);
        const cacheValidUntil = new Date(Date.now() + record.cache_ttl_hours * 60 * 60 * 1000);
        
        await query(`
          UPDATE ai_records
          SET alpha_score = $1,
              grade = $2,
              machine_profile = $3,
              last_indexed = NOW(),
              cache_valid_until = $4,
              index_count = index_count + 1
          WHERE entity_id = $5
        `, [
          crawlResult.score,
          crawlResult.grade,
          JSON.stringify(crawlResult.machineProfile),
          cacheValidUntil,
          record.entity_id
        ]);
        
        reindexed.push(record.entity_id);
      } catch (error) {
        console.error(`Failed to reindex ${record.entity_id}:`, error);
      }
    }
    
    res.json({
      processed: result.rows.length,
      reindexed: reindexed.length,
      entities: reindexed
    });
  } catch (error) {
    console.error('Reindex error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Indexer service listening on port ${PORT}`);
});
```

### Task 3.2: Deploy Indexer Service

```bash
cd indexer-service
gcloud run deploy alpha-search-indexer \
  --source . \
  --region us-central1 \
  --platform managed \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10
```

### Task 3.3: Set up Cloud Scheduler

```bash
# Create scheduler job
gcloud scheduler jobs create http reindex-domains \
  --schedule="0 * * * *" \
  --uri="https://alpha-search-indexer-xxx.run.app/reindex" \
  --http-method=POST \
  --oidc-service-account-email=alpha-search-index@appspot.gserviceaccount.com \
  --location=us-central1
```

---

## Phase 4: People & Products Crawlers (2 weeks)

### Week 1: Person Crawler

**File**: `functions/crawlers/person-crawler.js`

```javascript
// Implement person crawling logic
// - LinkedIn profile detection
// - GitHub profile detection
// - Personal website detection
// - Calculate person AI readiness score
```

### Week 2: Product Crawler

**File**: `functions/crawlers/product-crawler.js`

```javascript
// Implement product crawling logic
// - Amazon product page detection
// - Schema.org/Product parsing
// - Calculate product AI readiness score
```

### Update API Endpoints

Add `/api/person` and `/api/product` endpoints to `functions/index.js`.

---

## Phase 5: User-Driven Discovery (1 week)

### Task 5.1: Update Name Search to Store Results

**Current behavior**: Name search calls SerpAPI → crawls domains → returns results

**New behavior**: Name search calls SerpAPI → crawls domains → **stores in discovery_queue** → returns results

**File**: `functions/index.js` (update `handleNameSearch`)

```javascript
async function handleNameSearch(req, res) {
  // ... existing search logic ...
  
  // After crawling domains, store in discovery_queue
  for (const page of uniquePages) {
    const domain = extractDomain(page.url);
    
    await query(`
      INSERT INTO discovery_queue (
        entity_type, entity_id, priority_score,
        discovery_source, discovery_phase
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (entity_type, entity_id) DO NOTHING
    `, ['domain', domain, 90, 'user_submission', 3]);
  }
  
  // ... return results ...
}
```

**Key insight**: Every user search that's a cache miss triggers SerpAPI, and the discovered entities are stored with priority 90 (highest). The index builds itself based on what users actually search for.

---

## Success Criteria

- [ ] Cloud SQL instance running with all tables created
- [ ] 2.4M Firestore records migrated to Cloud SQL with 100% accuracy
- [ ] Dual-read period completed with < 0.1% discrepancies
- [ ] Cloud Functions reading from Cloud SQL with < 50ms cache hit latency
- [ ] Background indexer running hourly, processing 100 records/minute
- [ ] Tiered TTL caching implemented (domains 24hr, people 7d, products 48hr)
- [ ] People and products crawlers implemented and tested
- [ ] User-driven discovery storing entities in discovery_queue
- [ ] SerpAPI integration working with cache hit rate tracking
- [ ] Monitoring and alerts configured for all services

---

## Cost Projection

**Month 1-3 (Post-Implementation):**

- Cloud SQL: $100/month
- Cloud Run (indexer): $30/month
- SerpAPI: $4/month (low volume)
- **Total**: ~$134/month

**Month 6-12 (Growth):**

- Cloud SQL: $150/month
- Cloud Run (indexer): $50/month
- SerpAPI: $100/month (10K searches, 40% cache hit)
- **Total**: ~$300/month

**Month 12-18 (Maturity):**

- Cloud SQL: $200/month
- Cloud Run (indexer): $50/month
- SerpAPI: $500/month (50K searches, 70% cache hit)
- **Total**: ~$750/month

**Revenue should outpace costs by month 6.**