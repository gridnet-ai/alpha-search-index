#!/bin/bash

# ============================================================================
# Cloud Storage Buckets Setup Script
# ============================================================================
# Creates GCS buckets for Alpha Search Index with lifecycle policies
# ============================================================================

set -e  # Exit on error

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

# Use project-specific bucket names to ensure global uniqueness
RAW_CRAWLS_BUCKET="${PROJECT_ID}-raw-crawls"
SNAPSHOTS_BUCKET="${PROJECT_ID}-snapshots"
ANALYTICS_BUCKET="${PROJECT_ID}-analytics"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       CLOUD STORAGE SETUP FOR ALPHA SEARCH INDEX           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Project: $PROJECT_ID"
echo ""

# ============================================================================
# Create Buckets
# ============================================================================

echo "Creating Cloud Storage buckets..."
echo ""

# Bucket 1: Raw Crawls (90-day retention)
echo "1. $RAW_CRAWLS_BUCKET (90-day retention)"
gsutil mb -p $PROJECT_ID -l $REGION gs://$RAW_CRAWLS_BUCKET

# Bucket 2: Snapshots (30-day retention)
echo "2. $SNAPSHOTS_BUCKET (30-day retention)"
gsutil mb -p $PROJECT_ID -l $REGION gs://$SNAPSHOTS_BUCKET

# Bucket 3: Analytics (indefinite retention)
echo "3. $ANALYTICS_BUCKET (indefinite retention)"
gsutil mb -p $PROJECT_ID -l $REGION gs://$ANALYTICS_BUCKET

echo ""
echo "✅ All buckets created"
echo ""

# ============================================================================
# Set Lifecycle Policies
# ============================================================================

echo "Setting lifecycle policies..."
echo ""

# Policy for raw-crawls: Delete after 90 days
cat > /tmp/lifecycle-raw-crawls.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle-raw-crawls.json gs://$RAW_CRAWLS_BUCKET
echo "✅ Raw crawls: 90-day auto-delete"

# Policy for snapshots: Delete after 30 days
cat > /tmp/lifecycle-snapshots.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set /tmp/lifecycle-snapshots.json gs://$SNAPSHOTS_BUCKET
echo "✅ Snapshots: 30-day auto-delete"

# Analytics: No lifecycle policy (indefinite retention)
echo "✅ Analytics: Indefinite retention (no policy)"
echo ""

# ============================================================================
# Set IAM Permissions
# ============================================================================

echo "Setting IAM permissions..."
echo ""

# Grant Cloud Functions access
gsutil iam ch \
  serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:roles/storage.objectAdmin \
  gs://$RAW_CRAWLS_BUCKET

gsutil iam ch \
  serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:roles/storage.objectAdmin \
  gs://$SNAPSHOTS_BUCKET

gsutil iam ch \
  serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:roles/storage.objectAdmin \
  gs://$ANALYTICS_BUCKET

echo "✅ Cloud Functions access granted"

# Grant Cloud Run access (for indexer service)
COMPUTE_SA=$(gcloud iam service-accounts list --filter="email~compute@developer.gserviceaccount.com" --format="value(email)" | head -n 1)

gsutil iam ch \
  serviceAccount:$COMPUTE_SA:roles/storage.objectAdmin \
  gs://$RAW_CRAWLS_BUCKET

gsutil iam ch \
  serviceAccount:$COMPUTE_SA:roles/storage.objectAdmin \
  gs://$SNAPSHOTS_BUCKET

gsutil iam ch \
  serviceAccount:$COMPUTE_SA:roles/storage.objectAdmin \
  gs://$ANALYTICS_BUCKET

echo "✅ Cloud Run access granted"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Buckets created:"
echo "  1. gs://$RAW_CRAWLS_BUCKET (90-day retention)"
echo "  2. gs://$SNAPSHOTS_BUCKET (30-day retention)"
echo "  3. gs://$ANALYTICS_BUCKET (indefinite)"
echo ""
echo "Environment variables to use:"
echo "  GCS_RAW_CRAWLS_BUCKET=$RAW_CRAWLS_BUCKET"
echo "  GCS_SNAPSHOTS_BUCKET=$SNAPSHOTS_BUCKET"
echo "  GCS_ANALYTICS_BUCKET=$ANALYTICS_BUCKET"
echo ""
echo "Next steps:"
echo "1. Update Firebase Functions config with these bucket names"
echo "2. Test storage access: gsutil ls gs://$RAW_CRAWLS_BUCKET"
echo ""
