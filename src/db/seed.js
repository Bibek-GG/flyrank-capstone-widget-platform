const db = require('./index');
const logger = require('../utils/logger');
const config = require('../config');
const { getSeedData } = require('./seeds/seed_data');

async function runSeed() {
  logger.info('Starting database seeding...');

  try {
    const testClient = await db.getClient();
    testClient.release();
  } catch (err) {
    logger.error(`Unable to connect to PostgreSQL database at ${config.databaseUrl}. Please ensure PostgreSQL is running (e.g. via 'docker compose up -d postgres'). Error: ${err.message}`);
    throw err;
  }

  const { users, widgets, sampleSubmissions } = await getSeedData();

  try {
    await db.withTransaction(async (client) => {
    // 1. Seed Users (UPSERT)
    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           updated_at = NOW()`,
        [user.id, user.email, user.password_hash, user.name]
      );
    }
    logger.info(`Seeded ${users.length} demo users (alice@example.com, bob@example.com)`);

    // 2. Seed Widgets (UPSERT)
    for (const widget of widgets) {
      await client.query(
        `INSERT INTO widgets (id, owner_id, name, type, title, description, button_text, fields, display_settings, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           button_text = EXCLUDED.button_text,
           fields = EXCLUDED.fields,
           display_settings = EXCLUDED.display_settings,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [
          widget.id,
          widget.owner_id,
          widget.name,
          widget.type,
          widget.title,
          widget.description,
          widget.button_text,
          widget.fields,
          widget.display_settings,
          widget.status
        ]
      );
    }
    logger.info(`Seeded ${widgets.length} sample widgets`);

    // 3. Seed Sample Submissions (UPSERT)
    for (const sub of sampleSubmissions) {
      await client.query(
        `INSERT INTO submissions (id, widget_id, owner_id, data, client_ip, user_agent, referer, geolocation, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          sub.id,
          sub.widget_id,
          sub.owner_id,
          sub.data,
          sub.client_ip,
          sub.user_agent,
          sub.referer,
          sub.geolocation,
          sub.created_at
        ]
      );
    }
    logger.info(`Seeded ${sampleSubmissions.length} initial lead submissions`);
    });

    logger.info('Database seeding completed successfully.');
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seeding failed', err);
      process.exit(1);
    });
}

module.exports = {
  runSeed
};
