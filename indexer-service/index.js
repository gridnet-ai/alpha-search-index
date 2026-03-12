const express = require('express');
const admin = require('firebase-admin');
const { Connector } = require('@google-cloud/cloud-sql-connector');
const pg = require('pg');
const { Storage } = require('@google-cloud/storage');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const app = express();
app.use(express.json());

const gcs = new Storage();
let pool = null;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

async function getPool() {
  if (pool) return pool;

  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.CLOUD_SQL_INSTANCE ||
      'alpha-search-index:us-central1:alpha-search-index-db',
    ipType: 'PRIVATE',
  });

  pool = new pg.Pool({
    ...clientOpts,
    user: process.env.CLOUD_SQL_USER || 'alpha_user',
    password: process.env.CLOUD_SQL_PASSWORD,
    database: process.env.CLOUD_SQL_DATABASE || 'alpha_search',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => console.error('Pool error:', err));
  return pool;
}

async function query(text, params) {
  const p = await getPool();
  return p.query(text, params);
}

// ============================================================================
// ROUTE: POST /reindex
// ============================================================================
// Re-crawl expired domain records (100 at a time)

app.post('/reindex', async (req, res) => {
  console.log('[REINDEX] Starting domain re-indexing job');
  
  try {
    // Get expired domains
    const { rows: expiredDomains } = await query(
      `SELECT entity_type, entity_id, last_crawled_at
       FROM ai_records
       WHERE entity_type = 'domain'
         AND cache_valid_until < NOW()
       ORDER BY last_crawled_at ASC
       LIMIT 100`
    );
    
    console.log(`[REINDEX] Found ${expiredDomains.length} expired domains`);
    
    if (expiredDomains.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No expired domains to re-index',
        processed: 0 
      });
    }
    
    // Re-crawl each domain by calling the main API
    const results = [];
    for (const record of expiredDomains) {
      try {
        const domain = record.entity_id;
        console.log(`[REINDEX] Re-crawling ${domain}`);
        
        // Call the /api/check endpoint to re-crawl
        const apiUrl = process.env.API_ENDPOINT || 
          'https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler';
        
        const response = await fetch(`${apiUrl}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: domain })
        });
        
        const data = await response.json();
        results.push({ domain, success: true, score: data.score });
      } catch (error) {
        console.error(`[REINDEX] Failed to re-crawl ${record.entity_id}:`, error.message);
        results.push({ domain: record.entity_id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[REINDEX] Completed: ${successCount}/${expiredDomains.length} successful`);
    
    res.json({
      success: true,
      processed: expiredDomains.length,
      successful: successCount,
      failed: expiredDomains.length - successCount,
      results
    });
  } catch (error) {
    console.error('[REINDEX] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROUTE: POST /index/people
// ============================================================================
// Re-crawl expired person records

app.post('/index/people', async (req, res) => {
  console.log('[INDEX-PEOPLE] Starting people re-indexing job');
  
  try {
    // Get expired people records
    const { rows: expiredPeople } = await query(
      `SELECT entity_type, entity_id, last_crawled_at
       FROM ai_records
       WHERE entity_type = 'person'
         AND cache_valid_until < NOW()
       ORDER BY last_crawled_at ASC
       LIMIT 50`
    );
    
    console.log(`[INDEX-PEOPLE] Found ${expiredPeople.length} expired person records`);
    
    if (expiredPeople.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No expired people to re-index',
        processed: 0 
      });
    }
    
    // Re-crawl each person
    const results = [];
    for (const record of expiredPeople) {
      try {
        const name = record.entity_id;
        console.log(`[INDEX-PEOPLE] Re-crawling ${name}`);
        
        // Call the /api/search endpoint to re-crawl
        const apiUrl = process.env.API_ENDPOINT || 
          'https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler';
        
        const response = await fetch(`${apiUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        
        const data = await response.json();
        results.push({ name, success: true, score: data.avgScore });
      } catch (error) {
        console.error(`[INDEX-PEOPLE] Failed to re-crawl ${record.entity_id}:`, error.message);
        results.push({ name: record.entity_id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[INDEX-PEOPLE] Completed: ${successCount}/${expiredPeople.length} successful`);
    
    res.json({
      success: true,
      processed: expiredPeople.length,
      successful: successCount,
      failed: expiredPeople.length - successCount,
      results
    });
  } catch (error) {
    console.error('[INDEX-PEOPLE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROUTE: POST /discover
// ============================================================================
// Process discovery queue by priority

app.post('/discover', async (req, res) => {
  console.log('[DISCOVER] Starting discovery queue processing');
  
  try {
    // Get pending items from discovery queue
    const { rows: queueItems } = await query(
      `SELECT id, entity_type, entity_id, discovery_source, priority_score
       FROM discovery_queue
       WHERE status = 'pending'
       ORDER BY priority_score DESC, discovered_at ASC
       LIMIT 100`
    );
    
    console.log(`[DISCOVER] Found ${queueItems.length} pending items`);
    
    if (queueItems.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Discovery queue is empty',
        processed: 0 
      });
    }
    
    // Process each item
    const results = [];
    for (const item of queueItems) {
      try {
        console.log(`[DISCOVER] Processing ${item.entity_type}:${item.entity_id} (priority: ${item.priority_score})`);
        
        // Mark as processing
        await query(
          `UPDATE discovery_queue SET status = 'processing', last_attempt_at = NOW()
           WHERE id = $1`,
          [item.id]
        );
        
        // Call appropriate API endpoint based on entity type
        const apiUrl = process.env.API_ENDPOINT || 
          'https://us-central1-alpha-search-index.cloudfunctions.net/apiHandler';
        
        let endpoint, body;
        if (item.entity_type === 'domain') {
          endpoint = '/check';
          body = { url: item.entity_id };
        } else if (item.entity_type === 'person') {
          endpoint = '/search';
          body = { name: item.entity_id };
        } else {
          // Other entity types not yet implemented
          await query(
            `UPDATE discovery_queue SET status = 'failed', processed_at = NOW()
             WHERE id = $1`,
            [item.id]
          );
          continue;
        }
        
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        // Mark as completed
        await query(
          `UPDATE discovery_queue 
           SET status = 'completed', processed_at = NOW(), attempts = attempts + 1
           WHERE id = $1`,
          [item.id]
        );
        
        results.push({ 
          entity_type: item.entity_type, 
          entity_id: item.entity_id, 
          success: true 
        });
      } catch (error) {
        console.error(`[DISCOVER] Failed to process ${item.entity_id}:`, error.message);
        
        // Mark as failed
        await query(
          `UPDATE discovery_queue 
           SET status = 'failed', last_attempt_at = NOW(), attempts = attempts + 1
           WHERE id = $1`,
          [item.id]
        );
        
        results.push({ 
          entity_type: item.entity_type, 
          entity_id: item.entity_id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[DISCOVER] Completed: ${successCount}/${queueItems.length} successful`);
    
    res.json({
      success: true,
      processed: queueItems.length,
      successful: successCount,
      failed: queueItems.length - successCount,
      results
    });
  } catch (error) {
    console.error('[DISCOVER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ROUTE: POST /snapshot
// ============================================================================
// Create daily snapshot of index stats

app.post('/snapshot', async (req, res) => {
  console.log('[SNAPSHOT] Creating daily snapshot');
  
  try {
    // Gather stats from Cloud SQL
    const stats = {};
    
    // Total records by entity type
    const { rows: typeCounts } = await query(
      `SELECT entity_type, COUNT(*) as count
       FROM ai_records
       GROUP BY entity_type`
    );
    stats.by_type = typeCounts.reduce((acc, row) => {
      acc[row.entity_type] = parseInt(row.count);
      return acc;
    }, {});
    
    // Total records
    const { rows: totalCount } = await query(
      `SELECT COUNT(*) as count FROM ai_records`
    );
    stats.total_records = parseInt(totalCount[0].count);
    
    // Average scores by entity type
    const { rows: avgScores } = await query(
      `SELECT entity_type, AVG(alpha_score) as avg_score
       FROM ai_records
       WHERE alpha_score IS NOT NULL
       GROUP BY entity_type`
    );
    stats.avg_scores = avgScores.reduce((acc, row) => {
      acc[row.entity_type] = parseFloat(row.avg_score).toFixed(2);
      return acc;
    }, {});
    
    // Cache hit rate (records still valid)
    const { rows: cacheStats } = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE cache_valid_until > NOW()) as valid,
         COUNT(*) as total
       FROM ai_records`
    );
    const validCount = parseInt(cacheStats[0].valid);
    const totalRecords = parseInt(cacheStats[0].total);
    stats.cache_hit_rate = ((validCount / totalRecords) * 100).toFixed(2) + '%';
    
    // Discovery queue stats
    const { rows: queueStats } = await query(
      `SELECT status, COUNT(*) as count
       FROM discovery_queue
       GROUP BY status`
    );
    stats.discovery_queue = queueStats.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});
    
    // Create snapshot object
    const snapshot = {
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      stats
    };
    
    // Save to Cloud Storage
    const bucket = process.env.GCS_SNAPSHOTS_BUCKET || 'alpha-search-snapshots';
    const path = `snapshots/${snapshot.date}.json`;
    
    await gcs
      .bucket(bucket)
      .file(path)
      .save(
        JSON.stringify(snapshot, null, 2),
        { contentType: 'application/json' }
      );
    
    console.log(`[SNAPSHOT] Saved to gs://${bucket}/${path}`);
    
    res.json({
      success: true,
      snapshot_path: `gs://${bucket}/${path}`,
      stats
    });
  } catch (error) {
    console.error('[SNAPSHOT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'alpha-search-indexer',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Alpha Search Indexer running on port ${PORT}`);
  console.log('Available routes:');
  console.log('  POST /reindex       - Re-crawl expired domains');
  console.log('  POST /index/people  - Re-crawl expired people');
  console.log('  POST /discover      - Process discovery queue');
  console.log('  POST /snapshot      - Create daily snapshot');
  console.log('  GET  /health        - Health check');
});
