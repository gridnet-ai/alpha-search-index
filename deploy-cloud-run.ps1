# PowerShell Script to Deploy Cloud Run Puppeteer Scraper
# Usage: .\deploy-cloud-run.ps1

Write-Host "`n=== Cloud Run Deployment Script ===" -ForegroundColor Cyan
Write-Host "This script will deploy the Puppeteer scraper to Cloud Run`n" -ForegroundColor Cyan

# Check if gcloud is installed
Write-Host "Checking gcloud CLI..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-String "Google Cloud SDK"
    Write-Host "✓ gcloud CLI found: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ gcloud CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "  Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

# Check current project
Write-Host "`nChecking GCP project..." -ForegroundColor Yellow
$currentProject = gcloud config get-value project 2>$null
if ($currentProject -ne "alpha-search-index") {
    Write-Host "✗ Current project is '$currentProject', expected 'alpha-search-index'" -ForegroundColor Red
    Write-Host "  Setting project..." -ForegroundColor Yellow
    gcloud config set project alpha-search-index
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to set project. Please check your GCP access." -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Project set to: alpha-search-index" -ForegroundColor Green

# Check authentication
Write-Host "`nChecking authentication..." -ForegroundColor Yellow
$account = gcloud config get-value account 2>$null
if ([string]::IsNullOrEmpty($account)) {
    Write-Host "✗ Not authenticated. Please run: gcloud auth login" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Authenticated as: $account" -ForegroundColor Green

# Enable required APIs
Write-Host "`nEnabling required APIs..." -ForegroundColor Yellow
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor Gray
    gcloud services enable $api --project=alpha-search-index 2>$null
}
Write-Host "✓ APIs enabled" -ForegroundColor Green

# Navigate to scraper-service directory
Write-Host "`nNavigating to scraper-service directory..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serviceDir = Join-Path $scriptDir "scraper-service"

if (-not (Test-Path $serviceDir)) {
    Write-Host "✗ scraper-service directory not found at: $serviceDir" -ForegroundColor Red
    exit 1
}

Set-Location $serviceDir
Write-Host "✓ In directory: $serviceDir" -ForegroundColor Green

# Confirm deployment
Write-Host "`n=== Ready to Deploy ===" -ForegroundColor Cyan
Write-Host "Service: alpha-search-scraper" -ForegroundColor White
Write-Host "Region: us-central1" -ForegroundColor White
Write-Host "Memory: 2Gi" -ForegroundColor White
Write-Host "CPU: 2" -ForegroundColor White
Write-Host "Min Instances: 1 (keeps warm, ~`$138/month)" -ForegroundColor White
Write-Host "`nThis will take 5-10 minutes to build and deploy.`n" -ForegroundColor Yellow

$confirm = Read-Host "Continue with deployment? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Deploy to Cloud Run
Write-Host "`n=== Deploying to Cloud Run ===" -ForegroundColor Cyan
Write-Host "Building container and deploying... (this will take several minutes)`n" -ForegroundColor Yellow

$deployCommand = @"
gcloud run deploy alpha-search-scraper ``
  --source . ``
  --region us-central1 ``
  --platform managed ``
  --allow-unauthenticated ``
  --memory 2Gi ``
  --cpu 2 ``
  --timeout 60 ``
  --concurrency 5 ``
  --min-instances 1 ``
  --project alpha-search-index
"@

Write-Host "Running command:" -ForegroundColor Gray
Write-Host $deployCommand -ForegroundColor DarkGray
Write-Host ""

Invoke-Expression $deployCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Red
    Write-Host "`nCommon issues:" -ForegroundColor Yellow
    Write-Host "  - Billing not enabled: https://console.cloud.google.com/billing?project=alpha-search-index" -ForegroundColor Gray
    Write-Host "  - Missing permissions: Check IAM roles at https://console.cloud.google.com/iam-admin/iam?project=alpha-search-index" -ForegroundColor Gray
    exit 1
}

# Extract service URL from gcloud output
Write-Host "`n=== Deployment Successful! ===" -ForegroundColor Green

$serviceUrl = gcloud run services describe alpha-search-scraper `
    --region us-central1 `
    --project alpha-search-index `
    --format="value(status.url)" 2>$null

if ([string]::IsNullOrEmpty($serviceUrl)) {
    Write-Host "✗ Could not retrieve service URL" -ForegroundColor Red
    Write-Host "  Please check Cloud Run console: https://console.cloud.google.com/run?project=alpha-search-index" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nService URL: $serviceUrl" -ForegroundColor Cyan

# Update .env file
Write-Host "`n=== Updating Environment Configuration ===" -ForegroundColor Cyan
$envFile = Join-Path $scriptDir "functions\.env"

if (Test-Path $envFile) {
    # Read existing .env content
    $envContent = Get-Content $envFile -Raw
    
    # Check if SCRAPER_URL already exists
    if ($envContent -match "SCRAPER_URL=") {
        # Replace existing SCRAPER_URL
        $envContent = $envContent -replace "SCRAPER_URL=.*", "SCRAPER_URL=$serviceUrl"
        Write-Host "✓ Updated existing SCRAPER_URL in functions\.env" -ForegroundColor Green
    } else {
        # Append SCRAPER_URL
        $envContent += "`nSCRAPER_URL=$serviceUrl`n"
        Write-Host "✓ Added SCRAPER_URL to functions\.env" -ForegroundColor Green
    }
    
    Set-Content -Path $envFile -Value $envContent -NoNewline
} else {
    # Create new .env file
    Set-Content -Path $envFile -Value "SCRAPER_URL=$serviceUrl`n"
    Write-Host "✓ Created functions\.env with SCRAPER_URL" -ForegroundColor Green
}

# Next steps
Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Test the Cloud Run service:" -ForegroundColor White
Write-Host "   `$env:SCRAPER_URL='$serviceUrl'" -ForegroundColor Gray
Write-Host "   node test-cloud-run.js" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart your Firebase dev server:" -ForegroundColor White
Write-Host "   Press Ctrl+C in the terminal where it's running" -ForegroundColor Gray
Write-Host "   Then run: firebase serve --only `"functions,hosting`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test in browser:" -ForegroundColor White
Write-Host "   Go to http://localhost:5000" -ForegroundColor Gray
Write-Host "   Search for: Michael Jordan" -ForegroundColor Gray
Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
