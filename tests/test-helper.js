process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const { newDb, DataType } = require('pg-mem');
const db = require('../src/db');
const { generateToken } = require('../src/utils/jwt');
const { getSeedData, DEMO_USER_ALICE_ID, DEMO_USER_BOB_ID, WIDGET_NEWSLETTER_ID, WIDGET_CONTACT_ID, WIDGET_WAITLIST_ID } = require('../src/db/seeds/seed_data');

let currentTestPool = null;

async function setupTestDb() {
  if (process.env.TEST_DATABASE_URL) {
    // If real test database URL provided, use it
    return db;
  }

  // Create isolated in-memory PostgreSQL instance
  const mem = newDb();

  // Register native PostgreSQL functions needed by application
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => require('crypto').randomUUID()
  });

  mem.public.registerFunction({
    name: 'to_char',
    args: [DataType.timestamptz, DataType.text],
    returns: DataType.text,
    implementation: (d, fmt) => {
      const dt = new Date(d);
      return dt.toISOString().slice(0, 10);
    }
  });

  mem.public.registerFunction({
    name: 'date_trunc',
    args: [DataType.text, DataType.timestamptz],
    returns: DataType.timestamptz,
    implementation: (unit, d) => new Date(d)
  });

  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool();
  currentTestPool = pool;

  // Execute Schema Migration
  const migrationSql = fs.readFileSync(path.join(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8');
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await pool.query(stmt);
  }

  // Inject test pool into application db module
  db.setPool(pool);

  // Seed demo data
  await seedDemoData();

  return db;
}

async function seedDemoData() {
  const { users, widgets, sampleSubmissions } = await getSeedData();

  // Insert Users
  for (const u of users) {
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.password_hash, u.name]
    );
  }

  // Insert Widgets
  for (const w of widgets) {
    await db.query(
      `INSERT INTO widgets (id, owner_id, name, type, title, description, button_text, fields, display_settings, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [w.id, w.owner_id, w.name, w.type, w.title, w.description, w.button_text, w.fields, w.display_settings, w.status]
    );
  }

  // Insert Submissions
  for (const s of sampleSubmissions) {
    await db.query(
      `INSERT INTO submissions (id, widget_id, owner_id, data, client_ip, user_agent, referer, geolocation, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.widget_id, s.owner_id, s.data, s.client_ip, s.user_agent, s.referer, s.geolocation, s.created_at]
    );
  }
}

function getAliceToken() {
  return generateToken({
    userId: DEMO_USER_ALICE_ID,
    email: 'alice@example.com',
    name: 'Alice Johnson'
  });
}

function getBobToken() {
  return generateToken({
    userId: DEMO_USER_BOB_ID,
    email: 'bob@example.com',
    name: 'Bob Smith'
  });
}

module.exports = {
  setupTestDb,
  seedDemoData,
  getAliceToken,
  getBobToken,
  DEMO_USER_ALICE_ID,
  DEMO_USER_BOB_ID,
  WIDGET_NEWSLETTER_ID,
  WIDGET_CONTACT_ID,
  WIDGET_WAITLIST_ID
};
