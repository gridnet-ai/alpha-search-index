# Deployment Issues Fixed — Ready to Execute

**All 5 critical issues identified and resolved. Deployment guides are now production-ready.**

**Commit:** `4b6606a`  
**Date:** 2026-03-12

---

## 🔴 Issue 1: Windows Path in Bash Command (FIXED)

**Problem:**
```bash
cd C:\alpha-search-index  # ← FAILS in screen/tmux on Unix shells
```

**Impact:** Migration script would fail immediately on Linux/Mac/Cloud Shell.

**Fix Applied:**
- Added **3 environment-specific options** for migration:
  - **Option A:** Google Cloud Shell (RECOMMENDED) — built-in persistence
  - **Option B:** Linux/Mac with screen/tmux — proper Unix paths
  - **Option C:** Windows PowerShell — no screen/tmux required

**Files Updated:**
- `DEPLOYMENT_QUICK_START.md` (Step 3)
- `PRE_FLIGHT_CHECKLIST.md` (Step 3)

**Verification:** ✅ All paths now environment-appropriate

---

## 🔴 Issue 2: Cloud SQL Script Verification (VERIFIED)

**Problem:** Guide said to verify flags but didn't provide verification command.

**Impact:** Risk of deploying Cloud SQL with public IP if `--no-assign-ip` missing.

**Fix Applied:**
- **Confirmed all required flags present** in `scripts/setup-cloud-sql.sh`:
  - ✅ `--retained-backups-count=7` (line 42)
  - ✅ `--no-assign-ip` (line 45)
  - ✅ `--network=default` (line 46)
- Added grep verification command to pre-flight checks:
  ```bash
  grep -n "retained-backups\|no-assign-ip\|network=" scripts/setup-cloud-sql.sh
  ```

**Files Updated:**
- `DEPLOYMENT_QUICK_START.md` (Pre-Flight section)
- `scripts/pre-flight-check.sh` (Check 2)

**Verification:** ✅ Script is correct and ready to run

---

## 🟡 Issue 3: Service Account Substitution (EXPLICIT)

**Problem:** Guide had placeholder `YOUR_SERVICE_ACCOUNT@developer.gserviceaccount.com` with risk of typos.

**Impact:** Silent 403 errors on all Cloud Scheduler jobs — jobs appear to run but never hit indexer.

**Fix Applied:**
- Added **explicit warning** not to guess service account email
- Added pre-flight command to retrieve and save exact service account:
  ```bash
  gcloud iam service-accounts list \
    --filter="email~compute@developer.gserviceaccount.com" \
    --format="value(email)"
  ```
- Added verification step to echo variables before running scheduler setup:
  ```bash
  echo "Indexer URL: $INDEXER_URL"
  echo "Service Account: $SERVICE_ACCOUNT"
  ```

**Files Updated:**
- `DEPLOYMENT_QUICK_START.md` (Pre-Flight + Step 4b)
- `PRE_FLIGHT_CHECKLIST.md` (Step 4)
- `scripts/pre-flight-check.sh` (Check 3)

**Verification:** ✅ Service account now retrieved and verified before use

---

## 🟡 Issue 4: Cutover Step Incomplete (COMPLETED)

**Problem:** Cutover guide was missing critical verification steps.

**Impact:** Risk of cutting over to Cloud SQL without confirming it's serving traffic correctly.

**Fix Applied:**
- **Expanded cutover from 3 steps to 7 steps:**
  1. Modify `functions/index.js`
  2. Deploy Cloud Functions
  3. **NEW:** Verify Cloud SQL is serving live traffic
  4. **NEW:** Final discrepancy check (should be zero)
  5. Update Firestore rules to read-only
  6. Deploy Firestore rules
  7. **NEW:** Monitor for 24 hours post-cutover

- Added verification commands:
  ```bash
  # Test a fresh domain crawl
  curl -X POST .../apiHandler/check -d '{"url": "example.com"}'
  
  # Check logs for SQL queries (not Firestore reads)
  gcloud logging read 'resource.type=cloud_function AND textPayload=~"Cloud SQL"'
  
  # Final discrepancy check (should be zero)
  gcloud logging read 'jsonPayload.message=~"Score mismatch"' --freshness=1h
  ```

**Files Updated:**
- `DEPLOYMENT_QUICK_START.md` (Step 6)
- `PRE_FLIGHT_CHECKLIST.md` (Step 6)

**Verification:** ✅ Cutover now includes full validation sequence

---

## 🟢 Issue 5: PowerShell Quote Style (FIXED)

**Problem:** Log monitoring commands used single quotes wrapping double quotes, which breaks on Windows PowerShell.

**Impact:** Windows users couldn't monitor dual-read discrepancies.

**Fix Applied:**
- Added **Windows PowerShell versions** of all gcloud logging commands:
  ```powershell
  # Windows PowerShell (escaped backticks)
  gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
    --project=alpha-search-index `
    --freshness=24h `
    --limit=50
  ```
- Kept Linux/Mac/Cloud Shell versions separate for clarity
- Added PowerShell-specific count command using `ConvertFrom-Json` instead of `jq`

**Files Updated:**
- `DEPLOYMENT_QUICK_START.md` (Step 5)
- `PRE_FLIGHT_CHECKLIST.md` (Step 5)

**Verification:** ✅ Both Unix and Windows commands now provided

---

## 🎁 Bonus: Automated Pre-Flight Check Script

**New File:** `scripts/pre-flight-check.sh`

**What It Does:**
1. ✅ Verifies GCP project is `alpha-search-index`
2. ✅ Checks Cloud SQL script has all required flags
3. ✅ Retrieves and displays service account email
4. ✅ Verifies all required APIs are enabled
5. ✅ Prompts for manual Firestore field name verification

**Usage:**
```bash
bash scripts/pre-flight-check.sh
```

**Output:**
- ✅ All checks passed → Ready for deployment
- ❌ Any check failed → Blocks deployment with fix instructions

**Verification:** ✅ Automated safety net before any deployment commands

---

## 📋 Pre-Run Checklist (Updated)

Run these commands **before Step 1:**

```bash
# 1. Confirm project
gcloud config get-value project
# Expected: alpha-search-index

# 2. Run automated pre-flight check (NEW)
bash scripts/pre-flight-check.sh
# Must show: ✅ ALL CHECKS PASSED

# 3. Save service account email (from pre-flight output)
# Example: 169073379199-compute@developer.gserviceaccount.com

# 4. Verify Firestore score field name (manual)
# Firebase Console → Firestore → index collection → open 2-3 docs
# Confirm field is "alphaRankScore" or "score"
```

---

## 🚀 Deployment Sequence (Corrected)

### Environment Question: Where are you running this?

**Option A: Google Cloud Shell (RECOMMENDED)**
- ✅ Built-in persistence (no screen/tmux needed)
- ✅ Pre-authenticated with GCP
- ✅ Best for 60-min migration job

**Option B: Local Mac/Linux**
- ⚠️ Requires screen/tmux for migration
- ⚠️ Must use proper Unix paths

**Option C: Windows**
- ⚠️ No screen/tmux available
- ⚠️ Use PowerShell-specific commands
- 💡 Consider using Cloud Shell instead for migration

---

### Step 1: Cloud SQL (~15 min)

```bash
bash scripts/setup-cloud-sql.sh
```

**Verification:**
```bash
gcloud sql instances describe alpha-search-index-db --format="value(state)"
# Expected: RUNNABLE
```

---

### Step 2: GCS Buckets (~3 min)

```bash
bash scripts/setup-gcs-buckets.sh
```

**Verification:**
```bash
gsutil lifecycle get gs://alpha-search-raw-crawls | grep age
# Expected: "age": 90
```

---

### Step 3: Migration (~60 min)

**Choose your environment:**

**Google Cloud Shell:**
```bash
cd ~/alpha-search-index
export CLOUD_SQL_PASSWORD=$(gcloud secrets versions access latest --secret=alpha-search-db-password)
node scripts/migrate-firestore-to-sql.js
```

**Linux/Mac:**
```bash
screen -S migration
cd /path/to/alpha-search-index
export CLOUD_SQL_PASSWORD=$(gcloud secrets versions access latest --secret=alpha-search-db-password)
node scripts/migrate-firestore-to-sql.js
```

**Windows PowerShell:**
```powershell
cd C:\alpha-search-index
$env:CLOUD_SQL_PASSWORD = gcloud secrets versions access latest --secret=alpha-search-db-password
node scripts/migrate-firestore-to-sql.js
```

**Expected Output:**
```
✅ STAGE 1 PASSED: Row counts match
✅ STAGE 2 PASSED: All spot-checks passed
```

**If either stage fails, STOP and investigate.**

---

### Step 4: Indexer (~12 min)

**4a. Deploy Cloud Run:**
```bash
bash scripts/deploy-indexer.sh
# Copy the Service URL from output
```

**4b. Setup Cloud Scheduler:**
```bash
# Use EXACT service account from pre-flight check
export INDEXER_URL="https://alpha-search-indexer-XXXXX-uc.a.run.app"
export SERVICE_ACCOUNT="169073379199-compute@developer.gserviceaccount.com"

# Verify before running
echo "Indexer URL: $INDEXER_URL"
echo "Service Account: $SERVICE_ACCOUNT"

bash scripts/setup-cloud-scheduler.sh
```

**Verification:**
```bash
gcloud scheduler jobs list --location=us-central1
# Expected: 4 jobs listed
```

---

### Step 5: Dual-Read (1 Week)

**Monitor daily (choose your environment):**

**Linux/Mac/Cloud Shell:**
```bash
gcloud logging read 'jsonPayload.message=~"Score mismatch"' \
  --project=alpha-search-index \
  --freshness=24h \
  --limit=50
```

**Windows PowerShell:**
```powershell
gcloud logging read "jsonPayload.message=~\`"Score mismatch\`"" `
  --project=alpha-search-index `
  --freshness=24h `
  --limit=50
```

**Target:** < 10 mismatches across 10,000+ queries (< 0.1%)

---

### Step 6: Cutover (~5 min + 24hr monitoring)

**Only proceed if:**
- ✅ Dual-read period: ≥ 1 week
- ✅ Query volume: ≥ 10,000 queries
- ✅ Discrepancy rate: < 0.1%

**Sequence:**
1. Modify `functions/index.js` (comment Firestore write, use `queryIndex`)
2. Deploy: `firebase deploy --only functions`
3. **Verify Cloud SQL serving traffic** (curl test + log check)
4. **Final discrepancy check** (should be zero)
5. Update `firestore.rules` (set index to read-only)
6. Deploy: `firebase deploy --only firestore:rules`
7. **Monitor for 24 hours** (error rates, response times)

---

## ✅ All Issues Resolved

**Status:** Ready for production deployment

**Next Action:** Run `bash scripts/pre-flight-check.sh` to verify your environment

**Documentation:**
- `DEPLOYMENT_QUICK_START.md` — Fast-track guide
- `PRE_FLIGHT_CHECKLIST.md` — Comprehensive checklist
- `VERIFICATION_SUMMARY.md` — Pre-flight verification answers
- `READY_FOR_DEPLOYMENT.md` — Final readiness summary

**Commit:** `4b6606a`  
**All Changes Pushed:** ✅ Yes

---

**Last Updated:** 2026-03-12  
**Verified By:** AI Assistant  
**Status:** Production-Ready
