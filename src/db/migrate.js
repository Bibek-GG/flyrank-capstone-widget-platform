const fs = require('fs');
const path = require('path');
const db = require('./index');
const logger = require('../utils/logger');
const config = require('../config');

async function applyMigrations(target) {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  logger.info(`Applying database migrations (${files.length} file(s) found)...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`Applying migration: ${file}`);
    await target.query(sql);
    logger.info(`Migration applied successfully: ${file}`);
  }

  logger.info('All database migrations applied successfully.');
}

async function runMigrations() {
  logger.info('Starting database migrations...');

  let client;
  try {
    client = await db.getClient();
  } catch (err) {
    logger.error(`Unable to connect to PostgreSQL database at ${config.databaseUrl}. Please ensure PostgreSQL is running (e.g. via 'docker compose up -d postgres'). Error: ${err.message}`);
    throw err;
  }

  try {
    await applyMigrations(client);
  } finally {
    if (client) client.release();
    await db.close();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations complete.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed', err);
      process.exit(1);
    });
}

module.exports = {
  applyMigrations,
  runMigrations
};
