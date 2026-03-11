# Alpha Search Puppeteer Scraper Service

This is a Cloud Run service that uses Puppeteer to scrape Google search results. It's deployed as a separate containerized service and called by the Firebase Cloud Function.

## Why This Exists

Google's search results page requires JavaScript execution to render. Simple HTTP scraping doesn't work because:
- Results are dynamically loaded via JavaScript
- Google detects and blocks simple HTTP scrapers
- CAPTCHA challenges appear frequently

This service runs a real headless browser (Chromium via Puppeteer) to execute JavaScript and extract rendered results.

## Architecture

```
Firebase Cloud Function → Cloud Run Service → Google Search → Results
```

The Cloud Function calls this service via HTTP POST, and this service returns structured JSON results.

## API

### POST /search

**Request**:
```json
{
  "query": "Michael Jordan"
}
```

**Response**:
```json
{
  "results": [
    {
      "link": "https://www.nba.com/player/893/michael-jordan",
      "title": "Michael Jordan Stats, Height, Weight, Position, Draft Status...",
      "snippet": "Michael Jordan is a former professional basketball player..."
    }
  ]
}
```

**Response Format**:
- `results`: Array of search result objects
- `link`: Full URL of the result
- `title`: Page title from search result
- `snippet`: Description/snippet from search result

**Status Codes**:
- `200`: Success, results returned (may be empty array)
- `400`: Bad request (missing or invalid query)
- `500`: Server error (Puppeteer crash, timeout, etc.)

### GET /health

Health check endpoint.

**Response**:
```json
{
  "status": "ok"
}
```

## Local Development

### Prerequisites
- Node.js 20+
- Chrome/Chromium installed

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm start
```

Server runs on port 8080 (or PORT environment variable).

### Test Locally
```bash
curl -X POST http://localhost:8080/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

## Deployment

### Prerequisites
- gcloud CLI installed and authenticated
- GCP project: `alpha-search-index`
- Billing enabled
- Cloud Run API enabled

### Deploy Command

From this directory:

```bash
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

### Automated Deployment

Use the deployment scripts in the project root:

**PowerShell (Windows)**:
```powershell
cd ..
.\deploy-cloud-run.ps1
```

**Bash (Linux/Mac)**:
```bash
cd ..
./deploy-cloud-run.sh
```

## Configuration

### Resource Settings

- **Memory**: 2Gi (Chrome needs RAM, 512MB will crash)
- **CPU**: 2 vCPU (Chrome needs compute power)
- **Timeout**: 60s (page load + JS execution takes time)
- **Concurrency**: 5 (limit Chrome instances per container)
- **Min Instances**: 1 (keeps one warm, avoids 15-30s cold starts)

### Environment Variables

None required. All configuration is in the code.

## How It Works

1. Receives POST request with search query
2. Launches headless Chromium via Puppeteer
3. Sets random user agent from pool of 8 real browser UAs
4. Adds random delay (800-2000ms) to avoid detection
5. Navigates to Google search URL
6. Waits for page to render (JavaScript execution)
7. Extracts results from rendered DOM using selectors
8. Returns up to 10 results as JSON
9. Closes browser

## Anti-Detection Measures

- **User Agent Rotation**: 8 different real browser user agents
- **Random Delays**: 800-2000ms delay before each request
- **Real Browser**: Puppeteer executes actual JavaScript
- **Realistic Headers**: Accept-Language, Accept, etc.
- **Viewport Settings**: 1280x800 (common desktop resolution)

## Selectors

The service extracts results using these DOM selectors:

- Result containers: `div.g`, `div[data-hveid]`
- Links: `a[href]`
- Titles: `h3`
- Snippets: `div[data-sncf]`, `div.VwiC3b`, `span.aCOpRe`, `div[style="-webkit-line-clamp:2"]`

**Note**: Google frequently changes its HTML structure. If results stop appearing, check Cloud Run logs and update selectors in `index.js`.

## Monitoring

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

### View Metrics
https://console.cloud.google.com/run/detail/us-central1/alpha-search-scraper/metrics?project=alpha-search-index

## Troubleshooting

### No Results Returned

**Possible causes**:
- Google blocked the request (CAPTCHA)
- Selectors outdated (Google changed HTML)
- Page load timeout

**Debug**:
1. Check logs for errors
2. Test locally with same query
3. Verify selectors still match Google's HTML

### Out of Memory Errors

**Cause**: Chrome crashed due to insufficient memory

**Solution**:
- Verify `--memory 2Gi` in deployment
- Check for memory leaks (browser not closing)
- Reduce `--concurrency` if multiple requests hit simultaneously

### Timeout Errors

**Cause**: Page load took too long

**Solution**:
- Increase `--timeout` in deployment
- Check network latency
- Verify `--min-instances 1` to avoid cold starts

### Google Blocks

**Symptoms**: Empty results, CAPTCHA pages

**Solutions**:
1. Deploy to multiple regions (IP diversity)
2. Add VPC + Cloud NAT with rotating IPs
3. Increase random delays
4. Add more user agents

## Cost

### Cloud Run Pricing (us-central1)

With `--min-instances 1` (always-on):
- 2 vCPU × 730 hours/month × $0.0864/vCPU-hour = **$126.14**
- 2 GiB × 730 hours/month × $0.0090/GiB-hour = **$13.14**
- **Total**: ~$138/month

Per-search cost (above free tier):
- Average: 3-5 seconds execution
- **~$0.0003 per search**

### Comparison
- SerpAPI: $0.005 per search
- This service: $0.0003 per search
- **94% cheaper per search**

### Free Tier
- $300 GCP credits (90 days for new accounts)
- Covers ~2 months of always-on instance

## Security

### Current State
- ✅ Service is public (`--allow-unauthenticated`)
- ✅ No API key required
- ⚠️ Anyone with URL can call it

### Future Hardening
1. Add Cloud Run authentication (service account from Cloud Function)
2. Add rate limiting (Cloud Armor)
3. Add VPC egress with static IPs
4. Add request logging and monitoring

**Don't implement these yet.** Ship basic version first, measure block rate, then harden.

## Maintenance

### Updating Selectors

If Google changes its HTML structure:

1. Edit `index.js`
2. Update selectors in `page.evaluate()` section
3. Test locally
4. Redeploy: `gcloud run deploy alpha-search-scraper --source .`

### Updating Dependencies

```bash
npm update
npm audit fix
```

Then redeploy.

### Rollback

If a deployment breaks:

```bash
gcloud run services update-traffic alpha-search-scraper \
  --to-revisions=alpha-search-scraper-00001-abc=100 \
  --region us-central1 \
  --project alpha-search-index
```

(Replace `00001-abc` with previous revision ID)

## Integration

This service is called by the Firebase Cloud Function in `../functions/scraper.js`.

The Cloud Function:
1. Reads `SCRAPER_URL` from environment
2. POSTs query to `${SCRAPER_URL}/search`
3. Receives results: `{results: [{link, title, snippet}]}`
4. Maps to downstream format: `[{url, title, description}]`
5. Crawls each domain and scores for AI readiness

## Files

- `index.js` - Main service code (~180 lines)
- `package.json` - Dependencies (express, puppeteer)
- `Dockerfile` - Container definition
- `.dockerignore` - Build exclusions
- `README.md` - This file

## Support

- **Deployment Guide**: `../CLOUD_RUN_DEPLOYMENT.md`
- **Quick Start**: `../IMMEDIATE_NEXT_STEPS.md`
- **Test Script**: `../test-cloud-run.js`
- **Cloud Function**: `../functions/scraper.js`

---

**This service is production-ready. Deploy and test!** 🚀
