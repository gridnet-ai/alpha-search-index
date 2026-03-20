# 🚀 Cloud Run Deployment Checklist

Use this checklist to deploy the Puppeteer scraper service step-by-step.

## Pre-Deployment Checklist

- [ ] GCP authentication working
  ```bash
  gcloud auth application-default set-quota-project alpha-search-index
  ```
  Should complete without errors.

- [ ] Correct project set
  ```bash
  gcloud config get-value project
  ```
  Should show: `alpha-search-index`

- [ ] Required APIs enabled
  ```bash
  gcloud services enable run.googleapis.com
  gcloud services enable cloudbuild.googleapis.com
  gcloud services enable artifactregistry.googleapis.com
  ```

- [ ] Billing enabled on project
  Visit: https://console.cloud.google.com/billing?project=alpha-search-index

## Deployment Steps

### Step 1: Deploy Cloud Run Service

- [ ] Navigate to service directory
  ```bash
  cd C:\alpha-search-index\scraper-service
  ```

- [ ] Run deployment command
  ```bash
  gcloud run deploy alpha-search-scraper --source . --region us-central1 --platform managed --allow-unauthenticated --memory 2Gi --cpu 2 --timeout 60 --concurrency 5 --min-instances 1 --project alpha-search-index
  ```

- [ ] Wait for deployment (5-10 minutes)
  You'll see:
  - Building container image
  - Pushing to Artifact Registry
  - Creating Cloud Run revision
  - Routing traffic

- [ ] Copy the Service URL
  Look for: `Service URL: https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app`
  
  **Your URL**: `_________________________________`

### Step 2: Configure Environment

- [ ] Open `C:\alpha-search-index\functions\.env`

- [ ] Add SCRAPER_URL (replace with your actual URL)
  ```
  SCRAPER_URL=https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app
  ```

- [ ] Save the file

### Step 3: Test Cloud Run Service

- [ ] Set environment variable for test
  ```bash
  set SCRAPER_URL=https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app
  ```

- [ ] Run test script
  ```bash
  cd C:\alpha-search-index
  node test-cloud-run.js
  ```

- [ ] Verify output shows: `✅ SUCCESS: X results returned`

### Step 4: Restart Firebase Dev Server

- [ ] Stop current Firebase server
  - Press `Ctrl+C` in the terminal where it's running

- [ ] Restart with environment
  ```bash
  cd C:\alpha-search-index
  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\alpha-search-index\alpha-search-index-firebase-adminsdk-fbsvc-430e5d950f.json"
  firebase serve --only "functions,hosting"
  ```

- [ ] Wait for server to start
  Look for: `Local server: http://localhost:5000`

### Step 5: Test URL Check (Existing Feature)

- [ ] Open browser: http://localhost:5000

- [ ] Test URL check: `stripe.com`

- [ ] Verify score card appears with AI readiness score

### Step 6: Test Name Search (New Feature)

- [ ] In the same browser window

- [ ] Clear the input

- [ ] Type a name: `Michael Jordan`

- [ ] Click **Search** button

- [ ] Verify loading message: "Searching for Michael Jordan..."

- [ ] Wait 5-10 seconds

- [ ] Verify results appear:
  - [ ] Aggregate score card at top
  - [ ] Individual page cards below
  - [ ] Each card shows domain, score, grade, AI readiness checks

### Step 7: Test Multiple Queries

Try these test cases:

- [ ] `Elon Musk` - Should return ~10 pages
- [ ] `OpenAI` - Should return company pages
- [ ] `nonexistentperson12345` - Should handle gracefully (empty results)
- [ ] `stripe.com` - Should trigger URL check (not name search)

## Troubleshooting

### Cloud Run Deploy Fails

**Error: "Cloud Build API not enabled"**
```bash
gcloud services enable cloudbuild.googleapis.com
```

**Error: "Permission denied"**
- Go to: https://console.cloud.google.com/iam-admin/iam?project=alpha-search-index
- Ensure `admin@gridnetai.com` has **Cloud Run Admin** role

**Error: "Billing not enabled"**
- Go to: https://console.cloud.google.com/billing?project=alpha-search-index
- Link a billing account

### Test Script Fails

**"No results returned"**
- Check Cloud Run logs:
  ```bash
  gcloud run logs read alpha-search-scraper --project alpha-search-index --region us-central1 --limit 50
  ```
- Look for Puppeteer errors or Google blocks

**"SCRAPER_URL not set"**
- Verify you set the environment variable
- Or edit `test-cloud-run.js` and replace the placeholder

### Name Search Returns 500 Error

**Check 1**: Is `SCRAPER_URL` in `functions/.env`?
```bash
cat C:\alpha-search-index\functions\.env
```
Should show: `SCRAPER_URL=https://...`

**Check 2**: Did you restart Firebase server after adding URL?

**Check 3**: Is Cloud Run service running?
```bash
gcloud run services describe alpha-search-scraper --project alpha-search-index --region us-central1
```

### Name Search Returns Empty Results

**Check Cloud Run logs**:
```bash
gcloud run logs read alpha-search-scraper --project alpha-search-index --region us-central1 --limit 50
```

Look for:
- Puppeteer launch errors
- Google block detection
- Timeout errors

## Verification Checklist

After deployment, verify:

- [ ] Cloud Run service is deployed and running
- [ ] Service URL is accessible (returns 404 for GET, that's OK)
- [ ] `SCRAPER_URL` is in `functions/.env`
- [ ] Firebase dev server is running
- [ ] URL check works (existing feature)
- [ ] Name search works (new feature)
- [ ] Results show aggregate score
- [ ] Individual page cards display correctly
- [ ] No console errors in browser

## Cost Monitoring

After deployment, monitor costs:

- [ ] Check Cloud Run metrics: https://console.cloud.google.com/run?project=alpha-search-index
- [ ] View billing: https://console.cloud.google.com/billing?project=alpha-search-index

**Expected costs**:
- ~$138/month for always-on instance (min-instances=1)
- Covered by $300 GCP free credits for first 90 days
- ~$0.0003 per search above free tier

## Production Deployment (After Testing)

Once everything works locally:

- [ ] Deploy Cloud Functions to production
  ```bash
  cd C:\alpha-search-index
  firebase deploy --only functions
  ```

- [ ] Set production environment variable
  ```bash
  firebase functions:config:set scraper.url="https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app"
  ```

- [ ] Deploy hosting
  ```bash
  firebase deploy --only hosting
  ```

- [ ] Test production site
  - Go to: https://alpha-search-index.web.app
  - Test URL check
  - Test name search

## Success Criteria

✅ Deployment is successful when:

1. Cloud Run service returns 5-10 results for common queries
2. Response time < 10 seconds (warm instance)
3. Name search works in local dev environment
4. Name search works in production
5. Fallback chain works (if Cloud Run fails, returns empty gracefully)
6. No breaking changes to existing URL check feature

## Next Steps After Successful Deployment

1. Monitor Cloud Run logs for block rate
2. If blocks > 20%, consider multi-region deployment
3. Add monitoring/alerting for service health
4. Consider adding authentication to Cloud Run endpoint
5. Optimize Puppeteer selectors if Google changes HTML structure

## Support Resources

- **Deployment Guide**: `CLOUD_RUN_DEPLOYMENT.md`
- **Quick Start**: `IMMEDIATE_NEXT_STEPS.md`
- **Test Script**: `test-cloud-run.js`
- **Service Code**: `scraper-service/index.js`
- **Cloud Function**: `functions/scraper.js`

---

**Start with Step 1 and work through each checkbox!** 🚀
