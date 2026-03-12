---
name: Alpha Search Ultimate Backend
overview: Complete backend infrastructure for Alpha Search Index. Combines Table-Per-Type PostgreSQL schema (7 entity types converging into the alpha_search_index unified view), Firebase Auth + user accounts, Firestore search history, Cloud SQL via Google Cloud SQL Connector, 3-stage migration with dual-read validation, GCS raw crawl archival, tiered TTL caching, background indexer, user-driven discovery via SerpAPI, and all API endpoints. DO NOT overwrite existing working code — extend and migrate via dual-write then cutover.
todos:
  - id: firebase-auth
    content: Enable Firebase Auth (email/password + Google OAuth), create verifyToken and attachUser middleware
    status: completed
  - id: firestore-user-collections
    content: Create Firestore users/{uid} profile + users/{uid}/searches + users/{uid}/saved collections with security rules
    status: completed
  - id: install-deps
    content: Install pg, @google-cloud/sql-connector, @google-cloud/storage, firebase-admin in functions/package.json
    status: completed
  - id: cloud-sql-provision
    content: Provision Cloud SQL PostgreSQL 15 instance (alpha-search-index-db, db-n1-standard-2, us-central1, 100GB SSD, private IP only)
    status: pending
  - id: cloud-sql-connection
    content: Create functions/db/connection.js using @google-cloud/sql-connector with connection pooling
    status: completed
  - id: cloud-sql-base-schema
    content: Create ai_records base table, cache_config (7 entity types), discovery_queue — run schema.sql
    status: completed
  - id: cloud-sql-type-tables
    content: Create all 7 type tables — record_domains, record_people, record_products, record_organizations, record_agents, record_models, record_datasets
    status: completed
  - id: cloud-sql-index-view
    content: Create alpha_search_index unified view — UNION ALL of all 7 type tables joined to ai_records
    status: completed
  - id: cloud-sql-upsert-function
    content: Create upsert_ai_record() PostgreSQL function and fn_update_search_vector trigger
    status: completed
  - id: cloud-storage-buckets
    content: Create GCS buckets alpha-search-raw-crawls (90d), alpha-search-snapshots (30d), alpha-search-analytics
    status: pending
  - id: env-config
    content: Set all env vars in .env and deploy firebase functions:config:set for Cloud SQL + GCS
    status: completed
  - id: build-migration-script
    content: Build scripts/migrate-firestore-to-sql.js with 3-stage validation (count check, spot-check, dual-read)
    status: completed
  - id: run-migration
    content: Execute migration script — must reach 0 count mismatch and 0 score mismatches before proceeding
    status: pending
  - id: dual-read-module
    content: Build functions/db/dual-read.js — parallel read from Firestore + Cloud SQL, log discrepancies
    status: completed
  - id: dual-read-period
    content: Enable dual-read in production for 1 week — target <0.1% discrepancy rate before cutover
    status: pending
  - id: cutover-sql
    content: Cutover to Cloud SQL primary reads, disable Firestore writes to index collection
    status: pending
  - id: extend-api-check
    content: Extend /api/check to write domain AI Records to ai_records + record_domains + GCS raw crawl
    status: completed
  - id: extend-api-search
    content: Extend /api/search to write person AI Records to ai_records + record_people after SerpAPI returns
    status: completed
  - id: api-index-query
    content: Build new /api/index/query endpoint reading directly from alpha_search_index view
    status: completed
  - id: api-user-endpoints
    content: Build /api/user/profile, /api/user/history, /api/user/saved endpoints with Firebase Auth
    status: completed
  - id: person-crawler
    content: Build functions/crawlers/person-crawler.js — LinkedIn/GitHub/Wikipedia detection + person alpha score
    status: completed
  - id: product-crawler
    content: Build functions/crawlers/product-crawler.js — Amazon/schema.org/Product detection + product alpha score
    status: completed
  - id: background-indexer
    content: Build indexer-service/index.js Cloud Run service with /reindex, /index/people, /discover, /snapshot routes
    status: completed
  - id: deploy-indexer
    content: Deploy indexer Cloud Run service (alpha-search-indexer, us-central1, 1Gi RAM, no public auth)
    status: pending
  - id: cloud-scheduler
    content: Create Cloud Scheduler jobs — reindex-domains (hourly), reindex-people (:15), discover (6hr), snapshot (3am)
    status: completed
  - id: user-driven-discovery
    content: Update /api/search to add discovered entities to discovery_queue at priority 85-90 after every SerpAPI call
    status: completed
  - id: security-rules
    content: Deploy updated Firestore security rules — user data locked to UID, index collection public read only
    status: completed
---

# Alpha Search — Ultimate Backend Architecture

## Context — What Already Exists (DO NOT OVERWRITE)

```
Cloud Run:       alpha-search-scraper     Puppeteer — keep as fallback
Cloud Functions: apiHandler               /api/check + /api/search — WORKING
Firestore:       index collection         2.4M domain records, 24hr cache — KEEP LIVE
Firebase:        Hosting                  alphasearch.gridnetai.com — LIVE
SerpAPI:         name search provider     active, keep running
```

**Iron rule:** All new infrastructure is additive. Existing endpoints stay live throughout. Migration uses dual-write then dual-read then cutover — never a hard swap.

---

## Naming Convention (locked)

| Layer | Name |

|---|---|

| Product | Alpha Search |

| Unified database view | `alpha_search_index` |

| Base table | `ai_records` |

| Type tables | `record_domains` · `record_people` · `record_products` · `record_organizations` · `record_agents` · `record_models` · `record_datasets` |

| Score field | `alpha_score` (0–100) |

| Primary read endpoint | `/api/index/query` |

| Record concept | AI Record |

| Entity types | `domain` · `person` · `product` · `organization` · `agent` · `model` · `dataset` |

---

## Database Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                    alpha_search_index  (VIEW)                    ║
║  The product. Every API read, search, and analytic query        ║
║  goes here. UNION ALL of all 7 type tables + ai_records base.   ║
╚═════╤═══════════╤══════════╤════════════╤═══════════╤═══════════╝
      │           │          │            │           │
 ┌────▼────┐ ┌────▼───┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐  ...
 │ record_ │ │record_ │ │ record_ │ │ record_ │ │ record_ │
 │ domains │ │ people │ │products │ │  orgs   │ │ agents  │
 └────┬────┘ └────┬───┘ └────┬────┘ └────┬────┘ └────┬────┘
      │           │          │            │           │
      └───────────┴──────────┼────────────┴───────────┘
                             │    also: record_models, record_datasets
                    ┌────────▼──────────┐
                    │    ai_records     │
                    │   (BASE TABLE)    │
                    │                   │
                    │ id                │
                    │ entity_type       │
                    │ entity_id         │
                    │ alpha_score       │
                    │ grade             │
                    │ entity_source     │
                    │ cache_valid_until │
                    │ cache_ttl_hours   │
                    │ search_vector     │
                    └───────────────────┘
```

**Supporting tables:**

- `cache_config` - TTL per entity type (24h / 48h / 168h)
- `discovery_queue` - Entities waiting to be crawled, with priority scores

**User data (Firestore — separate from index):**

- `users/{uid}` - Profile, plan, search counts
- `users/{uid}/searches/{id}` - Full search history per user
- `users/{uid}/saved/{id}` - Saved AI Records per user

---

## Discovery Strategy: User-Driven Index Building

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

## Implementation Phases (7 weeks)

### Phase 1: Foundation & Auth (Week 1)

#### 1.1 Enable Firebase Authentication

- Enable Email/Password + Google OAuth in Firebase Console
- Create [`functions/auth.js`](functions/auth.js) with `verifyToken` and `attachUser` middleware

#### 1.2 Set up Firestore User Collections

- Create `users/{uid}` profile structure
- Create `users/{uid}/searches/{id}` history structure
- Create `users/{uid}/saved/{id}` saved records structure
- Update [`firestore.rules`](firestore.rules) with user data security

#### 1.3 Install Dependencies

```bash
cd functions && npm install \
  pg \
  @google-cloud/sql-connector \
  @google-cloud/storage
```

### Phase 2: Cloud SQL Setup (Week 2)

#### 2.1 Provision Cloud SQL Instance

```bash
gcloud sql instances create alpha-search-index-db \
  --database-version=POSTGRES_15 \
  --tier=db-n1-standard-2 \
  --region=us-central1 \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --no-assign-ip \
  --network=default
```

#### 2.2 Create Database Schema

- Create [`functions/db/schema.sql`](functions/db/schema.sql) with:
  - `ai_records` base table
  - All 7 `record_*` type tables (domains, people, products, organizations, agents, models, datasets)
  - `cache_config` table with 7 entity types
  - `discovery_queue` table
  - `alpha_search_index` unified VIEW
  - `upsert_ai_record()` PostgreSQL function
  - `fn_update_search_vector()` trigger

#### 2.3 Create Connection Module

- Create [`functions/db/connection.js`](functions/db/connection.js) using `@google-cloud/sql-connector`
- Implement connection pooling (max 20 connections)

#### 2.4 Create SQL Helper Functions

- Create [`functions/db/sql.js`](functions/db/sql.js) with:
  - `upsertAiRecord()` - Write any AI Record atomically
  - `queryIndex()` - Read from alpha_search_index with cache awareness
  - `searchIndex()` - Full-text search across all entity types
  - `addToDiscoveryQueue()` - Add discovered entities

### Phase 3: Migration (Week 3)

#### 3.1 Build Migration Script

- Create [`scripts/migrate-firestore-to-sql.js`](scripts/migrate-firestore-to-sql.js)
- Stage 1: Export Firestore → Insert Cloud SQL → Count validation
- Stage 2: Spot-check 10 sample domains for data integrity

#### 3.2 Execute Migration

```bash
export DB_PASSWORD="your-secure-password"
node scripts/migrate-firestore-to-sql.js
```

- **Must achieve**: Firestore count = Cloud SQL count (0 mismatch)
- **Must achieve**: 10/10 spot-check pass (0 score mismatches)

#### 3.3 Implement Dual-Read

- Create [`functions/db/dual-read.js`](functions/db/dual-read.js)
- Query both Firestore + Cloud SQL in parallel
- Log discrepancies for monitoring

#### 3.4 Dual-Read Period (1 week)

- Enable dual-read in production
- Monitor for 1 week minimum
- **Target**: < 0.1% discrepancy rate (less than 1 in 1,000 queries)
- **Requirement**: 10,000+ queries processed before cutover

#### 3.5 Cutover

- Switch Cloud Functions to read from Cloud SQL only
- Disable Firestore writes to `index` collection
- Keep Firestore data as backup for 7 days

### Phase 4: Extend API Endpoints (Week 4)

#### 4.1 Update `/api/check` (Domain Crawler)

- Add dual-write to Cloud SQL (`ai_records` + `record_domains`)
- Add raw crawl archival to GCS
- Add to `discovery_queue` at priority 90
- Save to user search history if authenticated

#### 4.2 Update `/api/search` (Name Search)

- Add dual-write to Cloud SQL (`ai_records` + `record_people`)
- Add raw crawl archival to GCS
- Add discovered entities to `discovery_queue` at priority 85
- Add all domains from SerpAPI results to `discovery_queue`
- Save to user search history if authenticated

#### 4.3 Create `/api/index/query`

- New endpoint reading from `alpha_search_index` view
- Support by ID: `?type=domain&id=stripe.com`
- Support full-text search: `?q=Sam+Altman&type=person`
- Support cross-entity search: `?q=MCP+agent`

#### 4.4 Create User Endpoints

- `GET /api/user/profile` - Get/create user profile
- `GET /api/user/history` - Get search history (last 50)
- `POST /api/user/saved` - Save an AI Record
- `GET /api/user/saved` - Get saved AI Records

### Phase 5: Crawlers & Indexer (Weeks 5-6)

#### 5.1 Build Person Crawler

- Create [`functions/crawlers/person-crawler.js`](functions/crawlers/person-crawler.js)
- Detect LinkedIn, GitHub, Wikipedia, personal site
- Check for agent card at `/.well-known/agent.json`
- Calculate person alpha score (0-100)
- Write to `ai_records` + `record_people`

#### 5.2 Build Product Crawler

- Create [`functions/crawlers/product-crawler.js`](functions/crawlers/product-crawler.js)
- Detect schema.org/Product markup
- Check for API docs, pricing, inventory, reviews
- Calculate product alpha score (0-100)
- Write to `ai_records` + `record_products`

#### 5.3 Build Background Indexer Service

- Create [`indexer-service/index.js`](indexer-service/index.js)
- `POST /reindex` - Re-crawl expired records (100 at a time)
- `POST /index/people` - Re-crawl expired people specifically
- `POST /discover` - Process discovery queue by priority
- `POST /snapshot` - Daily stats snapshot to GCS

#### 5.4 Deploy Indexer

```bash
cd indexer-service
gcloud run deploy alpha-search-indexer \
  --source . \
  --region us-central1 \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --timeout 300
```

#### 5.5 Set up Cloud Scheduler

- `reindex-domains` - Every hour (`0 * * * *`)
- `reindex-people` - Every hour at :15 (`15 * * * *`)
- `discover` - Every 6 hours (`0 */6 * * *`)
- `snapshot` - Daily at 3am (`0 3 * * *`)

### Phase 6: Cloud Storage (Week 7)

#### 6.1 Create GCS Buckets

```bash
gsutil mb -l us-central1 gs://alpha-search-raw-crawls
gsutil mb -l us-central1 gs://alpha-search-snapshots
gsutil mb -l us-central1 gs://alpha-search-analytics
```

#### 6.2 Set Lifecycle Policies

- Raw crawls: Auto-delete after 90 days
- Snapshots: Auto-delete after 30 days
- Analytics: Indefinite retention

#### 6.3 Create Storage Module

- Create [`functions/db/storage.js`](functions/db/storage.js)
- `saveRawCrawl()` - Archive raw crawl data by date and entity type

### Phase 7: Final Integration (Week 7)

#### 7.1 User-Driven Discovery

- Verify every SerpAPI call adds entities to `discovery_queue`
- Verify priority scoring: user_submission=90, serp_api_result=85
- Monitor discovery queue growth

#### 7.2 Deploy Security Rules

- Deploy updated [`firestore.rules`](firestore.rules)
- User data locked to UID owner
- Legacy `index` collection: public read, function write only

#### 7.3 Environment Configuration

- Set all Cloud SQL connection vars
- Set GCS bucket names
- Deploy via `firebase functions:config:set`

---

## Database Schema Summary

### Base Table: `ai_records`

- One row per AI Record
- Shared fields only (no type-specific columns)
- Every entity has a row here + a row in its type table

### Type Tables (7 total)

1. **`record_domains`** - Websites, APIs (TTL: 24hr)

   - `llms_txt`, `json_ld`, `open_api`, `mcp`, `robots_txt`, `sitemap`

2. **`record_people`** - Professionals, creators (TTL: 168hr / 7 days)

   - `linkedin_url`, `github_url`, `wikipedia_url`, `personal_site`, `agent_card`

3. **`record_products`** - Physical goods, software (TTL: 48hr)

   - `schema_org_product`, `api_available`, `pricing_structured`, `inventory_api`

4. **`record_organizations`** - Companies, nonprofits (TTL: 168hr)

   - `legal_name`, `industry`, `llms_txt`, `mcp_server`, `json_ld_org`

5. **`record_agents`** - AI agents, MCP servers (TTL: 24hr)

   - `agent_card_url`, `mcp_endpoint`, `capabilities`, `model_provider`

6. **`record_models`** - AI models (TTL: 168hr)

   - `model_name`, `provider`, `context_window`, `modalities`, `open_weights`

7. **`record_datasets`** - Training data, benchmarks (TTL: 168hr)

   - `dataset_name`, `schema_org_dataset`, `croissant_format`, `size_gb`

### Unified View: `alpha_search_index`

- UNION ALL of all 7 type tables + `ai_records`
- **This IS the product** - all queries go here
- Product name = database object name

---

## Tiered TTL Caching

| Entity Type | TTL | Rationale |

|---|---|---|

| domain | 24 hours | APIs/docs change frequently |

| person | 168 hours (7 days) | Profiles change slowly |

| product | 48 hours | Pricing/inventory updates |

| organization | 168 hours | Company data stable |

| agent | 24 hours | Capabilities change frequently |

| model | 168 hours | Model specs stable |

| dataset | 168 hours | Dataset metadata stable |

**Impact at 30M records:**

- Flat 24hr for all: 1.25M re-crawls/day = 867/minute
- Tiered TTL: 685K/day = 475/minute
- **45% reduction in re-crawl load**

---

## Cost Projection

| Service | Current | After Build | Month 6-12 | Month 12-18 |

|---|---|---|---|---|

| Firestore | ~$50/mo | ~$30/mo | ~$30/mo | ~$30/mo |

| Cloud SQL | $0 | ~$100/mo | ~$150/mo | ~$200/mo |

| Cloud Storage | $0 | ~$5/mo | ~$10/mo | ~$20/mo |

| Cloud Run (indexer) | $0 | ~$30/mo | ~$50/mo | ~$50/mo |

| SerpAPI | ~$4/mo | ~$4/mo | ~$100/mo | ~$500/mo |

| **Total** | **~$54/mo** | **~$169/mo** | **~$340/mo** | **~$800/mo** |

**Key insights:**

- Revenue should outpace costs by month 6
- SerpAPI cost declines post-month 18 as cache hit rate reaches 70%
- At 30M records: still 3-5x cheaper than Firestore-only

---

## Success Criteria

- [ ] Firebase Auth working (email/password + Google OAuth)
- [ ] User profile created on first login
- [ ] Every authenticated search saved to Firestore history
- [ ] Domain crawls write to `ai_records` + `record_domains`
- [ ] Person searches write to `ai_records` + `record_people`
- [ ] `alpha_search_index` returns unified records for all 7 entity types
- [ ] `/api/index/query` reads from `alpha_search_index`
- [ ] 2.4M Firestore records migrated with 100% accuracy
- [ ] Dual-read period complete: < 0.1% discrepancy rate
- [ ] Cutover complete: Cloud SQL is primary
- [ ] Background indexer re-crawls expired records hourly
- [ ] Every SerpAPI result adds to `discovery_queue` at priority 85
- [ ] Raw crawls archived to GCS
- [ ] User endpoints live: `/api/user/profile`, `/api/user/history`, `/api/user/saved`
- [ ] Firestore rules: user data locked to UID owner

---

## Key Files to Create/Modify

**New files:**

- `functions/auth.js` - Firebase Auth middleware
- `functions/db/connection.js` - Cloud SQL connector
- `functions/db/schema.sql` - Complete database schema
- `functions/db/sql.js` - SQL helper functions
- `functions/db/users.js` - User profile management
- `functions/db/searchHistory.js` - Search history management
- `functions/db/storage.js` - GCS archival
- `functions/db/dual-read.js` - Migration validation
- `functions/crawlers/person-crawler.js` - Person crawler
- `functions/crawlers/product-crawler.js` - Product crawler
- `indexer-service/index.js` - Background indexer
- `scripts/migrate-firestore-to-sql.js` - Migration script
- `scripts/validate-migration.js` - Spot-check validation

**Modified files:**

- `functions/index.js` - Add new endpoints, extend existing
- `functions/package.json` - Add new dependencies
- `firestore.rules` - Add user data security rules

---

## Execution Order (Strict Sequence)

1. Enable Firebase Auth (email/password + Google)
2. Create Firestore user collections + security rules
3. Install npm dependencies (pg, sql-connector, storage)
4. Provision Cloud SQL PostgreSQL 15 instance
5. Create Cloud SQL connection module
6. Run schema.sql (base + 7 type tables + view + function)
7. Create GCS buckets with lifecycle policies
8. Set environment variables
9. Build migration script with 3-stage validation
10. Execute migration (must pass count + spot-check)
11. Implement dual-read module
12. Enable dual-read in production (1 week minimum)
13. Cutover to Cloud SQL
14. Extend `/api/check` with dual-write
15. Extend `/api/search` with dual-write
16. Create `/api/index/query` endpoint
17. Create `/api/user/*` endpoints
18. Build person crawler
19. Build product crawler
20. Build background indexer service
21. Deploy indexer to Cloud Run
22. Set up Cloud Scheduler jobs
23. Verify user-driven discovery
24. Deploy final security rules