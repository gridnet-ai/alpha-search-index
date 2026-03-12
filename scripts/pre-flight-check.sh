#!/bin/bash

# ============================================================================
# Pre-Flight Verification Script
# ============================================================================
# Run this BEFORE executing any deployment scripts
# All checks must pass before proceeding
# ============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         PRE-FLIGHT VERIFICATION FOR DEPLOYMENT             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# ============================================================================
# Check 1: GCP Project
# ============================================================================

echo "Check 1: Verifying GCP project..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ "$PROJECT_ID" = "alpha-search-index" ]; then
  echo "  ✅ PASS: Project is 'alpha-search-index'"
  ((PASS_COUNT++))
else
  echo "  ❌ FAIL: Project is '$PROJECT_ID' (expected: alpha-search-index)"
  echo "  Fix: gcloud config set project alpha-search-index"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================================
# Check 2: Cloud SQL Script Flags
# ============================================================================

echo "Check 2: Verifying setup-cloud-sql.sh has required flags..."

if grep -q "retained-backups-count=7" scripts/setup-cloud-sql.sh; then
  echo "  ✅ PASS: --retained-backups-count=7 present"
  ((PASS_COUNT++))
else
  echo "  ❌ FAIL: --retained-backups-count=7 missing"
  echo "  Fix: Add '--retained-backups-count=7 \\' to gcloud sql instances create command"
  ((FAIL_COUNT++))
fi

if grep -q "no-assign-ip" scripts/setup-cloud-sql.sh; then
  echo "  ✅ PASS: --no-assign-ip present (private IP only)"
  ((PASS_COUNT++))
else
  echo "  ❌ FAIL: --no-assign-ip missing (database will get public IP!)"
  echo "  Fix: Add '--no-assign-ip \\' to gcloud sql instances create command"
  ((FAIL_COUNT++))
fi

if grep -q "network=default" scripts/setup-cloud-sql.sh; then
  echo "  ✅ PASS: --network=default present"
  ((PASS_COUNT++))
else
  echo "  ⚠️  WARN: --network=default missing (may fail to connect)"
  echo "  Fix: Add '--network=default \\' to gcloud sql instances create command"
  ((WARN_COUNT++))
fi
echo ""

# ============================================================================
# Check 3: Service Account
# ============================================================================

echo "Check 3: Retrieving service account email..."
SERVICE_ACCOUNT=$(gcloud iam service-accounts list \
  --filter="email~compute@developer.gserviceaccount.com" \
  --format="value(email)" 2>/dev/null | head -n 1)

if [ -n "$SERVICE_ACCOUNT" ]; then
  echo "  ✅ PASS: Service account found"
  echo "  📋 SAVE THIS: $SERVICE_ACCOUNT"
  echo "  You'll need this for Step 4b (Cloud Scheduler setup)"
  ((PASS_COUNT++))
else
  echo "  ❌ FAIL: No compute service account found"
  echo "  This is unusual. Check your GCP project permissions."
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================================
# Check 4: Required APIs
# ============================================================================

echo "Check 4: Verifying required APIs are enabled..."

REQUIRED_APIS=(
  "sqladmin.googleapis.com"
  "secretmanager.googleapis.com"
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "cloudscheduler.googleapis.com"
)

for API in "${REQUIRED_APIS[@]}"; do
  if gcloud services list --enabled --filter="name:$API" --format="value(name)" 2>/dev/null | grep -q "$API"; then
    echo "  ✅ $API enabled"
    ((PASS_COUNT++))
  else
    echo "  ❌ $API NOT enabled"
    echo "  Fix: gcloud services enable $API"
    ((FAIL_COUNT++))
  fi
done
echo ""

# ============================================================================
# Check 5: Firestore Field Name Reminder
# ============================================================================

echo "Check 5: Firestore score field name..."
echo "  ⚠️  MANUAL CHECK REQUIRED:"
echo "  1. Open Firebase Console → Firestore → 'index' collection"
echo "  2. Open 2-3 documents"
echo "  3. Verify score field is named 'alphaRankScore' or 'score'"
echo "  4. If different, update line 90 in scripts/migrate-firestore-to-sql.js"
echo ""
read -p "Have you verified the Firestore field name? (y/n): " FIRESTORE_CHECK

if [ "$FIRESTORE_CHECK" = "y" ] || [ "$FIRESTORE_CHECK" = "Y" ]; then
  echo "  ✅ PASS: Firestore field name verified"
  ((PASS_COUNT++))
else
  echo "  ❌ FAIL: Firestore field name not verified"
  echo "  You MUST verify this before running the migration script"
  ((FAIL_COUNT++))
fi
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   VERIFICATION SUMMARY                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed:  $PASS_COUNT"
echo "  ⚠️  Warnings: $WARN_COUNT"
echo "  ❌ Failed:  $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  ✅ ALL CHECKS PASSED — READY FOR DEPLOYMENT              ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Next steps:"
  echo "  1. Save your service account email: $SERVICE_ACCOUNT"
  echo "  2. Run: bash scripts/setup-cloud-sql.sh"
  echo "  3. Run: bash scripts/setup-gcs-buckets.sh"
  echo "  4. Run migration (see DEPLOYMENT_QUICK_START.md for environment-specific commands)"
  echo ""
  exit 0
else
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  ❌ DEPLOYMENT BLOCKED — FIX FAILURES BEFORE PROCEEDING   ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Fix all failed checks above, then re-run this script."
  echo ""
  exit 1
fi
