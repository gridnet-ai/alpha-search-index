const { Storage } = require('@google-cloud/storage');
const gcs = new Storage();

/**
 * Save raw crawl data to Cloud Storage
 * Organized by: raw-crawls/{entity_type}/{YYYY/MM/DD}/{entity_id}.json
 * 
 * @param {string} entity_type - domain, person, product, etc.
 * @param {string} entity_id - The canonical identifier
 * @param {Object} data - Raw crawl data to archive
 * @returns {Promise<string>} - GCS path (gs://...)
 */
async function saveRawCrawl(entity_type, entity_id, data) {
  const bucket = process.env.GCS_RAW_CRAWLS_BUCKET || 'alpha-search-raw-crawls';
  
  // Create date-based path: YYYY/MM/DD
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  
  // Sanitize entity_id for filename (remove special chars, limit length)
  const fname = entity_id
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
  
  const path = `raw-crawls/${entity_type}/${date}/${fname}.json`;
  
  try {
    await gcs
      .bucket(bucket)
      .file(path)
      .save(
        JSON.stringify({
          entity_type,
          entity_id,
          crawled_at: new Date().toISOString(),
          data
        }, null, 2),
        {
          contentType: 'application/json',
          metadata: {
            entity_type,
            entity_id,
            crawled_at: new Date().toISOString()
          }
        }
      );
    
    const gcsPath = `gs://${bucket}/${path}`;
    console.log('Raw crawl saved:', gcsPath);
    return gcsPath;
  } catch (error) {
    console.error('Failed to save raw crawl:', error);
    throw error;
  }
}

/**
 * Save daily snapshot to Cloud Storage
 * Used for analytics and historical tracking
 * 
 * @param {Object} snapshot - Snapshot data
 * @returns {Promise<string>} - GCS path
 */
async function saveSnapshot(snapshot) {
  const bucket = process.env.GCS_SNAPSHOTS_BUCKET || 'alpha-search-snapshots';
  const date = new Date().toISOString().split('T')[0];
  const path = `snapshots/${date}.json`;
  
  try {
    await gcs
      .bucket(bucket)
      .file(path)
      .save(
        JSON.stringify(snapshot, null, 2),
        { contentType: 'application/json' }
      );
    
    const gcsPath = `gs://${bucket}/${path}`;
    console.log('Snapshot saved:', gcsPath);
    return gcsPath;
  } catch (error) {
    console.error('Failed to save snapshot:', error);
    throw error;
  }
}

/**
 * Save analytics data to Cloud Storage
 * 
 * @param {string} type - analytics type (daily, weekly, monthly)
 * @param {Object} data - Analytics data
 * @returns {Promise<string>} - GCS path
 */
async function saveAnalytics(type, data) {
  const bucket = process.env.GCS_ANALYTICS_BUCKET || 'alpha-search-analytics';
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const path = `analytics/${type}/${timestamp}.json`;
  
  try {
    await gcs
      .bucket(bucket)
      .file(path)
      .save(
        JSON.stringify(data, null, 2),
        { contentType: 'application/json' }
      );
    
    const gcsPath = `gs://${bucket}/${path}`;
    console.log('Analytics saved:', gcsPath);
    return gcsPath;
  } catch (error) {
    console.error('Failed to save analytics:', error);
    throw error;
  }
}

module.exports = { 
  saveRawCrawl, 
  saveSnapshot, 
  saveAnalytics 
};
