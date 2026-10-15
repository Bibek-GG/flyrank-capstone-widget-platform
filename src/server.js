const app = require('./app');
const config = require('./config');
const db = require('./db');
const { startWorker, stopWorker } = require('./jobs/worker');
const logger = require('./utils/logger');

let server = null;

async function start() {
  try {
    // Initialize database (connects to PostgreSQL or in-memory fallback for local dev)
    await db.initializeDatabase();

    server = app.listen(config.port, () => {
      logger.info(`FlyRank Widget Platform API server listening on port ${config.port}`);
      logger.info(`Dashboard available at: http://localhost:${config.port}/dashboard`);
      logger.info(`Public widget asset: http://localhost:${config.port}/widget.v1.js`);
      
      // Start background notification worker
      startWorker();
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

// Graceful Shutdown handler
async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Stop background worker
  stopWorker();

  // Stop accepting new HTTP requests
  server.close(async () => {
    logger.info('HTTP server closed.');

    // Close database connection pool
    try {
      await db.close();
      logger.info('Database pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database pool closure', err);
      process.exit(1);
    }
  });

  // Force termination if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Forcefully terminating.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
