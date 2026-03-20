# 🚀 Cloud Run Deployment - Ready to Deploy!

## Status: Code Complete, Awaiting GCP Auth

All code is written and ready. You just need to run the deployment commands once your GCP authentication is sorted.

## ✅ What's Been Completed

### 1. Cloud Run Service Created
- ✅ `scraper-service/package.json` - Dependencies configured
- ✅ `scraper-service/index.js` - Puppeteer scraper service (180 lines)
- ✅ `scraper-service/Dockerfile` - Container definition
- ✅ `scraper-service/.dockerignore` - Build exclusions

### 2. Cloud Function Updated
- ✅ `functions/scraper.js` - Updated to call Cloud Run service
- ✅ **Critical mapping implemented**: `{link, title, snippet}` → `{url, title, description}`
- ✅ Fallback chain preserved: Cloud Run → Google Custom Search → SerpAPI

### 3. Testing & Documentation
- ✅ `test-cloud-run.js` - Test script for Cloud Run service
- ✅ `CLOUD_RUN_DEPLOYMENT.md` - Complete deployment guide
- ✅ `DEPLOYMENT_READY.md` - This file

## ⏳ Waiting On: GCP Authentication

You're currently fixing GCP auth permissions. Once that's done, follow these steps:

## 📋 Deployment Steps (Run These After Auth is Fixed)

### Step 1: Verify GCP Auth

```bash
# Should show: alpha-search-index
gcloud config get-value project

# Should show: admin@gridnetai.com
gcloud config get-value account
```

If not correct:
```bash
gcloud config set project alpha-search-index
gcloud auth login
gcloud auth application-default set-quota-project alpha-search-index
```

### Step 2: Deploy to Cloud Run

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

**This will take 5-10 minutes** (building container, pushing to registry, deploying).

### Step 3: Copy the Service URL

After deployment completes, you'll see:
```
Service URL: https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app
```

**Copy this URL!**

### Step 4: Add URL to Environment

Edit `functions/.env` and add:
```
SCRAPER_URL=https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app
```

(Replace with your actual URL from Step 3)

### Step 5: Test the Cloud Run Service

```bash
cd C:\alpha-search-index

# Set the URL temporarily for testing
set SCRAPER_URL=https://alpha-search-scraper-xxxxxxxxxx-uc.a.run.app

# Run the test
node test-cloud-run.js
```

**Expected output:**
```
✅ SUCCESS: 10 results returned

Showing first 3 results:

1. Terry French - LinkedIn
   Link: https://www.linkedin.com/in/...
   Snippet: Founder & CEO...
```

### Step 6: Restart Firebase Dev Server

```bash
# Stop the current server (Ctrl+C in the terminal where it's running)

# Restart with the new environment
cd C:\alpha-search-index
firebase serve --only "functions,hosting"
```

### Step 7: Test End-to-End

1. Go to http://localhost:5000
2. Type: `Michael Jordan`
3. Click **Search**
4. Should see:
   - "Searching for Michael Jordan..."
   - "Found X pages · Scoring each one..."
   - Aggregate score card
   - Individual page cards with scores

## 🔧 If Deployment Fails

### Error: "Cloud Build API not enabled"
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### Error: "Permission denied"
Go to: https://console.cloud.google.com/iam-admin/iam?project=alpha-search-index

Make sure `admin@gridnetai.com` has:
- ✅ Cloud Run Admin
- ✅ Cloud Build Editor
- ✅ Service Usage Consumer

### Error: "Billing not enabled"
Go to: https://console.cloud.google.com/billing?project=alpha-search-index

Link a billing account (required for Cloud Run).

## 💰 Cost Estimate

With `--min-instances 1` (keeps one instance warm):
- **~$138/month** for always-on instance
- **BUT**: Covered by $300 GCP free credits (90 days)
- **Per-search cost**: ~$0.0003 (vs $0.005 for SerpAPI)

**First 90 days**: Effectively free
**After free credits**: ~$138/month + $0.0003 per search

## 🎯 Success Criteria

Once deployed, you should see:
- ✅ Cloud Run service returns 5-10 results for common queries
- ✅ Response time < 10 seconds
- ✅ Name search works in UI without SerpAPI key
- ✅ Falls back gracefully if Cloud Run is down

## 📝 Current Blocker

**Your GCP auth issue from the console screenshot:**

The IAM roles have been added (`admin@gridnetai.com` now has Service Usage Admin and Consumer). The console shows "Policy updated" at the bottom.

**Wait 2-3 minutes for propagation**, then run:
```bash
gcloud auth application-default set-quota-project alpha-search-index
```

Once that command succeeds without errors, you're ready to deploy!

## 🚀 Quick Deploy (Copy-Paste Ready)

Once auth is fixed, copy-paste this entire block:

```bash
cd C:\alpha-search-index\scraper-service
gcloud run deploy alpha-search-scraper --source . --region us-central1 --platform managed --allow-unauthenticated --memory 2Gi --cpu 2 --timeout 60 --concurrency 5 --min-instances 1 --project alpha-search-index
```

Then wait for the service URL, add it to `functions/.env`, and test!

## 📚 Full Documentation

- **Deployment Guide**: `CLOUD_RUN_DEPLOYMENT.md`
- **Service Code**: `scraper-service/index.js`
- **Test Script**: `test-cloud-run.js`
- **Cloud Function**: `functions/scraper.js` (updated to call Cloud Run)

---

**Everything is ready. Just waiting on GCP auth to clear, then one command deploys it all!** 🎉
