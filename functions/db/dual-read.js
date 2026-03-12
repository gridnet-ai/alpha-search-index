const admin = require('firebase-admin');
const { query } = require('./connection');

const db = admin.firestore();
const discrepancies = [];

/**
 * Dual-read a domain record from both Firestore and Cloud SQL
 * Logs any discrepancies for monitoring during migration period
 * Returns Cloud SQL result (source of truth during dual-read)
 * 
 * @param {string} domain - Domain name to query
 * @returns {Promise<Object|null>} - Cloud SQL result
 */
async function dualReadDomain(domain) {
  const [fsResult, sqlResult] = await Promise.all([
    // Read from Firestore
    db.collection('index').doc(domain).get().then(doc => {
      if (!doc.exists) return null;
      const data = doc.data();
      return {
        score: data.alphaRankScore || data.score,
        grade: data.grade,
        machine_profile: data.machineProfile || {}
      };
    }),
    
    // Read from Cloud SQL
    query(
      `SELECT * FROM alpha_search_index
       WHERE entity_type = 'domain' AND entity_id = $1
         AND cache_valid_until > NOW()`,
      [domain]
    ).then(r => r.rows[0] || null)
  ]);

  // Compare results if both exist
  if (fsResult && sqlResult) {
    // Check score mismatch
    if (fsResult.score !== sqlResult.alpha_score) {
      const discrepancy = {
        domain,
        field: 'alpha_score',
        firestore: fsResult.score,
        sql: sqlResult.alpha_score,
        timestamp: new Date()
      };
      discrepancies.push(discrepancy);
      console.error(`[DUAL-READ] Score mismatch for ${domain}:`, {
        firestore: fsResult.score,
        sql: sqlResult.alpha_score,
        diff: Math.abs(fsResult.score - sqlResult.alpha_score)
      });
    }
    
    // Check grade mismatch
    if (fsResult.grade !== sqlResult.grade) {
      const discrepancy = {
        domain,
        field: 'grade',
        firestore: fsResult.grade,
        sql: sqlResult.grade,
        timestamp: new Date()
      };
      discrepancies.push(discrepancy);
      console.error(`[DUAL-READ] Grade mismatch for ${domain}:`, {
        firestore: fsResult.grade,
        sql: sqlResult.grade
      });
    }
  } else if (fsResult && !sqlResult) {
    console.warn(`[DUAL-READ] Domain exists in Firestore but not Cloud SQL: ${domain}`);
    discrepancies.push({
      domain,
      field: 'existence',
      firestore: 'exists',
      sql: 'missing',
      timestamp: new Date()
    });
  } else if (!fsResult && sqlResult) {
    console.warn(`[DUAL-READ] Domain exists in Cloud SQL but not Firestore: ${domain}`);
    discrepancies.push({
      domain,
      field: 'existence',
      firestore: 'missing',
      sql: 'exists',
      timestamp: new Date()
    });
  }

  // Return Cloud SQL result (source of truth)
  return sqlResult;
}

/**
 * Get total number of discrepancies found
 * @returns {number}
 */
function getDiscrepancyCount() {
  return discrepancies.length;
}

/**
 * Get discrepancy rate as a percentage
 * @param {number} totalQueries - Total queries processed
 * @returns {number} - Percentage (0-100)
 */
function getDiscrepancyRate(totalQueries) {
  if (totalQueries === 0) return 0;
  return (discrepancies.length / totalQueries) * 100;
}

/**
 * Get all discrepancies (for debugging)
 * @param {number} limit - Max discrepancies to return
 * @returns {Array}
 */
function getDiscrepancies(limit = 100) {
  return discrepancies.slice(-limit);
}

/**
 * Clear discrepancy log
 */
function clearDiscrepancies() {
  discrepancies.length = 0;
  console.log('[DUAL-READ] Discrepancy log cleared');
}

/**
 * Export discrepancies to Cloud Storage for analysis
 */
async function exportDiscrepancies() {
  if (discrepancies.length === 0) {
    console.log('[DUAL-READ] No discrepancies to export');
    return null;
  }
  
  const { Storage } = require('@google-cloud/storage');
  const gcs = new Storage();
  const bucket = process.env.GCS_ANALYTICS_BUCKET || 'alpha-search-analytics';
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const path = `dual-read-discrepancies/${timestamp}.json`;
  
  try {
    await gcs
      .bucket(bucket)
      .file(path)
      .save(
        JSON.stringify({
          exported_at: new Date().toISOString(),
          total_discrepancies: discrepancies.length,
          discrepancies
        }, null, 2),
        { contentType: 'application/json' }
      );
    
    const gcsPath = `gs://${bucket}/${path}`;
    console.log('[DUAL-READ] Discrepancies exported:', gcsPath);
    return gcsPath;
  } catch (error) {
    console.error('[DUAL-READ] Failed to export discrepancies:', error);
    throw error;
  }
}

module.exports = { 
  dualReadDomain, 
  getDiscrepancyCount,
  getDiscrepancyRate,
  getDiscrepancies,
  clearDiscrepancies,
  exportDiscrepancies
};
