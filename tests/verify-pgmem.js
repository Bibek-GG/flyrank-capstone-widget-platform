const { setupTestDb } = require('./test-helper');

async function verify() {
  console.log('Verifying PostgreSQL in-memory database setup and migrations...');
  const db = await setupTestDb();
  const userCount = await db.query('SELECT COUNT(*)::int as count FROM users');
  const widgetCount = await db.query('SELECT COUNT(*)::int as count FROM widgets');
  const subCount = await db.query('SELECT COUNT(*)::int as count FROM submissions');
  console.log(`Schema and seeds verified successfully. Users: ${userCount.rows[0].count}, Widgets: ${widgetCount.rows[0].count}, Submissions: ${subCount.rows[0].count}`);
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
