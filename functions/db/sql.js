const { query } = require('./connection');

/**
 * Upsert an AI Record (base + type table)
 * Uses the PostgreSQL upsert_ai_record() function
 * 
 * @param {Object} params
 * @param {string} params.entity_type - domain, person, product, etc.
 * @param {string} params.entity_id - The canonical identifier
 * @param {number|null} params.alpha_score - 0-100 or null
 * @param {string} params.grade - A+, A, B+, B, C+, C, D, F, or "Could Not Score"
 * @param {string} params.grade_class - excellent, good, fair, poor, fail, error
 * @param {Object} params.entity_source - Where we found this entity
 * @param {Object} params.type_data - Type-specific fields
 * @returns {Promise<string>} - UUID of the record
 */
async function upsertAiRecord({ 
  entity_type, 
  entity_id, 
  alpha_score,
  grade, 
  grade_class, 
  entity_source, 
  type_data 
}) {
  const result = await query(
    `SELECT upsert_ai_record($1, $2, $3, $4, $5, $6, $7) AS id`,
    [
      entity_type, 
      entity_id, 
      alpha_score, 
      grade, 
      grade_class,
      JSON.stringify(entity_source || {}),
      JSON.stringify(type_data    || {})
    ]
  );
  
  return result.rows[0].id;
}

/**
 * Query the alpha_search_index by entity type and ID
 * Returns cached record if valid, null otherwise
 * 
 * @param {string} entity_type - domain, person, product, etc.
 * @param {string} entity_id - The canonical identifier
 * @returns {Promise<Object|null>}
 */
async function queryIndex(entity_type, entity_id) {
  const { rows } = await query(
    `SELECT * FROM alpha_search_index
     WHERE entity_type = $1 AND entity_id = $2
       AND cache_valid_until > NOW()`,
    [entity_type, entity_id]
  );
  
  return rows[0] || null;
}

/**
 * Full-text search across alpha_search_index
 * 
 * @param {string} searchQuery - Search terms
 * @param {string|null} entity_type - Optional filter by entity type
 * @param {number} limit - Max results (default 20)
 * @returns {Promise<Array>}
 */
async function searchIndex(searchQuery, entity_type = null, limit = 20) {
  const filter = entity_type ? 'AND entity_type = $3' : '';
  const params = entity_type
    ? [searchQuery, limit, entity_type]
    : [searchQuery, limit];
  
  const { rows } = await query(
    `SELECT 
       id, 
       entity_type, 
       entity_id, 
       entity_canonical,
       alpha_score, 
       grade,
       grade_class,
       type_data,
       last_crawled_at
     FROM alpha_search_index
     WHERE search_vector @@ plainto_tsquery('english', $1)
     ${filter}
     ORDER BY alpha_score DESC NULLS LAST
     LIMIT $2`,
    params
  );
  
  return rows;
}

/**
 * Add an entity to the discovery queue
 * 
 * @param {string} entity_type - domain, person, product, etc.
 * @param {string} entity_id - The canonical identifier
 * @param {string} source - Discovery source (serp_api_result, user_submission, etc.)
 * @param {number} priority - Priority score 0-100 (default 50)
 * @returns {Promise<void>}
 */
async function addToDiscoveryQueue(entity_type, entity_id, source, priority = 50) {
  await query(
    `INSERT INTO discovery_queue
       (entity_type, entity_id, discovery_source, priority_score, discovery_phase)
     VALUES ($1, $2, $3, $4,
       CASE $3
         WHEN 'common_crawl'    THEN 1
         WHEN 'tranco'          THEN 1
         WHEN 'linkedin'        THEN 2
         WHEN 'github'          THEN 2
         WHEN 'amazon'          THEN 2
         WHEN 'trending'        THEN 3
         WHEN 'user_submission' THEN 3
         WHEN 'serp_api_result' THEN 3
         ELSE 1
       END)
     ON CONFLICT (entity_type, entity_id) DO UPDATE SET
       priority_score = GREATEST(discovery_queue.priority_score, EXCLUDED.priority_score),
       status = CASE 
         WHEN discovery_queue.status = 'failed' THEN 'pending'
         ELSE discovery_queue.status
       END`,
    [entity_type, entity_id, source, priority]
  );
}

/**
 * Get expired records for re-crawling
 * 
 * @param {string|null} entity_type - Optional filter by entity type
 * @param {number} limit - Max results (default 100)
 * @returns {Promise<Array>}
 */
async function getExpiredRecords(entity_type = null, limit = 100) {
  const filter = entity_type ? 'AND entity_type = $2' : '';
  const params = entity_type ? [limit, entity_type] : [limit];
  
  const { rows } = await query(
    `SELECT entity_type, entity_id, last_crawled_at
     FROM ai_records
     WHERE cache_valid_until < NOW()
     ${filter}
     ORDER BY last_crawled_at ASC
     LIMIT $1`,
    params
  );
  
  return rows;
}

/**
 * Get pending items from discovery queue
 * 
 * @param {number} limit - Max results (default 100)
 * @returns {Promise<Array>}
 */
async function getDiscoveryQueue(limit = 100) {
  const { rows } = await query(
    `SELECT id, entity_type, entity_id, discovery_source, priority_score
     FROM discovery_queue
     WHERE status = 'pending'
     ORDER BY priority_score DESC, discovered_at ASC
     LIMIT $1`,
    [limit]
  );
  
  return rows;
}

/**
 * Update discovery queue item status
 * 
 * @param {string} id - Queue item UUID
 * @param {string} status - pending, processing, completed, failed
 * @returns {Promise<void>}
 */
async function updateDiscoveryStatus(id, status) {
  await query(
    `UPDATE discovery_queue
     SET status = $2,
         last_attempt_at = NOW(),
         attempts = attempts + 1,
         processed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE processed_at END
     WHERE id = $1`,
    [id, status]
  );
}

module.exports = { 
  upsertAiRecord, 
  queryIndex, 
  searchIndex,
  addToDiscoveryQueue,
  getExpiredRecords,
  getDiscoveryQueue,
  updateDiscoveryStatus
};
