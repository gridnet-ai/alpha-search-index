# Google Custom Search API Setup Guide

## Step 1: Enable the API

1. Go to: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Make sure project `alpha-search-index` is selected
3. Click **Enable**

## Step 2: Create API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Optional) Restrict the key to Custom Search API only

## Step 3: Create Programmable Search Engine

1. Go to: https://programmablesearchengine.google.com
2. Click **Add** or **Create**
3. **Search engine name:** Alpha Search Name Finder
4. **What to search:** Select **Search the entire web**
5. Click **Create**
6. Copy the **Search engine ID (cx)** from the overview page

## Step 4: Add Credentials to Environment

### Local Development

Edit `functions/.env`:
```bash
GOOGLE_API_KEY=your_actual_api_key_here
GOOGLE_CX=your_actual_search_engine_id_here
```

### Production Deployment

```bash
firebase functions:config:set google.api_key="YOUR_API_KEY" google.cx="YOUR_CX"
```

## Pricing

- **Free tier:** 100 queries per day
- **Paid:** $0.005 per query after free tier
- **Billing:** Charged to the same GCP project as Firebase

## Testing

Once configured, test the API:

```bash
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_KEY&cx=YOUR_CX&q=Terry+French&num=10"
```

You should receive JSON with search results.

---

**Status:** ⏳ Awaiting user configuration  
**Required for:** Name search functionality (`/api/search` endpoint)
