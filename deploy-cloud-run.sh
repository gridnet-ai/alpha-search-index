#!/bin/bash
# Bash Script to Deploy Cloud Run Puppeteer Scraper
# Usage: ./deploy-cloud-run.sh

set -e

echo ""
echo "=== Cloud Run Deployment Script ==="
echo "This script will deploy the Puppeteer scraper to Cloud Run"
echo ""

# Check if gcloud is installed
echo "Checking gcloud CLI..."
if ! command -v gcloud &> /dev/null; then
    echo "✗ gcloud CLI not found. Please install it first."
    echo "  Download from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo "✓ gcloud CLI found"

# Check current project
echo ""
echo "Checking GCP project..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "alpha-search-index" ]; then
    echo "✗ Current project is '$CURRENT_PROJECT', expected 'alpha-search-index'"
    echo "  Setting project..."
    gcloud config set project alpha-search-index
fi
echo "✓ Project set to: alpha-search-index"

# Check authentication
echo ""
echo "Checking authentication..."
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
    echo "✗ Not authenticated. Please run: gcloud auth login"
    exit 1
fi
echo "✓ Authenticated as: $ACCOUNT"

# Enable required APIs
echo ""
echo "Enabling required APIs..."
gcloud services enable run.googleapis.com --project=alpha-search-index 2>/dev/null
gcloud services enable cloudbuild.googleapis.com --project=alpha-search-index 2>/dev/null
gcloud services enable artifactregistry.googleapis.com --project=alpha-search-index 2>/dev/null
echo "✓ APIs enabled"

# Navigate to scraper-service directory
echo ""
echo "Navigating to scraper-service directory..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_DIR="$SCRIPT_DIR/scraper-service"

if [ ! -d "$SERVICE_DIR" ]; then
    echo "✗ scraper-service directory not found at: $SERVICE_DIR"
    exit 1
fi

cd "$SERVICE_DIR"
echo "✓ In directory: $SERVICE_DIR"

# Confirm deployment
echo ""
echo "=== Ready to Deploy ==="
echo "Service: alpha-search-scraper"
echo "Region: us-central1"
echo "Memory: 2Gi"
echo "CPU: 2"
echo "Min Instances: 1 (keeps warm, ~\$138/month)"
echo ""
echo "This will take 5-10 minutes to build and deploy."
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy to Cloud Run
echo ""
echo "=== Deploying to Cloud Run ==="
echo "Building container and deploying... (this will take several minutes)"
echo ""

gcloud run deploy alpha-search-scraper \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 5 \
  --min-instances 1 \
  --project alpha-search-index

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ Deployment failed!"
    echo "Check the error messages above for details."
    echo ""
    echo "Common issues:"
    echo "  - Billing not enabled: https://console.cloud.google.com/billing?project=alpha-search-index"
    echo "  - Missing permissions: Check IAM roles at https://console.cloud.google.com/iam-admin/iam?project=alpha-search-index"
    exit 1
fi

# Extract service URL
echo ""
echo "=== Deployment Successful! ==="
echo ""

SERVICE_URL=$(gcloud run services describe alpha-search-scraper \
    --region us-central1 \
    --project alpha-search-index \
    --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo "✗ Could not retrieve service URL"
    echo "  Please check Cloud Run console: https://console.cloud.google.com/run?project=alpha-search-index"
    exit 1
fi

echo "Service URL: $SERVICE_URL"

# Update .env file
echo ""
echo "=== Updating Environment Configuration ==="
ENV_FILE="$SCRIPT_DIR/functions/.env"

if [ -f "$ENV_FILE" ]; then
    # Check if SCRAPER_URL already exists
    if grep -q "SCRAPER_URL=" "$ENV_FILE"; then
        # Replace existing SCRAPER_URL
        sed -i.bak "s|SCRAPER_URL=.*|SCRAPER_URL=$SERVICE_URL|" "$ENV_FILE"
        echo "✓ Updated existing SCRAPER_URL in functions/.env"
    else
        # Append SCRAPER_URL
        echo "" >> "$ENV_FILE"
        echo "SCRAPER_URL=$SERVICE_URL" >> "$ENV_FILE"
        echo "✓ Added SCRAPER_URL to functions/.env"
    fi
else
    # Create new .env file
    echo "SCRAPER_URL=$SERVICE_URL" > "$ENV_FILE"
    echo "✓ Created functions/.env with SCRAPER_URL"
fi

# Next steps
echo ""
echo "=== Next Steps ==="
echo "1. Test the Cloud Run service:"
echo "   export SCRAPER_URL='$SERVICE_URL'"
echo "   node test-cloud-run.js"
echo ""
echo "2. Restart your Firebase dev server:"
echo "   Press Ctrl+C in the terminal where it's running"
echo "   Then run: firebase serve --only \"functions,hosting\""
echo ""
echo "3. Test in browser:"
echo "   Go to http://localhost:5000"
echo "   Search for: Michael Jordan"
echo ""
echo "=== Deployment Complete! ==="
echo ""
