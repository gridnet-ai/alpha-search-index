# Alpha Search Backend Deployment - Pre-Flight Checklist

This checklist ensures all infrastructure provisioning steps are executed correctly and safely. Complete each verification step **before** running the corresponding deployment script.

---

## 📋 Step 1: Cloud SQL Provisioning (~15 min)

### Pre-Flight Checks

- [ ] **Verify GCP Project:**
  ```bash
  gcloud config get-value project
  ```
  Expected output: `alpha-search-index`

- [ ] **Verify Script Configuration:**
  Open `scripts/setup-cloud-sql.sh` and confirm:
  - ✅ Instance name: `alpha-search-index-db` (line 14)
  - ✅ `--no-assign-ip` present (line 44)
  - ✅ `--network=default` present (line 45)
  - ✅ `--retained-backups-count=7` present (line 42)

- [ ] **Enable Required APIs:**
  ```bash
  gcloud services enable sqladmin.googleapis.com secretmanager.googleapis.com
  ```

### Execute

```bash
bash scripts/setup-cloud-sql.sh
```

**Expected Duration:** ~15 minutes

### Post-Flight Verification

- [ ] **Verify Instance Created:**
  ```bash
  gcloud sql instances describe alpha-search-index-db --project=alpha-search-index
  ```
  Check for:
  - `state: RUNNABLE`
  - `ipAddresses[0].type: PRIVATE`
  - `backupConfiguration.enabled: true`

- [ ] **Verify Secret Created:**
  ```bash
  gcloud secrets describe alpha-search-db-password --project=alpha-search-index
  ```

- [ ] **Save Connection String:**
  ```
  alpha-search-index:us-central1:alpha-search-index-db
  ```

---

## 📋 Step 2: GCS Buckets (~3 min)

### Pre-Flight Checks

- [ ] **Verify Project:**
  ```bash
  gcloud config get-value project
  ```
  Expected: `alpha-search-index`

### Execute

```bash
bash scripts/setup-gcs-buckets.sh
```

**Expected Duration:** ~3 minutes

### Post-Flight Verification

- [ ] **Verify Buckets Created:**
  ```bash
  gsutil ls -p alpha-search-index | grep alpha-search
  ```
  Expected output:
  ```
  gs://alpha-search-raw-crawls/
  gs://alpha-search-snapshots/
  gs://alpha-search-analytics/
  ```

- [ ] **Verify Lifecycle Policies:**
  ```bash
  gsutil lifecycle get gs://alpha-search-raw-crawls
  gsutil lifecycle get gs://alpha-search-snapshots
  ```
  Expected:
  - **raw-crawls:** `"age": 90`
  - **snapshots:** `"age": 30`

- [ ] **Test Write Access:**
  ```bash
  echo "test" | gsutil cp - gs://alpha-search-raw-crawls/test.txt
  gsutil rm gs://alpha-search-raw-crawls/test.txt
  ```

---

## 📋 Step 3: Firestore → Cloud SQL Migration (~60 min)

### Pre-Flight Checks

- [ ] **Verify Firestore Field Names:**
  1. Open Firebase Console → Firestore → `index` collection
  2. Open 2-3 random documents
  3. Check the score field name (should be `alphaRankScore` or `score`)
  4. If different, update line 90 in `scripts/migrate-firestore-to-sql.js`

- [ ] **Verify Cloud SQL Connection:**
  ```bash
  gcloud sql connect alpha-search-index-db --user=alpha_user --database=alpha_search
  ```
  Enter password from Secret Manager, then run:
  ```sql
  SELECT COUNT(*) FROM ai_records;
  \q
  ```
  Expected: `0` (empty before migration)

- [ ] **Start a Screen/Tmux Session:**
  ```bash
  # For long-running migration (prevents SSH disconnection issues)
  screen -S migration
  # or
  tmux new -s migration
  ```

### Execute

**⚠️ ENVIRONMENT-SPECIFIC COMMANDS:**

**Option A: Google Cloud Shell (RECOMMENDED)**
```bash
cd ~/alpha-search-index
export CLOUD_SQL_PASSWORD=$(gcloud secrets versions access latest --secret=alpha-search-db-password)
node scripts/migrate-firestore-to-sql.js
```

**Option B: Linux/Mac with screen/tmux**
```bash
screen -S migration
# or: tmux new -s migration

cd /path/to/alpha-search-index  # Use your actual repo path
export CLOUD_SQL_PASSWORD=$(gcloud secrets versions access latest --secret=alpha-search-db-password)
node scripts/migrate-firestore-to-sql.js
```

**Option C: Windows PowerShell**
```powershell
# Keep PowerShell window open, or use Google Cloud Shell instead
cd C:\alpha-search-index
$env:CLOUD_SQL_PASSWORD = gcloud secrets versions access latest --secret=alpha-search-db-password
node scripts/migrate-firestore-to-sql.js
```

**Expected Duration:** ~60 minutes for 2.4M records

### Stage 1 Validation (Count Check)

The script will automatically validate row counts. **DO NOT PROCEED** if you see:

```
❌ STAGE 1 FAILED: Row count mismatch detected
```

**If Stage 1 fails:**
1. Check Cloud SQL connection logs
2. Check for script errors in the output
3. Verify Firestore collection name is `index`
4. Re-run after fixing issues

**Expected Success Output:**
```
✅ STAGE 1 PASSED: Row counts match
Firestore count: 2,400,000 domains
Cloud SQL count: 2,400,000 domains
Count mismatch: 0
```

### Stage 2 Validation (Spot-Check)

The script will automatically spot-check 10 random domains. **DO NOT PROCEED** if you see:

```
❌ STAGE 2 FAILED: Some spot-checks failed
```

**Expected Success Output:**
```
✅ STAGE 2 PASSED: All spot-checks passed
Passed: 10/10
Failed: 0/10
```

### Post-Flight Verification

- [ ] **Verify Migration Complete:**
  ```bash
  gcloud sql connect alpha-search-index-db --user=alpha_user --database=alpha_search
  ```
  ```sql
  SELECT COUNT(*) FROM ai_records WHERE entity_type='domain';
  SELECT COUNT(*) FROM record_domains;
  SELECT * FROM alpha_search_index LIMIT 5;
  \q
  ```

- [ ] **Exit Screen/Tmux:**
  ```bash
  # Press Ctrl+A, then D (for screen)
  # or Ctrl+B, then D (for tmux)
  ```

---

## 📋 Step 4: Deploy Indexer Service (~10 min)

### Pre-Flight Checks

- [ ] **Verify Service Account:**
  ```bash
  gcloud iam service-accounts list --project=alpha-search-index --filter="email~compute@developer.gserviceaccount.com" --format="value(email)"
  ```
  Copy the output and update line 17 in `scripts/setup-cloud-scheduler.sh` if different from:
  ```
  169073379199-compute@developer.gserviceaccount.com
  ```

- [ ] **Enable Cloud Run API:**
  ```bash
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com
  ```

### Execute

```bash
bash scripts/deploy-indexer.sh
```

**Expected Duration:** ~10 minutes (includes Docker build)

### Post-Flight Verification

- [ ] **Save Service URL:**
  The script will output:
  ```
  Service URL: https://alpha-search-indexer-XXXXX-uc.a.run.app
  ```
  **Copy this URL** — you'll need it for Cloud Scheduler setup.

- [ ] **Test Health Endpoint:**
  ```bash
  # This will fail with 403 (expected, since service requires auth)
  curl https://alpha-search-indexer-XXXXX-uc.a.run.app/health
  ```
  Expected: `403 Forbidden` (confirms service is running but requires auth)

- [ ] **Update Cloud Scheduler Script:**
  ```bash
  export INDEXER_URL="https://alpha-search-indexer-XXXXX-uc.a.run.app"
  # Verify it's set correctly
  echo $INDEXER_URL
  ```

### Execute Cloud Scheduler Setup

```bash
# Use EXACT service account from pre-flight verification
# DO NOT GUESS — a typo causes silent 403s on all scheduled jobs

export INDEXER_URL="https://alpha-search-indexer-XXXXX-uc.a.run.app"  # From deploy-indexer.sh output
export SERVICE_ACCOUNT="169073379199-compute@developer.gserviceaccount.com"  # From pre-flight check

# Verify variables before running
echo "Indexer URL: $INDEXER_URL"
echo "Service Account: $SERVICE_ACCOUNT"

bash scripts/setup-cloud-scheduler.sh
```

**Expected Duration:** ~2 minutes

### Post-Flight Verification

- [ ] **Verify Jobs Created:**
  ```bash
  gcloud scheduler jobs list --location=us-central1
  ```
  Expected: 4 jobs (`reindex-domains`, `reindex-people`, `discover`, `snapshot`)

- [ ] **Manually Trigger Test Job:**
  ```bash
  gcloud scheduler jobs run reindex-domains --location=us-central1
  ```

- [ ] **Check Job Logs:**
  ```bash
  gcloud logging read 'resource.type=cloud_scheduler_job' --limit=10 --format=json
  ```
  Look for `status: 200` in the response.

---

## 📋 Step 5: Enable Dual-Read Period (1 Week Minimum)

### Pre-Flight Checks

- [ ] **All Previous Steps Complete:**
  - ✅ Cloud SQL provisioned and schema applied
  - ✅ GCS buckets created with lifecycle policies
  - ✅ Migration completed with 0 count mismatch and 0 spot-check failures
  - ✅ Indexer service deployed and Cloud Scheduler jobs running

### Execute

**No script to run** — dual-read is already enabled in `functions/index.js` via the `dualReadDomain` function in `functions/db/dual-read.js`.

### Monitor Discrepancies (1 Week Minimum, 10,000+ Queries)

- [ ] **Daily Discrepancy Check (Linux/Mac/Cloud Shell):**
  ```bash
  gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
    --project=alpha-search-index \
    --freshness=24h \
    --limit=50
  ```

- [ ] **Daily Discrepancy Check (Windows PowerShell):**
  ```powershell
  gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
    --project=alpha-search-index `
    --freshness=24h `
    --limit=50
  ```

- [ ] **Weekly Discrepancy Rate (Linux/Mac/Cloud Shell):**
  ```bash
  gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
    --project=alpha-search-index \
    --freshness=7d \
    --limit=500 \
    --format=json | jq length
  ```

- [ ] **Weekly Discrepancy Rate (Windows PowerShell):**
  ```powershell
  gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
    --project=alpha-search-index `
    --freshness=7d `
    --format=json | ConvertFrom-Json | Measure-Object | Select-Object -ExpandProperty Count
  ```
  **Target:** < 10 mismatches across 10,000+ queries (< 0.1% discrepancy rate)

### Post-Flight Verification

- [ ] **Discrepancy Rate < 0.1%:**
  If you have 10,000 queries and fewer than 10 mismatches, you're clear for cutover.

- [ ] **Export Discrepancies for Analysis:**
  ```bash
  # In Cloud Functions logs, look for discrepancy exports to GCS
  gsutil ls gs://alpha-search-analytics/analytics/dual-read-discrepancies-summary/
  ```

---

## 📋 Step 6: Cutover to Cloud SQL

### Pre-Flight Checks

- [ ] **Dual-Read Period Complete:**
  - ✅ Minimum 1 week elapsed
  - ✅ Minimum 10,000 queries processed
  - ✅ Discrepancy rate < 0.1%

### Execute

**Cutover Sequence:**

1. **Modify `functions/index.js`:**
   - In `handleCheck`, comment out Firestore write:
     ```javascript
     // await docRef.set(firestoreData, { merge: true });
     ```
   - Replace `dualReadDomain` with direct Cloud SQL read:
     ```javascript
     const cachedResult = await queryIndex('domain', domain);
     ```

2. **Deploy Cloud Functions:**
   ```bash
   firebase deploy --only functions
   ```

3. **Verify Cloud SQL is serving live traffic:**
   ```bash
   curl -X POST https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler/check \
     -H "Content-Type: application/json" \
     -d '{"url": "example.com"}'
   
   # Check logs for SQL queries (not Firestore reads)
   gcloud logging read 'resource.type=cloud_function AND textPayload=~"Cloud SQL"' \
     --limit=10 \
     --freshness=5m
   ```

4. **Final discrepancy check (should be zero):**
   ```bash
   gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
     --project=alpha-search-index \
     --freshness=1h \
     --limit=50
   ```
   **Expected:** Zero results (no new discrepancies after cutover)

5. **Update Firestore rules to read-only:**
   ```javascript
   // In firestore.rules
   match /index/{domain} {
     allow read: if true;
     allow write: if false;  // Disable writes
   }
   ```

6. **Deploy Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

### Post-Flight Verification

- [ ] **Verify Cloud SQL is Primary:**
  - ✅ Test domain crawl returns results from Cloud SQL
  - ✅ Logs show SQL queries, not Firestore reads
  - ✅ Zero discrepancies in the first hour post-cutover

- [ ] **Monitor Error Rates (24 hours):**
  ```bash
  gcloud logging read 'resource.type=cloud_function AND severity>=ERROR' \
    --project=alpha-search-index \
    --freshness=1h \
    --limit=50
  ```
  Expected: No SQL connection errors or query failures

- [ ] **Verify Response Times:**
  - ✅ API response times within acceptable range
  - ✅ No timeout errors from Cloud SQL
  - ✅ Connection pool is stable

---

## 🎉 Deployment Complete

Once all 6 steps are verified, your Alpha Search backend is fully operational with:

- ✅ Cloud SQL as the primary data source
- ✅ Cloud Storage for raw crawl data and analytics
- ✅ Background indexer service for automated re-crawling
- ✅ Cloud Scheduler jobs for discovery and maintenance
- ✅ Firebase Auth for user management
- ✅ Dual-write to ensure data consistency

**Next Steps:**
1. Monitor Cloud SQL performance and adjust instance tier if needed
2. Review Cloud Scheduler job execution logs weekly
3. Analyze GCS analytics data for insights
4. Scale Cloud Run indexer instances based on discovery queue size
5. Implement Common Crawl integration for Phase 2 discovery

---

## 🚨 Rollback Procedures

If any step fails critically, follow these rollback procedures:

### Rollback Cloud SQL Migration
```bash
# Re-enable Firestore writes in functions/index.js
# Redeploy Cloud Functions
firebase deploy --only functions
```

### Rollback Indexer Service
```bash
# Delete Cloud Scheduler jobs
gcloud scheduler jobs delete reindex-domains --location=us-central1 --quiet
gcloud scheduler jobs delete reindex-people --location=us-central1 --quiet
gcloud scheduler jobs delete discover --location=us-central1 --quiet
gcloud scheduler jobs delete snapshot --location=us-central1 --quiet

# Delete Cloud Run service
gcloud run services delete alpha-search-indexer --region=us-central1 --quiet
```

### Rollback Cloud SQL Instance
```bash
# DANGER: This deletes all data
gcloud sql instances delete alpha-search-index-db --project=alpha-search-index --quiet
```

---

**Last Updated:** 2026-03-12
**Version:** 1.0
