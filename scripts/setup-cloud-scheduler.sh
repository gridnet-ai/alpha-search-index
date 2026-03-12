#!/bin/bash

# ============================================================================
# Cloud Scheduler Setup Script
# ============================================================================
# Creates Cloud Scheduler jobs to trigger the indexer service
# ============================================================================

set -e  # Exit on error

PROJECT_ID="alpha-search-index"
REGION="us-central1"
# IMPORTANT: Replace this with the actual Cloud Run URL from deploy-indexer.sh output
INDEXER_URL="${INDEXER_URL:-https://alpha-search-indexer-REPLACE_WITH_HASH-uc.a.run.app}"
# IMPORTANT: Verify this service account exists in your project
# Run: gcloud iam service-accounts list --filter="email~compute@developer.gserviceaccount.com"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-169073379199-compute@developer.gserviceaccount.com}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      CLOUD SCHEDULER SETUP FOR ALPHA SEARCH INDEX          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  IMPORTANT: Update INDEXER_URL in this script with your actual Cloud Run URL"
echo "   Get it from: gcloud run services describe alpha-search-indexer --region us-central1 --format='value(status.url)'"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."
echo ""

# ============================================================================
# Create Scheduler Jobs
# ============================================================================

echo "Creating Cloud Scheduler jobs..."
echo ""

# Job 1: Reindex domains every hour
echo "1. reindex-domains (every hour)"
gcloud scheduler jobs create http reindex-domains \
  --location $REGION \
  --schedule "0 * * * *" \
  --uri "$INDEXER_URL/reindex" \
  --http-method POST \
  --oidc-service-account-email $SERVICE_ACCOUNT \
  --project $PROJECT_ID \
  --time-zone "America/Los_Angeles"

echo "✅ reindex-domains created"
echo ""

# Job 2: Reindex people every hour at :15
echo "2. reindex-people (every hour at :15)"
gcloud scheduler jobs create http reindex-people \
  --location $REGION \
  --schedule "15 * * * *" \
  --uri "$INDEXER_URL/index/people" \
  --http-method POST \
  --oidc-service-account-email $SERVICE_ACCOUNT \
  --project $PROJECT_ID \
  --time-zone "America/Los_Angeles"

echo "✅ reindex-people created"
echo ""

# Job 3: Process discovery queue every 6 hours
echo "3. discover (every 6 hours)"
gcloud scheduler jobs create http discover \
  --location $REGION \
  --schedule "0 */6 * * *" \
  --uri "$INDEXER_URL/discover" \
  --http-method POST \
  --oidc-service-account-email $SERVICE_ACCOUNT \
  --project $PROJECT_ID \
  --time-zone "America/Los_Angeles"

echo "✅ discover created"
echo ""

# Job 4: Daily snapshot at 3am
echo "4. snapshot (daily at 3am)"
gcloud scheduler jobs create http snapshot \
  --location $REGION \
  --schedule "0 3 * * *" \
  --uri "$INDEXER_URL/snapshot" \
  --http-method POST \
  --oidc-service-account-email $SERVICE_ACCOUNT \
  --project $PROJECT_ID \
  --time-zone "America/Los_Angeles"

echo "✅ snapshot created"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Cloud Scheduler jobs created:"
echo "  1. reindex-domains  - Every hour (0 * * * *)"
echo "  2. reindex-people   - Every hour at :15 (15 * * * *)"
echo "  3. discover         - Every 6 hours (0 */6 * * *)"
echo "  4. snapshot         - Daily at 3am (0 3 * * *)"
echo ""
echo "View jobs:"
echo "  gcloud scheduler jobs list --location $REGION"
echo ""
echo "Manually trigger a job:"
echo "  gcloud scheduler jobs run reindex-domains --location $REGION"
echo ""
echo "View job logs:"
echo "  gcloud logging read 'resource.type=cloud_scheduler_job' --limit 50"
echo ""
