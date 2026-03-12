#!/bin/bash

# ============================================================================
# Cloud Storage Buckets Setup Script
# ============================================================================
# Creates GCS buckets for Alpha Search Index with lifecycle policies
# ============================================================================

set -e  # Exit on error

PROJECT_ID="alpha-search-index"
REGION="us-central1"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       CLOUD STORAGE SETUP FOR ALPHA SEARCH INDEX           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Create Buckets
# ============================================================================

echo "Creating Cloud Storage buckets..."
echo ""

# Bucket 1: Raw Crawls (90-day retention)
echo "1. alpha-search-raw-crawls (90-day retention)"
gsutil mb -p $PROJECT_ID -l $REGION gs://alpha-search-raw-crawls

# Bucket 2: Snapshots (30-day retention)
echo "2. alpha-search-snapshots (30-day retention)"
gsutil mb -p $PROJECT_ID -l $REGION gs://alpha-search-snapshots

# Bucket 3: Analytics (indefinite retention)
echo "3. alpha-search-analytics (indefinite retention)"
gsutil mb -p $PROJECT_ID -l $REGION gs://alpha-search-analytics

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

gsutil lifecycle set /tmp/lifecycle-raw-crawls.json gs://alpha-search-raw-crawls
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

gsutil lifecycle set /tmp/lifecycle-snapshots.json gs://alpha-search-snapshots
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
  gs://alpha-search-raw-crawls

gsutil iam ch \
  serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:roles/storage.objectAdmin \
  gs://alpha-search-snapshots

gsutil iam ch \
  serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:roles/storage.objectAdmin \
  gs://alpha-search-analytics

echo "✅ Cloud Functions access granted"

# Grant Cloud Run access (for indexer service)
gsutil iam ch \
  serviceAccount:169073379199-compute@developer.gserviceaccount.com:roles/storage.objectAdmin \
  gs://alpha-search-raw-crawls

gsutil iam ch \
  serviceAccount:169073379199-compute@developer.gserviceaccount.com:roles/storage.objectAdmin \
  gs://alpha-search-snapshots

gsutil iam ch \
  serviceAccount:169073379199-compute@developer.gserviceaccount.com:roles/storage.objectAdmin \
  gs://alpha-search-analytics

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
echo "  1. gs://alpha-search-raw-crawls (90-day retention)"
echo "  2. gs://alpha-search-snapshots (30-day retention)"
echo "  3. gs://alpha-search-analytics (indefinite)"
echo ""
echo "Next steps:"
echo "1. Update environment variables with bucket names"
echo "2. Test storage access: gsutil ls gs://alpha-search-raw-crawls"
echo ""
