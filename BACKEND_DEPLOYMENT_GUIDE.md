# Alpha Search Backend Deployment Guide

## Overview

This guide walks through deploying the complete Alpha Search backend infrastructure, including:

- ✅ Firebase Authentication (Email/Password + Google OAuth)
- ✅ Firestore user collections with security rules
- ✅ Cloud SQL PostgreSQL database with 7-entity-type schema
- ✅ Cloud Storage buckets for raw crawls, snapshots, and analytics
- ✅ Cloud Functions API with user endpoints
- ✅ Background indexer service on Cloud Run
- ✅ Cloud Scheduler jobs for automated re-indexing
- ✅ Migration scripts with 3-stage validation

## Prerequisites

1. **GCP Project**: `alpha-search-index`
2. **Firebase Project**: Initialized and linked to GCP
3. **gcloud CLI**: Authenticated and configured
4. **Firebase CLI**: Authenticated (`firebase login`)
5. **Node.js 20**: Installed locally

## Deployment Sequence

### Phase 1: Foundation (Already Complete ✅)

```bash
# 1. Firebase Auth - Enable in Firebase Console
#    - Email/Password authentication
#    - Google OAuth provider
#    See: FIREBASE_AUTH_SETUP.md

# 2. Firestore Rules - Already deployed
firebase deploy --only firestore:rules

# 3. Dependencies - Already installed
cd functions && npm install
```

**Status**: ✅ Complete
- Auth middleware created (`functions/auth.js`)
- User management created (`functions/db/users.js`, `functions/db/searchHistory.js`)
- Firestore rules deployed with user data protection

### Phase 2: Cloud SQL Setup (Manual Steps Required)

```bash
# 1. Provision Cloud SQL instance
bash scripts/setup-cloud-sql.sh

# This will:
# - Create PostgreSQL 15 instance (db-n1-standard-2, 100GB SSD)
# - Create database 'alpha_search' and user 'alpha_user'
# - Generate and store password in Secret Manager
# - Apply schema.sql (all tables, views, functions)
```

**What gets created:**
- `ai_records` base table
- 7 type tables (`record_domains`, `record_people`, `record_products`, `record_organizations`, `record_agents`, `record_models`, `record_datasets`)
- `cache_config` table (tiered TTLs)
- `discovery_queue` table
- `alpha_search_index` unified VIEW
- `upsert_ai_record()` PostgreSQL function
- `fn_update_search_vector()` trigger

**Estimated time**: 10-15 minutes

### Phase 3: Cloud Storage Setup

```bash
# 2. Create GCS buckets with lifecycle policies
bash scripts/setup-gcs-buckets.sh

# This will:
# - Create alpha-search-raw-crawls (90-day retention)
# - Create alpha-search-snapshots (30-day retention)
# - Create alpha-search-analytics (indefinite retention)
# - Set IAM permissions for Cloud Functions and Cloud Run
```

**Estimated time**: 2-3 minutes

### Phase 4: Migration (Manual Steps Required)

```bash
# 3. Migrate existing Firestore data to Cloud SQL
export CLOUD_SQL_PASSWORD="your-password-from-step-1"
node scripts/migrate-firestore-to-sql.js

# This will:
# - Export all 2.4M domains from Firestore
# - Insert into Cloud SQL (ai_records + record_domains)
# - Validate row counts (must match exactly)
# - Spot-check 10 random domains for data integrity
```

**Success criteria:**
- ✅ Firestore count = Cloud SQL count (0 mismatch)
- ✅ 10/10 spot-checks pass (0 score mismatches)

**Estimated time**: 30-60 minutes (depending on record count)

**If migration fails:**
```bash
# Validate manually
node scripts/validate-migration.js

# Check specific domain
psql -h /cloudsql/alpha-search-index:us-central1:alpha-search-index-db \
     -U alpha_user -d alpha_search \
     -c "SELECT * FROM alpha_search_index WHERE entity_type='domain' AND entity_id='stripe.com';"
```

### Phase 5: Dual-Read Period (1 Week Monitoring)

The API endpoints are now configured to dual-write to both Firestore and Cloud SQL. During this period:

1. **All writes go to both systems**
2. **All reads come from Firestore** (current behavior)
3. **Discrepancies are logged** for monitoring

**Enable dual-read monitoring:**

The `functions/db/dual-read.js` module is ready but not yet integrated into the read path. This is intentional - we want to validate writes first.

**Monitor during this week:**
```bash
# Check Cloud Functions logs for dual-write success/failures
firebase functions:log --only apiHandler

# Check for discrepancies
# (Will be implemented in Phase 6 when dual-read is enabled)
```

**Success criteria:**
- ✅ Dual-write success rate > 99.9%
- ✅ No Cloud SQL connection errors
- ✅ GCS writes succeeding
- ✅ Discovery queue growing

**Estimated time**: 7 days

### Phase 6: Deploy Background Indexer

```bash
# 4. Deploy indexer service to Cloud Run
bash scripts/deploy-indexer.sh

# This will:
# - Build Docker image
# - Deploy to Cloud Run (no public access)
# - Set environment variables
# - Configure secrets
```

**Verify deployment:**
```bash
# Get service URL
gcloud run services describe alpha-search-indexer \
  --region us-central1 \
  --format='value(status.url)'

# Test health endpoint (requires auth)
gcloud run services proxy alpha-search-indexer --region us-central1
# Then: curl http://localhost:8080/health
```

**Estimated time**: 5-10 minutes

### Phase 7: Set Up Cloud Scheduler

```bash
# 5. Create Cloud Scheduler jobs
# First, update INDEXER_URL in scripts/setup-cloud-scheduler.sh with actual URL
bash scripts/setup-cloud-scheduler.sh

# This will create 4 jobs:
# - reindex-domains (hourly)
# - reindex-people (hourly at :15)
# - discover (every 6 hours)
# - snapshot (daily at 3am)
```

**Verify jobs:**
```bash
gcloud scheduler jobs list --location us-central1

# Manually trigger a test
gcloud scheduler jobs run reindex-domains --location us-central1
```

**Estimated time**: 5 minutes

### Phase 8: Cutover to Cloud SQL (After 1 Week)

**Only proceed if:**
- ✅ Dual-write success rate > 99.9%
- ✅ No data integrity issues
- ✅ All monitoring looks healthy

**Cutover steps:**

1. Enable dual-read in `functions/index.js`:
   - Update `getCachedResult()` to call `dualReadDomain()` from `functions/db/dual-read.js`
   - This will read from both systems and log discrepancies

2. Monitor for 24 hours:
   - Target: < 0.1% discrepancy rate
   - Minimum: 10,000+ queries processed

3. Final cutover:
   - Update `handleCheck()` to read from Cloud SQL first, fallback to Firestore
   - Update `handleNameSearch()` to read from Cloud SQL first
   - Disable Firestore writes to `index` collection (keep as backup)

4. Keep Firestore data for 7 days as backup, then archive

## Environment Variables Summary

### Cloud Functions

Create `functions/.env` for local development:

```bash
CLOUD_SQL_INSTANCE=alpha-search-index:us-central1:alpha-search-index-db
CLOUD_SQL_USER=alpha_user
CLOUD_SQL_PASSWORD=your-password-here
CLOUD_SQL_DATABASE=alpha_search
GCS_RAW_CRAWLS_BUCKET=alpha-search-raw-crawls
GCS_SNAPSHOTS_BUCKET=alpha-search-snapshots
GCS_ANALYTICS_BUCKET=alpha-search-analytics
```

For production, use Secret Manager (see `ENVIRONMENT_SETUP.md`).

### Cloud Run (Indexer Service)

Set via `gcloud run deploy` flags (see `scripts/deploy-indexer.sh`).

## Verification Checklist

After full deployment:

- [ ] Firebase Auth working (test login at https://alphasearch.gridnetai.com)
- [ ] User profile created on first login
- [ ] Search history saving to Firestore
- [ ] Domain crawls dual-writing to Cloud SQL + GCS
- [ ] Person searches dual-writing to Cloud SQL + GCS
- [ ] Discovery queue growing with new entities
- [ ] `/api/user/profile` returns user data
- [ ] `/api/user/history` returns search history
- [ ] `/api/index/query` reads from Cloud SQL
- [ ] Background indexer running (check Cloud Run logs)
- [ ] Cloud Scheduler jobs triggering hourly
- [ ] Daily snapshots saving to GCS

## Monitoring

### Cloud Functions Logs
```bash
firebase functions:log --only apiHandler
```

### Cloud Run Logs
```bash
gcloud run services logs read alpha-search-indexer --region us-central1 --limit 50
```

### Cloud SQL Metrics
```bash
gcloud sql operations list --instance alpha-search-index-db
```

### Discovery Queue Status
```bash
# Connect to Cloud SQL
gcloud sql connect alpha-search-index-db --user=alpha_user --database=alpha_search

# Check queue
SELECT status, COUNT(*) FROM discovery_queue GROUP BY status;
```

## Rollback Plan

If issues arise:

1. **Disable dual-write**: Comment out `dualWriteDomainResult()` and `dualWritePersonResult()` calls
2. **Revert to Firestore-only**: Deploy previous version of `functions/index.js`
3. **Keep Cloud SQL running**: Don't delete - investigate and fix
4. **Preserve data**: Cloud SQL data is safe, Firestore is still primary

## Cost Monitoring

Expected costs after full deployment:

- Firestore: ~$30/month (reduced from $50)
- Cloud SQL: ~$100/month
- Cloud Storage: ~$5/month
- Cloud Run: ~$30/month
- SerpAPI: ~$4/month (current usage)

**Total**: ~$169/month

## Next Steps After Deployment

1. **Enable Firebase Auth** in console (manual step)
2. **Run Phase 2** (Cloud SQL setup)
3. **Run Phase 3** (Migration)
4. **Monitor Phase 5** (Dual-read period)
5. **Execute Phase 8** (Cutover after validation)

## Support

For issues:
- Check logs: `firebase functions:log`
- Check GCP Console: https://console.cloud.google.com/
- Review architecture: `ALPHA_INDEX_ARCHITECTURE.md`
- Review plan: `.cursor/plans/alpha_search_ultimate_backend_*.plan.md`
