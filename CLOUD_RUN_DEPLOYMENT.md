# Cloud Run Puppeteer Scraper - Complete Deployment Guide

## Architecture Overview

```
User → Firebase Hosting → /api/search (Cloud Function)
                              ↓
                         Cloud Run Service
                         (Puppeteer + Chrome)
                              ↓
                         google.com/search
                              ↓
                         Returns 10 results
                              ↓
                    Back to Cloud Function
                    → crawl + score each domain
                    → return to user
```

## Why Cloud Run + Puppeteer?

Google's search results page requires JavaScript execution to render. Simple HTTP scraping doesn't work because:
- Results are dynamically loaded via JS
- Google detects and blocks simple HTTP scrapers
- CAPTCHA challenges appear frequently

**Solution**: Run a real headless browser (Chromium via Puppeteer) in a Cloud Run container.

## Service Structure

### `scraper-service/index.js`
- Express server with POST `/search` endpoint
- Puppeteer launches headless Chrome
- User agent rotation (8 different UAs)
- Random delays (800-2000ms) to avoid detection
- Extracts 10 results from rendered DOM
- Returns JSON: `{ results: [{link, title, snippet}] }`

### `scraper-service/Dockerfile`
- Base: `node:20-slim`
- Installs Chromium + dependencies
- Configures Puppeteer to use system Chrome
- Optimized for Cloud Run (no sandbox, single process)

### `scraper-service/package.json`
- `express` - HTTP server
- `puppeteer` - Headless browser control

## Deployment Configuration

### Resource Settings
```bash
--memory 2Gi       # Chrome needs RAM (512MB will crash)
--cpu 2            # Chrome needs CPU
--timeout 60       # Page load + JS execution takes time
--concurrency 5    # Don't run too many Chrome instances per container
--min-instances 1  # Keep one instance warm (avoid cold starts)
```

### Why `--min-instances 1`?
- Cold start with Puppeteer + Chrome: **15-30 seconds**
- User waiting 25 seconds for first result = bad UX
- Cost: ~$138/month (covered by $300 GCP free credits for 90 days)
- Alternative: Accept cold starts, set to 0, save $138/month

### Why `--allow-unauthenticated`?
- Called from Cloud Functions (internal HTTP)
- Adding auth adds latency and complexity
- **Future**: Add Cloud Run authentication once basic flow works

## Deployment Steps

### Prerequisites
1. GCP project: `alpha-search-index`
2. Billing enabled
3. APIs enabled:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API

### Enable APIs (if not already)
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Deploy Command
```bash
cd C:\alpha-search-index\scraper-service

gcloud run deploy alpha-search-scraper \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 5 \
  --min-instances 1 \
  --project alpha-search-index
```

**What happens:**
1. gcloud builds a container image from the Dockerfile
2. Pushes image to Artifact Registry
3. Deploys to Cloud Run
4. Returns service URL

**Time**: 5-10 minutes

### After Deployment
You'll see output like:
```
Building using Dockerfile and uploading it to Artifact Registry...
✓ Building and deploying... Done.
  ✓ Uploading sources...
  ✓ Building Container...
  ✓ Creating Revision...
  ✓ Routing traffic...
Done.
Service [alpha-search-scraper] revision [alpha-search-scraper-00001-abc] has been deployed and is serving 100 percent of traffic.
Service URL: https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app
```

**Copy the Service URL!**

## Integration with Cloud Function

### Update `functions/.env`
```env
SCRAPER_URL=https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app
```

### How It Works
1. User searches for "Michael Jordan" in UI
2. Frontend calls `/api/search` (Cloud Function)
3. Cloud Function calls `googleSearch(query)` from `functions/scraper.js`
4. `googleSearch()` makes HTTP POST to Cloud Run service
5. Cloud Run launches Puppeteer, scrapes Google, returns results
6. Cloud Function receives results: `[{link, title, snippet}]`
7. **Critical mapping**: Converts to `[{url, title, description}]`
8. Cloud Function crawls each domain, scores for AI readiness
9. Returns aggregate score + individual page scores to UI

### The Critical Mapping
Cloud Run returns:
```json
{
  "results": [
    {"link": "https://...", "title": "...", "snippet": "..."}
  ]
}
```

Downstream code expects:
```json
[
  {"url": "https://...", "title": "...", "description": "..."}
]
```

**This mapping happens in `functions/scraper.js`:**
```javascript
const results = (data.results || []).map(r => ({
  url: r.link,        // link → url
  title: r.title,
  description: r.snippet  // snippet → description
}));
```

**If this mapping is missing, the entire scoring pipeline breaks silently.**

## Testing

### Test Cloud Run Service Directly
```bash
curl -X POST https://your-cloud-run-url/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Terry French San Antonio founder"}'
```

Expected response:
```json
{
  "results": [
    {
      "link": "https://www.linkedin.com/in/...",
      "title": "Terry French - LinkedIn",
      "snippet": "Founder & CEO at Gridnet..."
    }
  ]
}
```

### Test via Node Script
```bash
set SCRAPER_URL=https://your-cloud-run-url
node test-cloud-run.js
```

Expected output:
```
=== Cloud Run Scraper Test ===

Testing: https://your-cloud-run-url/search

Sending request...
Response received in 3245ms

✅ SUCCESS: 10 results returned

Showing first 3 results:

1. Terry French - LinkedIn
   Link: https://www.linkedin.com/in/...
   Snippet: Founder & CEO...
```

### Test End-to-End
1. Update `functions/.env` with `SCRAPER_URL`
2. Restart Firebase dev server: `firebase serve --only "functions,hosting"`
3. Go to http://localhost:5000
4. Search for: `Michael Jordan`
5. Should see:
   - Loading message: "Searching for Michael Jordan..."
   - Then: "Found X pages · Scoring each one..."
   - Aggregate score card
   - Individual page cards

## Monitoring & Debugging

### View Logs
```bash
gcloud run logs read alpha-search-scraper \
  --project alpha-search-index \
  --region us-central1 \
  --limit 50
```

### Check Service Status
```bash
gcloud run services describe alpha-search-scraper \
  --project alpha-search-index \
  --region us-central1
```

### Common Issues

#### Issue: "No results returned"
**Cause**: Google blocked the request (CAPTCHA)
**Solution**: 
- Check logs for block detection
- Verify user agent rotation is working
- Consider multi-region deployment

#### Issue: "Timeout after 30s"
**Cause**: Cold start or slow page load
**Solution**:
- Increase timeout in Cloud Function call
- Verify `--min-instances 1` is set
- Check Cloud Run logs for startup time

#### Issue: "Out of memory"
**Cause**: Chrome crashed
**Solution**:
- Verify `--memory 2Gi` is set
- Check for memory leaks (browser not closing)
- Reduce `--concurrency` if multiple requests hit at once

## Cost Analysis

### Cloud Run Pricing (us-central1)
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million

### With `--min-instances 1` (always-on)
- 2 vCPU × 730 hours/month × $0.0864/vCPU-hour = **$126.14**
- 2 GiB × 730 hours/month × $0.0090/GiB-hour = **$13.14**
- **Total**: ~$138/month

### Per-Search Cost (above free tier)
- Average search: 3 seconds
- 2 vCPU × 3s × $0.000024 = $0.000144
- 2 GiB × 3s × $0.0000025 = $0.000015
- **Total per search**: ~$0.0003

### Comparison to SerpAPI
- SerpAPI: $0.005 per search
- Cloud Run: $0.0003 per search
- **Savings**: 94% cheaper per search

### Free Tier Coverage
- $300 GCP credits (90 days)
- Covers ~2 months of always-on instance
- After credits: $138/month + $0.0003 per search

## Multi-Region Deployment (Optional)

Deploy to multiple regions for:
- IP diversity (harder for Google to block)
- Lower latency (closer to users)
- Higher availability

### Deploy to Additional Regions
```bash
# us-east1
gcloud run deploy alpha-search-scraper \
  --source . \
  --region us-east1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 5 \
  --min-instances 1 \
  --project alpha-search-index

# us-west1
gcloud run deploy alpha-search-scraper \
  --source . \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 5 \
  --min-instances 1 \
  --project alpha-search-index
```

### Update Cloud Function for Load Balancing
In `functions/.env`:
```env
SCRAPER_URLS=https://scraper-us-central1.a.run.app,https://scraper-us-east1.a.run.app,https://scraper-us-west1.a.run.app
```

In `functions/scraper.js`:
```javascript
const SCRAPER_URLS = (process.env.SCRAPER_URLS || process.env.SCRAPER_URL || '')
  .split(',')
  .filter(Boolean);

function getScraperUrl() {
  if (SCRAPER_URLS.length === 0) return null;
  return SCRAPER_URLS[Math.floor(Math.random() * SCRAPER_URLS.length)];
}
```

**Cost**: 3× regions = ~$414/month (covered by free credits for first month)

## Security Considerations

### Current State
- ✅ Service is public (`--allow-unauthenticated`)
- ✅ No API key required
- ⚠️ Anyone with URL can call it

### Future Hardening
1. **Add Cloud Run authentication**
   - Cloud Function uses service account
   - Blocks external calls
   
2. **Rate limiting**
   - Cloud Armor (WAF)
   - Limit requests per IP
   
3. **VPC egress**
   - Route through Cloud NAT
   - Use static IPs
   - Rotate IPs across regions

**Don't implement these yet.** Ship basic version first, measure block rate, then harden.

## Fallback Chain

The Cloud Function tries search providers in order:
1. **Cloud Run Puppeteer** (primary)
2. Google Custom Search API (if configured)
3. SerpAPI (if configured)

If all fail, returns empty results (UI shows "No pages found").

## Updating the Service

### After Code Changes
```bash
cd C:\alpha-search-index\scraper-service
gcloud run deploy alpha-search-scraper \
  --source . \
  --region us-central1 \
  --project alpha-search-index
```

(Other flags are preserved from previous deployment)

### Rollback to Previous Version
```bash
gcloud run services update-traffic alpha-search-scraper \
  --to-revisions=alpha-search-scraper-00001-abc=100 \
  --region us-central1 \
  --project alpha-search-index
```

## Success Criteria

✅ Cloud Run service returns 5-10 results for common queries
✅ Response time < 10 seconds (warm instance)
✅ Response time < 30 seconds (cold start)
✅ Name search works in UI without SerpAPI key
✅ Falls back gracefully if Cloud Run is down
✅ Logs show successful scrapes, not blocks

## Next Steps After Deployment

1. Monitor block rate in Cloud Run logs
2. If blocks > 20%, add multi-region deployment
3. If blocks > 50%, add VPC + Cloud NAT
4. If blocks persist, add Alpha Browser node network (future)

---

**Everything is ready. Run the deploy command and you're live!** 🚀
