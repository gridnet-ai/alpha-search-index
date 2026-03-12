# Alpha Search Index — Machine Web Crawler Factory

> **The data factory for the AI era.** Crawls and scores websites for AI readiness, building a public index of the machine web.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project: `alpha-search-index`

### Installation

```bash
# Clone the repository
git clone https://github.com/gridnet-ai/alpha-search-index.git
cd alpha-search-index

# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..

# Login to Firebase
firebase login

# Deploy Firestore rules and indexes
firebase deploy --only firestore
```

### Local Development

```bash
# Start Firebase emulators (Functions + Hosting + Firestore)
npm run serve

# Open in browser
# http://localhost:5000
```

### Deploy Cloud Run Service (Required for Name Search)

The name search feature requires a Cloud Run service for web scraping:

```powershell
# Windows (PowerShell) - Automated deployment
.\deploy-cloud-run.ps1

# Or manually:
cd scraper-service
gcloud run deploy alpha-search-scraper --source . --region us-central1 --platform managed --allow-unauthenticated --memory 2Gi --cpu 2 --timeout 60 --concurrency 5 --min-instances 1 --project alpha-search-index
```

See `CLOUD_RUN_DEPLOYMENT.md` for detailed instructions.

### Deploy to Production

```bash
# Deploy everything (Hosting + Functions + Firestore)
npm run deploy

# Or deploy individually:
npm run deploy:hosting
npm run deploy:functions
npm run deploy:firestore
```

## 📦 Project Structure

```
alpha-search-index/
├── functions/
│   ├── index.js          # Cloud Function API endpoints (/api/check, /api/search, /api/user/*)
│   ├── crawler.js        # Core crawl logic (parallel HTTP fetches)
│   ├── scraper.js        # Cloud Run integration for name search
│   ├── auth.js           # Firebase Auth middleware (verifyToken, attachUser)
│   ├── db/
│   │   ├── connection.js # Cloud SQL connection pooling
│   │   ├── sql.js        # SQL helper functions (upsertAiRecord, queryIndex, etc.)
│   │   ├── storage.js    # Cloud Storage integration (raw crawls, snapshots)
│   │   ├── users.js      # Firestore user profile management
│   │   ├── searchHistory.js # User search history management
│   │   ├── dual-read.js  # Dual-read validation module
│   │   └── schema.sql    # PostgreSQL database schema
│   ├── crawlers/
│   │   ├── person-crawler.js  # Person entity crawler (LinkedIn, GitHub, etc.)
│   │   └── product-crawler.js # Product entity crawler (schema.org, API docs)
│   └── package.json      # Functions dependencies
├── scraper-service/      # Cloud Run Puppeteer service
│   ├── index.js          # Puppeteer scraper (headless Chrome)
│   ├── Dockerfile        # Container definition
│   ├── package.json      # Service dependencies
│   └── README.md         # Service documentation
├── indexer-service/      # Cloud Run background indexer service
│   ├── index.js          # Background indexing (re-crawl, discover, snapshot)
│   ├── Dockerfile        # Container definition
│   ├── package.json      # Service dependencies
│   └── README.md         # Service documentation
├── scripts/
│   ├── setup-cloud-sql.sh       # Cloud SQL provisioning script
│   ├── setup-gcs-buckets.sh     # GCS bucket creation script
│   ├── migrate-firestore-to-sql.js # Firestore to Cloud SQL migration
│   ├── validate-migration.js    # Migration spot-check validation
│   ├── deploy-indexer.sh        # Cloud Run indexer deployment
│   └── setup-cloud-scheduler.sh # Cloud Scheduler job creation
├── public/
│   ├── index.html        # Public URL checker + name search interface
│   ├── llms.txt          # AI readiness indicator
│   ├── robots.txt        # Crawler guidance
│   ├── sitemap.xml       # Site map
│   └── favicon.svg       # Site icon
├── docs/
│   ├── ALPHA_SEARCH_DESIGN_GUIDE.md # Complete UI/UX design documentation
│   └── alpha-search-index-cursor-prompt.md
├── deploy-cloud-run.ps1  # Automated Cloud Run deployment (Windows)
├── deploy-cloud-run.sh   # Automated Cloud Run deployment (Linux/Mac)
├── test-cloud-run.js     # Cloud Run service test script
├── READY_FOR_DEPLOYMENT.md # Final deployment readiness checklist ⭐
├── PRE_FLIGHT_CHECKLIST.md # Step-by-step deployment verification ⭐
├── VERIFICATION_SUMMARY.md # Pre-flight verification answers ⭐
├── DEPLOYMENT_QUICK_START.md # Fast-track deployment guide ⭐
├── BACKEND_DEPLOYMENT_GUIDE.md # Comprehensive deployment guide
├── ALPHA_INDEX_ARCHITECTURE.md # System architecture documentation
├── ENVIRONMENT_SETUP.md  # Environment variable configuration
├── IMPLEMENTATION_COMPLETE.md # Implementation summary
├── BUILDING_YOUR_OWN_INDEX.md # Vision for native search index
├── GRIDNET_VISION.md     # Strategic vision document
├── FIREBASE_AUTH_SETUP.md # Firebase Auth setup guide
├── firebase.json         # Firebase configuration
├── .firebaserc           # Firebase project mapping
├── firestore.rules       # Firestore security rules (updated for user data)
├── firestore.indexes.json # Firestore indexes
└── package.json          # Root dependencies
```

**⭐ Start here for deployment:** `READY_FOR_DEPLOYMENT.md`

## 🔍 How It Works

### Two Query Modes

The public interface automatically detects whether you entered a **URL** or a **name**:

#### Mode 1: URL Check (e.g., `stripe.com`)

1. **User enters a URL** — The interface at `public/index.html` accepts any domain
2. **Server-side crawl** — Cloud Function `/api/check` performs parallel HTTP requests to:
   - `https://{domain}/llms.txt` — AI welcome file
   - `https://{domain}/.well-known/mcp` — MCP endpoint
   - `https://{domain}/openapi.json` — OpenAPI spec
   - `https://{domain}/` — Homepage (for JSON-LD)
3. **Alpha Rank Score calculation** — See scoring formula below
4. **Firestore storage** — Results cached for 24 hours
5. **Display score card** — Shows AI readiness score and grade

#### Mode 2: Name Search (e.g., `Michael Jordan`)

1. **User enters a name** — Person, company, or brand name
2. **Web search** — Cloud Run Puppeteer service scrapes Google for top 10 pages
3. **Parallel crawling** — Each page is crawled and scored using the same `/api/check` logic
4. **Aggregate score** — Average AI readiness across all pages
5. **Display results** — Aggregate card + individual page cards

### Alpha Rank Score Calculation

**Locked scoring formula:**
```
JSON-LD present     → +10 pts
llms.txt present    → +12 pts
OpenAPI present     → +13 pts
MCP endpoint live   → +15 pts
Domain resolves     → +8 pts
────────────────────────────
Max from crawl: 58 pts
```

**Grade thresholds:**
```
90–100 → AI Native
70–89  → AI Ready
50–69  → Machine Ready
30–49  → Listed
0–29   → Not AI Ready
```

### Firestore Storage

**URL checks** are stored in `/index/{domain}` collection with:
- Alpha Rank Score
- Grade tier
- Machine profile (JSON-LD, llms.txt, OpenAPI, MCP)
- Verification status
- Crawl timestamps

**Name searches** are stored in `/name_searches/{id}` collection with:
- Query (name searched)
- Total pages found
- Average score
- Grade
- Result domains

### 24-Hour Cache

Fresh crawls are cached for 24 hours. Subsequent checks return cached results instantly.

## 🎨 Design System

All UI follows the **Alpha Browser Design Guide** (`docs/DESIGN_GUIDE.md`):

- **Background:** `#e8eaf0` (search PWA variant)
- **Fonts:** DM Sans (UI) + DM Mono (labels/data)
- **Shadows:** Neumorphic depth system (raised, inset, flat)
- **Reverse UZ flow:** Default = raised, hover/focus = inset
- **No external libraries:** Pure HTML/CSS/JS

## 📊 Firestore Schema

### `/index/{domainId}` — Public index

```javascript
{
  domain: "stripe.com",
  alphaRankScore: 93,
  grade: "AI Native",
  gradeClass: "ai-native",
  machineProfile: {
    jsonLd: true,
    llmsTxt: true,
    openApi: true,
    mcp: true
  },
  verification: {
    resolves: true,
    crawlVerified: true,
    claimedByOwner: false
  },
  firstCrawled: Timestamp,
  lastCrawled: Timestamp,
  crawlCount: 1
}
```

### `/submissions/{submissionId}` — Audit trail

```javascript
{
  domain: "stripe.com",
  submittedAt: Timestamp,
  status: "verified"
}
```

## 🔒 Security

- **Firestore rules:** Public read on `/index`, function-only write
- **CORS enabled:** All origins allowed for public API
- **Rate limiting:** Implemented via Firebase (future enhancement)
- **Admin SDK:** Server-side only, never exposed to client

## 🛠 API Reference

### `POST /api/check`

Check a single URL for AI readiness.

**Request:**
```json
{
  "url": "stripe.com"
}
```

**Response:**
```json
{
  "domain": "stripe.com",
  "score": 93,
  "grade": "AI Native",
  "gradeClass": "ai-native",
  "machineProfile": {
    "jsonLd": true,
    "llmsTxt": true,
    "openApi": true,
    "mcp": true,
    "resolves": true
  },
  "cached": false
}
```

**Error response:**
```json
{
  "error": "Failed to crawl domain",
  "message": "Timeout after 8000ms"
}
```

### `POST /api/search`

Search for a name and score all pages where it appears.

**Request:**
```json
{
  "query": "Michael Jordan"
}
```

**Response:**
```json
{
  "query": "Michael Jordan",
  "totalPages": 8,
  "avgScore": 61,
  "grade": "Machine Ready",
  "gradeClass": "machine-ready",
  "results": [
    {
      "domain": "nba.com",
      "pageTitle": "Michael Jordan Stats",
      "pageUrl": "https://www.nba.com/player/893/michael-jordan",
      "score": 73,
      "grade": "AI Ready",
      "gradeClass": "ai-ready",
      "machineProfile": {
        "jsonLd": true,
        "llmsTxt": false,
        "openApi": true,
        "mcp": false,
        "resolves": true
      },
      "fromCache": false
    }
  ]
}
```

## 📈 Monitoring

```bash
# View Cloud Function logs
npm run logs

# Or via Firebase Console
firebase functions:log
```

## 🌐 Production URL

**Hosting:** `https://alpha-search-index.web.app`  
**API:** `https://alpha-search-index.web.app/api/check`

## 🔗 Product Family

- **Alpha Search Index** (this project) — The factory
- **Alpha Search** — Queries the index ([search.gridnetai.com](https://search.gridnetai.com))
- **Alpha Browser** — Desktop app powered by Alpha Search
- **Gridnet** — Infrastructure layer ([gridnetai.com](https://gridnetai.com))

## 📝 License

Proprietary — Gridnet AI / Layer 0 Internal Use

---

## 🚀 Backend Infrastructure Deployment

**New:** Complete backend infrastructure with Cloud SQL, Cloud Storage, and background indexing.

### Quick Start

1. **Review deployment readiness:** `READY_FOR_DEPLOYMENT.md`
2. **Follow pre-flight checklist:** `PRE_FLIGHT_CHECKLIST.md`
3. **Execute deployment:** `DEPLOYMENT_QUICK_START.md`

### Infrastructure Components

- **Cloud SQL PostgreSQL 15:** Unified `ai_records` index with 7 entity types
- **Cloud Storage:** Raw crawl data (90d), snapshots (30d), analytics
- **Cloud Run Indexer:** Background re-crawling and discovery queue processing
- **Cloud Scheduler:** Automated jobs for maintenance and discovery
- **Firebase Auth:** User authentication and search history tracking

### Deployment Status

- ✅ All code complete (7,413 lines)
- ✅ Pre-flight verification complete
- ✅ Deployment scripts ready
- ⏳ Infrastructure provisioning pending (manual execution)

**Total deployment time:** ~90 minutes + 1 week dual-read period

---

**Maintained by:** Gridnet AI  
**Last Updated:** March 12, 2026  
**Status:** Production Ready (Frontend) | Ready for Deployment (Backend Infrastructure)
