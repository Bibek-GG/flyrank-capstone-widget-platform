const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.NODE_ENV === 'test' && config.testDatabaseUrl
      ? config.testDatabaseUrl
      : config.databaseUrl;

    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle PostgreSQL client pool', err);
    });
  }
  return pool;
}

/**
 * Initializes database connection, testing real PostgreSQL first,
 * and falling back to in-memory PostgreSQL engine if local daemon is not running.
 */
async function initializeDatabase() {
  const currentPool = getPool();
  try {
    const client = await currentPool.connect();
    client.release();
    logger.info('Connected to PostgreSQL database successfully.');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_IN_MEMORY_FALLBACK === 'true') {
      logger.warn(`PostgreSQL connection failed (${err.message}). Activating local in-memory PostgreSQL engine for development.`);
      const { setupTestDb } = require('../../tests/test-helper');
      await setupTestDb();
      logger.info('In-memory PostgreSQL engine initialized with schema and seed data.');
    } else {
      logger.error('Failed to connect to PostgreSQL database', err);
      throw err;
    }
  }
}

/**
 * Execute a parameterized query
 * @param {string} text 
 * @param {Array} params 
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const currentPool = getPool();
  return currentPool.query(text, params);
}

/**
 * Acquire a client from the pool for transactions
 */
async function getClient() {
  const currentPool = getPool();
  return currentPool.connect();
}

/**
 * Execute callback inside a database transaction
 * @param {function(import('pg').PoolClient): Promise<any>} callback 
 */
async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the database pool
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Override the pool (useful for isolated in-memory test setups)
 * @param {object} customPool 
 */
function setPool(customPool) {
  pool = customPool;
}

module.exports = {
  getPool,
  setPool,
  initializeDatabase,
  query,
  getClient,
  withTransaction,
  close
};
