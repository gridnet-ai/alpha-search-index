# Alpha Search Indexer Service

Background indexer service for Alpha Search Index. Runs on Cloud Run and handles:

- Re-crawling expired domain records
- Re-crawling expired people records
- Processing the discovery queue
- Creating daily snapshots

## Routes

### `POST /reindex`
Re-crawl expired domain records (100 at a time).

**Response:**
```json
{
  "success": true,
  "processed": 100,
  "successful": 98,
  "failed": 2,
  "results": [...]
}
```

### `POST /index/people`
Re-crawl expired people records (50 at a time).

### `POST /discover`
Process discovery queue by priority (100 at a time).

### `POST /snapshot`
Create daily snapshot of index stats and save to Cloud Storage.

### `GET /health`
Health check endpoint.

## Environment Variables

- `CLOUD_SQL_INSTANCE` - Cloud SQL instance connection name
- `CLOUD_SQL_USER` - Database user
- `CLOUD_SQL_PASSWORD` - Database password
- `CLOUD_SQL_DATABASE` - Database name
- `API_ENDPOINT` - Alpha Search API endpoint
- `GCS_SNAPSHOTS_BUCKET` - Cloud Storage bucket for snapshots
- `PORT` - Server port (default: 8080)

## Deployment

```bash
gcloud run deploy alpha-search-indexer \
  --source . \
  --region us-central1 \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-env-vars CLOUD_SQL_INSTANCE=alpha-search-index:us-central1:alpha-search-index-db \
  --set-env-vars CLOUD_SQL_USER=alpha_user \
  --set-env-vars CLOUD_SQL_DATABASE=alpha_search \
  --set-secrets CLOUD_SQL_PASSWORD=alpha-search-db-password:latest
```

## Cloud Scheduler Setup

Create jobs to trigger the indexer routes:

```bash
# Reindex domains every hour
gcloud scheduler jobs create http reindex-domains \
  --location us-central1 \
  --schedule "0 * * * *" \
  --uri "https://alpha-search-indexer-[hash]-uc.a.run.app/reindex" \
  --http-method POST \
  --oidc-service-account-email [service-account]@alpha-search-index.iam.gserviceaccount.com

# Reindex people every hour at :15
gcloud scheduler jobs create http reindex-people \
  --location us-central1 \
  --schedule "15 * * * *" \
  --uri "https://alpha-search-indexer-[hash]-uc.a.run.app/index/people" \
  --http-method POST \
  --oidc-service-account-email [service-account]@alpha-search-index.iam.gserviceaccount.com

# Process discovery queue every 6 hours
gcloud scheduler jobs create http discover \
  --location us-central1 \
  --schedule "0 */6 * * *" \
  --uri "https://alpha-search-indexer-[hash]-uc.a.run.app/discover" \
  --http-method POST \
  --oidc-service-account-email [service-account]@alpha-search-index.iam.gserviceaccount.com

# Daily snapshot at 3am
gcloud scheduler jobs create http snapshot \
  --location us-central1 \
  --schedule "0 3 * * *" \
  --uri "https://alpha-search-indexer-[hash]-uc.a.run.app/snapshot" \
  --http-method POST \
  --oidc-service-account-email [service-account]@alpha-search-index.iam.gserviceaccount.com
```
