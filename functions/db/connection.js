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
    const config = {
      host:                   process.env.CLOUD_SQL_HOST     || '35.188.95.41', // Public IP
      port:                   5432,
      user:                   process.env.CLOUD_SQL_USER     || 'alpha_user',
      password:               process.env.CLOUD_SQL_PASSWORD,
      database:               process.env.CLOUD_SQL_DATABASE || 'alpha_search',
      max:                    10,  // Maximum pool size
      idleTimeoutMillis:      30000,  // Close idle connections after 30s
      connectionTimeoutMillis:15000,  // Increased timeout
      ssl:                    { rejectUnauthorized: false }, // Allow self-signed certs
    };

    console.log('Creating database pool:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
    });

    pool = new pg.Pool(config);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });

    // Test connection
    const client = await pool.connect();
    console.log('Cloud SQL connection test successful');
    client.release();

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
