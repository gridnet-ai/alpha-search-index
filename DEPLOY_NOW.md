# Deploy Ultimate Backend - Execute Now

**Status:** All code written ✅ | Ready for infrastructure deployment

**Time Required:** ~90 minutes total

---

## Pre-Flight Check (5 min)

Run the automated pre-flight check:

```bash
cd C:\alpha-search-index
bash scripts/pre-flight-check.sh
```

**Expected Output:** All checks should pass ✅

If any checks fail, fix them before proceeding.

---

## Step 1: Enable Required APIs (2 min)

```bash
gcloud services enable \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com
```

---

## Step 2: Provision Cloud SQL (15 min)

```bash
bash scripts/setup-cloud-sql.sh
```

**What happens:**
- Creates PostgreSQL 15 instance: `alpha-search-index-db`
- Prompts for password (save this!)
- Creates database: `alpha_search`
- Creates user: `alpha_user`
- Applies full schema from `functions/db/schema.sql`

**Verify:**
```bash
gcloud sql instances describe alpha-search-index-db --format="value(state)"
# Expected: RUNNABLE
```

---

## Step 3: Create GCS Buckets (3 min)

```bash
bash scripts/setup-gcs-buckets.sh
```

**What happens:**
- Creates 3 buckets with lifecycle policies
- Sets up IAM permissions

**Verify:**
```bash
gsutil lifecycle get gs://alpha-search-raw-crawls | grep age
# Expected: "age": 90
```

---

## Step 4: Set Environment Variables (5 min)

```bash
# Get your Cloud SQL password (from Step 2 or Secret Manager)
export CLOUD_SQL_PASSWORD="YOUR_PASSWORD_HERE"

# Set Firebase Functions config
firebase functions:config:set \
  serpapi.key="YOUR_SERPAPI_KEY" \
  cloudsql.instance="alpha-search-index:us-central1:alpha-search-index-db" \
  cloudsql.user="alpha_user" \
  cloudsql.password="$CLOUD_SQL_PASSWORD" \
  cloudsql.database="alpha_search" \
  gcs.raw_crawls_bucket="alpha-search-raw-crawls" \
  gcs.snapshots_bucket="alpha-search-snapshots" \
  gcs.analytics_bucket="alpha-search-analytics" \
  firebase.project_id="alpha-search-index"

# Verify config
firebase functions:config:get
```

---

## Step 5: Deploy Cloud Functions (10 min)

```bash
firebase deploy --only functions
```

**What happens:**
- Deploys `apiHandler` function with all new endpoints
- Includes dual-write logic, user management, crawlers
- 5-minute timeout, 512MB memory

**Verify:**
```bash
# Test domain check (should dual-write to Cloud SQL)
curl -X POST https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler/check \
  -H "Content-Type: application/json" \
  -d '{"url":"stripe.com"}'
```

---

## Step 6: Migrate Firestore to Cloud SQL (60 min)

**⚠️ CRITICAL:** This is a long-running job. Use Google Cloud Shell or screen/tmux.

### Option A: Google Cloud Shell (RECOMMENDED)

```bash
# Open Cloud Shell: https://shell.cloud.google.com
cd ~/alpha-search-index

# Get password from Secret Manager
export CLOUD_SQL_PASSWORD=$(gcloud secrets versions access latest --secret=alpha-search-db-password)

# Run migration
node scripts/migrate-firestore-to-sql.js
```

### Option B: Local with screen (Linux/Mac/WSL)

```bash
screen -S migration
cd /path/to/alpha-search-index
export CLOUD_SQL_PASSWORD="YOUR_PASSWORD"
node scripts/migrate-firestore-to-sql.js
# Press Ctrl+A, then D to detach
# Reattach: screen -r migration
```

### Option C: PowerShell (Windows - not recommended for 60min job)

```powershell
cd C:\alpha-search-index
$env:CLOUD_SQL_PASSWORD="YOUR_PASSWORD"
node scripts/migrate-firestore-to-sql.js
```

**What happens:**
- Stage 1: Export Firestore, count rows, import to Cloud SQL, verify counts
- Stage 2: Spot-check 10 random records for data integrity
- Stage 3: Enable dual-read mode for validation

**Expected Output:**
```
✅ Stage 1 PASSED: Row counts match (Firestore: 2401, Cloud SQL: 2401)
✅ Stage 2 PASSED: 10/10 spot-checks matched
✅ Stage 3: Dual-read enabled. Monitor for 1 week.
```

**If Stage 1 fails:** Stop immediately and investigate. Do not proceed.

---

## Step 7: Deploy Indexer Service (10 min)

```bash
bash scripts/deploy-indexer.sh
```

**What happens:**
- Builds Docker image for background indexer
- Deploys to Cloud Run: `alpha-search-indexer`
- Sets environment variables
- Configures private access (no public invocation)

**Save the output URL!** You'll need it for Step 8.

**Example output:**
```
Service URL: https://alpha-search-indexer-xxxxx-uc.a.run.app
```

---

## Step 8: Setup Cloud Scheduler (5 min)

```bash
# Set the indexer URL from Step 7
export INDEXER_URL="https://alpha-search-indexer-xxxxx-uc.a.run.app"

# Run setup
bash scripts/setup-cloud-scheduler.sh
```

**What happens:**
- Creates 4 Cloud Scheduler jobs:
  - `reindex-domains` - Every hour
  - `reindex-people` - Every hour at :15
  - `discover` - Every 6 hours
  - `snapshot` - Daily at 3am

**Verify:**
```bash
gcloud scheduler jobs list --location us-central1
```

---

## Step 9: Dual-Read Monitoring (1 week)

After migration completes, monitor for discrepancies:

```bash
# Check for mismatches
gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
  --project=alpha-search-index \
  --freshness=7d \
  --limit=50
```

**Target:** < 0.1% discrepancy rate (< 10 mismatches per 10,000 queries)

**If discrepancy rate is acceptable after 1 week, proceed to cutover.**

---

## Step 10: Cutover to Cloud SQL (Final Step)

Once dual-read validation passes:

1. **Update Cloud Functions to read from Cloud SQL only:**
   - Modify `functions/index.js` to use `queryIndex()` instead of Firestore reads
   - Remove Firestore writes to `index` collection

2. **Deploy updated functions:**
   ```bash
   firebase deploy --only functions
   ```

3. **Verify Cloud SQL is serving live traffic:**
   ```bash
   # Check recent queries hit Cloud SQL
   gcloud logging read 'resource.type=cloudsql_database' \
     --limit=20 \
     --format=json
   ```

4. **Final discrepancy check:**
   ```bash
   # Should see no new discrepancies
   gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
     --freshness=1h
   ```

5. **Update Firestore rules (optional - make index read-only):**
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 🎉 Deployment Complete!

Your ultimate backend is now live with:

✅ Cloud SQL PostgreSQL (unified index for domains, people, products)
✅ Cloud Storage (raw crawls, snapshots, analytics)
✅ Cloud Functions (dual-write, user management, crawlers)
✅ Cloud Run (background indexer)
✅ Cloud Scheduler (automated re-indexing)
✅ Firebase Auth (user accounts and search history)

**Next Steps:**
- Monitor Cloud SQL query performance
- Review discovery queue growth
- Analyze search patterns in analytics
- Scale Cloud SQL tier as needed (currently db-n1-standard-2)

---

## Troubleshooting

### Cloud SQL Connection Issues
```bash
# Check instance status
gcloud sql instances describe alpha-search-index-db

# Test connection from Cloud Shell
gcloud sql connect alpha-search-index-db --user=alpha_user --database=alpha_search
```

### Migration Stuck
```bash
# Check Cloud SQL operations
gcloud sql operations list --instance=alpha-search-index-db

# Monitor Cloud SQL logs
gcloud logging read 'resource.type=cloudsql_database' --limit=50
```

### Cloud Run Deployment Failed
```bash
# Check Cloud Build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

### Scheduler Jobs Not Running
```bash
# Check job status
gcloud scheduler jobs describe reindex-domains --location=us-central1

# Manually trigger a job
gcloud scheduler jobs run reindex-domains --location=us-central1

# View job logs
gcloud logging read 'resource.type=cloud_scheduler_job' --limit=20
```

---

## Cost Estimates

**Monthly costs at 10K searches/day:**
- Cloud SQL (db-n1-standard-2): ~$100/month
- Cloud Storage (3 buckets): ~$5/month
- Cloud Functions (300s timeout): ~$20/month
- Cloud Run (indexer): ~$10/month
- SerpAPI (name searches): ~$50/month
- **Total: ~$185/month**

**Scaling to 100K searches/day:**
- Cloud SQL (db-n1-standard-4): ~$200/month
- Cloud Storage: ~$20/month
- Cloud Functions: ~$150/month
- Cloud Run: ~$30/month
- SerpAPI: ~$500/month
- **Total: ~$900/month**
