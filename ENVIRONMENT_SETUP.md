# Environment Configuration Guide

## Cloud Functions Environment Variables

### Option 1: Using .env file (Local Development)

Create `functions/.env`:

```bash
# Cloud SQL Configuration
CLOUD_SQL_INSTANCE=alpha-search-index:us-central1:alpha-search-index-db
CLOUD_SQL_USER=alpha_user
CLOUD_SQL_PASSWORD=your-secure-password-here
CLOUD_SQL_DATABASE=alpha_search

# Cloud Storage Buckets
GCS_RAW_CRAWLS_BUCKET=alpha-search-raw-crawls
GCS_SNAPSHOTS_BUCKET=alpha-search-snapshots
GCS_ANALYTICS_BUCKET=alpha-search-analytics

# API Endpoint
API_ENDPOINT=https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler
```

### Option 2: Using Firebase Functions Config (Production)

```bash
# Cloud SQL
firebase functions:config:set \
  cloudsql.instance="alpha-search-index:us-central1:alpha-search-index-db" \
  cloudsql.user="alpha_user" \
  cloudsql.password="your-secure-password-here" \
  cloudsql.database="alpha_search"

# Cloud Storage
firebase functions:config:set \
  gcs.raw_crawls="alpha-search-raw-crawls" \
  gcs.snapshots="alpha-search-snapshots" \
  gcs.analytics="alpha-search-analytics"

# API Endpoint
firebase functions:config:set \
  api.endpoint="https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler"
```

### Option 3: Using Secret Manager (Recommended for Passwords)

```bash
# Create secret for database password
echo -n "your-secure-password" | gcloud secrets create alpha-search-db-password \
  --data-file=- \
  --replication-policy=automatic

# Grant Cloud Functions access to the secret
gcloud secrets add-iam-policy-binding alpha-search-db-password \
  --member="serviceAccount:alpha-search-index@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then in `firebase.json`, add:

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "secrets": ["alpha-search-db-password"]
  }
}
```

## Indexer Service Environment Variables

Set when deploying to Cloud Run:

```bash
gcloud run deploy alpha-search-indexer \
  --source ./indexer-service \
  --region us-central1 \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars CLOUD_SQL_INSTANCE=alpha-search-index:us-central1:alpha-search-index-db \
  --set-env-vars CLOUD_SQL_USER=alpha_user \
  --set-env-vars CLOUD_SQL_DATABASE=alpha_search \
  --set-env-vars GCS_RAW_CRAWLS_BUCKET=alpha-search-raw-crawls \
  --set-env-vars GCS_SNAPSHOTS_BUCKET=alpha-search-snapshots \
  --set-env-vars GCS_ANALYTICS_BUCKET=alpha-search-analytics \
  --set-env-vars API_ENDPOINT=https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler \
  --set-secrets CLOUD_SQL_PASSWORD=alpha-search-db-password:latest
```

## Verification

After setting environment variables, verify they're accessible:

```bash
# For Cloud Functions
firebase functions:config:get

# For Cloud Run
gcloud run services describe alpha-search-indexer --region us-central1 --format="value(spec.template.spec.containers[0].env)"
```

## Security Notes

1. **Never commit** `.env` files to Git
2. **Use Secret Manager** for sensitive values (passwords, API keys)
3. **Rotate passwords** every 90 days
4. **Limit IAM permissions** to least privilege required
5. **Enable audit logging** for database access
