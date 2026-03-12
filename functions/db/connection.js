const { Connector } = require('@google-cloud/cloud-sql-connector');
const pg = require('pg');

const connector = new Connector();
let pool = null;

/**
 * Get or create PostgreSQL connection pool
 * Uses Cloud SQL Connector for secure connections
 */
async function getPool() {
  if (pool) {
    return pool;
  }

  try {
    // Get connection options from Cloud SQL Connector
    const clientOpts = await connector.getOptions({
      instanceConnectionName:
        process.env.CLOUD_SQL_INSTANCE ||
        'alpha-search-index:us-central1:alpha-search-index-db',
      ipType: 'PUBLIC', // Use public IP for Cloud Functions/Run without VPC
    });

    // Create connection pool
    pool = new pg.Pool({
      ...clientOpts,
      user:                   process.env.CLOUD_SQL_USER     || 'alpha_user',
      password:               process.env.CLOUD_SQL_PASSWORD,
      database:               process.env.CLOUD_SQL_DATABASE || 'alpha_search',
      max:                    20,  // Maximum pool size
      idleTimeoutMillis:      30000,  // Close idle connections after 30s
      connectionTimeoutMillis:10000,  // Timeout after 10s if can't connect
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });

    console.log('Cloud SQL connection pool created');
    return pool;
  } catch (error) {
    console.error('Failed to create Cloud SQL pool:', error);
    throw error;
  }
}

/**
 * Execute a SQL query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params) {
  const p = await getPool();
  const start = Date.now();
  
  try {
    const result = await p.query(text, params);
    const duration = Date.now() - start;
    
    console.log('Query executed:', {
      duration: `${duration}ms`,
      rows: result.rowCount,
      command: result.command
    });
    
    return result;
  } catch (error) {
    console.error('Query error:', {
      error: error.message,
      query: text.substring(0, 100) // Log first 100 chars of query
    });
    throw error;
  }
}

/**
 * Close the connection pool (for graceful shutdown)
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Cloud SQL connection pool closed');
  }
}

module.exports = { getPool, query, closePool };
