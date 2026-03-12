#!/bin/bash

# ============================================================================
# Deploy Indexer Service to Cloud Run
# ============================================================================

set -e  # Exit on error

PROJECT_ID="alpha-search-index"
REGION="us-central1"
SERVICE_NAME="alpha-search-indexer"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         DEPLOYING ALPHA SEARCH INDEXER SERVICE             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd indexer-service

echo "Deploying to Cloud Run..."
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Memory: 1Gi"
echo "  Timeout: 300s (5 minutes)"
echo ""

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --set-env-vars CLOUD_SQL_INSTANCE=alpha-search-index:us-central1:alpha-search-index-db \
  --set-env-vars CLOUD_SQL_USER=alpha_user \
  --set-env-vars CLOUD_SQL_DATABASE=alpha_search \
  --set-env-vars GCS_RAW_CRAWLS_BUCKET=alpha-search-raw-crawls \
  --set-env-vars GCS_SNAPSHOTS_BUCKET=alpha-search-snapshots \
  --set-env-vars GCS_ANALYTICS_BUCKET=alpha-search-analytics \
  --set-env-vars API_ENDPOINT=https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler \
  --set-secrets CLOUD_SQL_PASSWORD=alpha-search-db-password:latest \
  --project $PROJECT_ID

echo ""
echo "✅ Indexer service deployed"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(status.url)')

echo "Service URL: $SERVICE_URL"
echo ""
echo "Test health endpoint:"
echo "  curl $SERVICE_URL/health"
echo ""
echo "Next steps:"
echo "1. Update scripts/setup-cloud-scheduler.sh with the service URL"
echo "2. Run: bash scripts/setup-cloud-scheduler.sh"
echo ""
