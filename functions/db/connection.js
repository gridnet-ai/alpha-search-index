const pg = require('pg');

let pool = null;

/**
 * Get or create PostgreSQL connection pool
 * Uses direct connection with public IP and authorized networks
 */
async function getPool() {
  if (pool) {
    return pool;
  }

  try {
    // Direct connection using public IP (simpler for development)
    // For production, consider using Cloud SQL Proxy or VPC connector
    pool = new pg.Pool({
      host:                   process.env.CLOUD_SQL_HOST     || '35.188.95.41', // Public IP
      port:                   5432,
      user:                   process.env.CLOUD_SQL_USER     || 'alpha_user',
      password:               process.env.CLOUD_SQL_PASSWORD,
      database:               process.env.CLOUD_SQL_DATABASE || 'alpha_search',
      max:                    20,  // Maximum pool size
      idleTimeoutMillis:      30000,  // Close idle connections after 30s
      connectionTimeoutMillis:10000,  // Timeout after 10s if can't connect
      ssl:                    false, // Cloud SQL doesn't require SSL for authorized networks
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
