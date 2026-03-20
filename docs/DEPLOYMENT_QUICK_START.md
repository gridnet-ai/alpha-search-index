# Alpha Search Backend Deployment - Quick Start

**⚡ Fast-track deployment guide for the 4 remaining infrastructure steps**

---

## 🔍 Pre-Flight: Verify Your Environment

```bash
# 1. Confirm GCP project
gcloud config get-value project
# Expected: alpha-search-index

# 2. Verify setup-cloud-sql.sh has all required flags
grep -n "retained-backups\|no-assign-ip\|network=" scripts/setup-cloud-sql.sh
# Expected: All three flags present (lines 42, 45, 46)

# 3. Verify service account email and SAVE IT
gcloud iam service-accounts list \
  --filter="email~compute@developer.gserviceaccount.com" \
  --format="value(email)"
# Copy this EXACT output — you'll need it for Step 4b
# Example: 169073379199-compute@developer.gserviceaccount.com

# 4. Verify Firestore score field name
# Open Firebase Console → Firestore → index collection
# Open 2-3 documents and confirm field is "alphaRankScore" or "score"
# If different, update line 90 in scripts/migrate-firestore-to-sql.js

# 5. Enable required APIs
gcloud services enable \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com
```

---

## 📋 Step 1: Cloud SQL (~15 min)

```bash
bash scripts/setup-cloud-sql.sh
```

**What it does:**
- Creates PostgreSQL 15 instance (`alpha-search-index-db`)
- Generates secure password and stores in Secret Manager
- Applies database schema from `functions/db/schema.sql`

**Verify:**
```bash
gcloud sql instances describe alpha-search-index-db --format="value(state)"
# Expected: RUNNABLE
```

---

## 📋 Step 2: GCS Buckets (~3 min)

```bash
bash scripts/setup-gcs-buckets.sh
```

**What it does:**
- Creates 3 buckets (raw-crawls, snapshots, analytics)
- Sets lifecycle policies (90d, 30d, indefinite)
- Grants IAM permissions

**Verify:**
```bash
gsutil lifecycle get gs://alpha-search-raw-crawls | grep age
# Expected: "age": 90
```

---

## 📋 Step 3: Migration (~60 min)

**⚠️ CRITICAL: Check Firestore field names first!**

1. Open Firebase Console → Firestore → `index` collection
2. Open 2-3 documents and verify the score field is named `alphaRankScore` or `score`
3. If different, update line 90 in `scripts/migrate-firestore-to-sql.js`

**⚠️ ENVIRONMENT-SPECIFIC COMMANDS:**

**Option A: Google Cloud Shell (RECOMMENDED for 60-min job)**
```bash
# Cloud Shell has built-in persistence and auto-reconnect
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

**Option C: Windows PowerShell (no screen/tmux)**
```powershell
# Keep PowerShell window open for 60 minutes, or use Google Cloud Shell instead
cd C:\alpha-search-index
$env:CLOUD_SQL_PASSWORD = gcloud secrets versions access latest --secret=alpha-search-db-password
node scripts/migrate-firestore-to-sql.js
```

**Expected output:**
```
✅ STAGE 1 PASSED: Row counts match
✅ STAGE 2 PASSED: All spot-checks passed
```

**If Stage 1 or Stage 2 fails, STOP and investigate before proceeding.**

**Detach from screen/tmux:**
```bash
# Ctrl+A, then D (screen)
# Ctrl+B, then D (tmux)
```

---

## 📋 Step 4: Indexer Service (~12 min)

### 4a. Deploy Cloud Run Service

```bash
bash scripts/deploy-indexer.sh
```

**Copy the Service URL from output:**
```
Service URL: https://alpha-search-indexer-XXXXX-uc.a.run.app
```

### 4b. Setup Cloud Scheduler

```bash
# Set environment variables with EXACT values from pre-flight checks
# DO NOT GUESS the service account — use the exact output from pre-flight step 3

export INDEXER_URL="https://alpha-search-indexer-XXXXX-uc.a.run.app"  # From deploy-indexer.sh output
export SERVICE_ACCOUNT="169073379199-compute@developer.gserviceaccount.com"  # From pre-flight step 3

# Verify variables are set correctly
echo "Indexer URL: $INDEXER_URL"
echo "Service Account: $SERVICE_ACCOUNT"

# Create scheduler jobs
bash scripts/setup-cloud-scheduler.sh
```

**Verify:**
```bash
gcloud scheduler jobs list --location=us-central1
# Expected: 4 jobs (reindex-domains, reindex-people, discover, snapshot)
```

**Test a job:**
```bash
gcloud scheduler jobs run reindex-domains --location=us-central1
```

---

## 📊 Step 5: Dual-Read Period (1 Week)

**No action required** — dual-read is already enabled in `functions/index.js`.

**Monitor daily (Linux/Mac/Cloud Shell):**
```bash
gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
  --project=alpha-search-index \
  --freshness=24h \
  --limit=50
```

**Monitor daily (Windows PowerShell):**
```powershell
gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
  --project=alpha-search-index `
  --freshness=24h `
  --limit=50
```

**Weekly check (Linux/Mac/Cloud Shell):**
```bash
gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
  --project=alpha-search-index \
  --freshness=7d \
  --format=json | jq length
```

**Weekly check (Windows PowerShell):**
```powershell
gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
  --project=alpha-search-index `
  --freshness=7d `
  --format=json | ConvertFrom-Json | Measure-Object | Select-Object -ExpandProperty Count
```

**Target:** < 10 mismatches across 10,000+ queries (< 0.1% discrepancy rate)

---

## 🎯 Step 6: Cutover (After Dual-Read Validation)

**Only proceed if:**
- ✅ Dual-read period: ≥ 1 week
- ✅ Query volume: ≥ 10,000 queries
- ✅ Discrepancy rate: < 0.1%

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
   # Test a fresh domain crawl
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
   # Linux/Mac/Cloud Shell
   gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
     --project=alpha-search-index \
     --freshness=1h \
     --limit=50
   
   # Windows PowerShell
   gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
     --project=alpha-search-index `
     --freshness=1h `
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

7. **Monitor for 24 hours post-cutover:**
   - Check error rates haven't increased
   - Verify response times are acceptable
   - Confirm no SQL connection errors

---

## 🚨 Quick Troubleshooting

### Cloud SQL won't connect
```bash
# Check instance status
gcloud sql instances describe alpha-search-index-db --format="value(state)"

# Test connection
gcloud sql connect alpha-search-index-db --user=alpha_user --database=alpha_search
```

### Migration fails at Stage 1
```bash
# Check Firestore count
# Firebase Console → Firestore → index collection → Document count

# Check Cloud SQL count
gcloud sql connect alpha-search-index-db --user=alpha_user --database=alpha_search
SELECT COUNT(*) FROM ai_records WHERE entity_type='domain';
\q
```

### Cloud Scheduler 403 errors
```bash
# Verify service account has Cloud Run Invoker role
gcloud run services add-iam-policy-binding alpha-search-indexer \
  --region=us-central1 \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@developer.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --project=alpha-search-index
```

### Indexer service crashes
```bash
# Check logs
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=alpha-search-indexer' \
  --limit=50 \
  --format=json
```

---

## 📚 Full Documentation

- **Detailed Checklist:** `PRE_FLIGHT_CHECKLIST.md`
- **Verification Answers:** `VERIFICATION_SUMMARY.md`
- **Architecture:** `ALPHA_INDEX_ARCHITECTURE.md`
- **Deployment Guide:** `BACKEND_DEPLOYMENT_GUIDE.md`

---

## ⏱️ Total Deployment Time

| Step | Duration | Can Run in Background? |
|------|----------|------------------------|
| 1. Cloud SQL | ~15 min | No (interactive password prompt) |
| 2. GCS Buckets | ~3 min | No |
| 3. Migration | ~60 min | **Yes (use screen/tmux)** |
| 4. Indexer | ~12 min | No |
| **Total** | **~90 min** | |

**Dual-read period:** 1 week minimum (passive monitoring)

---

**Last Updated:** 2026-03-12  
**Version:** 1.0  
**Status:** Ready for Production Deployment
