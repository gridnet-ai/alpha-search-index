#!/bin/bash

# ============================================================================
# Cloud SQL Setup Script
# ============================================================================
# This script provisions the Cloud SQL PostgreSQL instance and sets up
# the database schema for Alpha Search Index
# ============================================================================

set -e  # Exit on error

PROJECT_ID="alpha-search-index"
REGION="us-central1"
INSTANCE_NAME="alpha-search-index-db"
DB_NAME="alpha_search"
DB_USER="alpha_user"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          CLOUD SQL SETUP FOR ALPHA SEARCH INDEX            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Step 1: Provision Cloud SQL Instance
# ============================================================================

echo "Step 1: Provisioning Cloud SQL PostgreSQL 15 instance..."
echo "  Instance: $INSTANCE_NAME"
echo "  Region: $REGION"
echo "  Tier: db-f1-micro (shared CPU, 0.6 GB RAM) - CHEAPEST"
echo "  Storage: 10 GB SSD (auto-increase enabled)"
echo ""

gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-size=10GB \
  --storage-type=SSD \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --retained-backups-count=7 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --no-assign-ip \
  --network=default \
  --project=$PROJECT_ID

echo "✅ Cloud SQL instance created"
echo ""

# ============================================================================
# Step 2: Create Database and User
# ============================================================================

echo "Step 2: Creating database and user..."
echo ""

# Create database
gcloud sql databases create $DB_NAME \
  --instance=$INSTANCE_NAME \
  --project=$PROJECT_ID

echo "✅ Database '$DB_NAME' created"

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32)
echo "Generated secure password (save this!):"
echo "$DB_PASSWORD"
echo ""

# Create user
gcloud sql users create $DB_USER \
  --instance=$INSTANCE_NAME \
  --password="$DB_PASSWORD" \
  --project=$PROJECT_ID

echo "✅ User '$DB_USER' created"
echo ""

# ============================================================================
# Step 3: Store Password in Secret Manager
# ============================================================================

echo "Step 3: Storing password in Secret Manager..."
echo ""

echo -n "$DB_PASSWORD" | gcloud secrets create alpha-search-db-password \
  --data-file=- \
  --replication-policy=automatic \
  --project=$PROJECT_ID

echo "✅ Password stored in Secret Manager"
echo ""

# Grant access to Cloud Functions service account
gcloud secrets add-iam-policy-binding alpha-search-db-password \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

echo "✅ Secret access granted to Cloud Functions"
echo ""

# Grant access to Cloud Run service account (for indexer)
gcloud secrets add-iam-policy-binding alpha-search-db-password \
  --member="serviceAccount:169073379199-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

echo "✅ Secret access granted to Cloud Run"
echo ""

# ============================================================================
# Step 4: Run Schema SQL
# ============================================================================

echo "Step 4: Applying database schema..."
echo ""

# Connect and run schema
gcloud sql connect $INSTANCE_NAME \
  --user=$DB_USER \
  --database=$DB_NAME \
  --project=$PROJECT_ID < functions/db/schema.sql

echo "✅ Database schema applied"
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Cloud SQL Instance: $INSTANCE_NAME"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: Stored in Secret Manager (alpha-search-db-password)"
echo ""
echo "Connection String:"
echo "  $PROJECT_ID:$REGION:$INSTANCE_NAME"
echo ""
echo "Next steps:"
echo "1. Update functions/.env with connection details"
echo "2. Run migration: node scripts/migrate-firestore-to-sql.js"
echo "3. Deploy Cloud Functions: firebase deploy --only functions"
echo "4. Deploy Indexer Service: cd indexer-service && gcloud run deploy ..."
echo ""
