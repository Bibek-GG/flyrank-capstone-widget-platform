const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const { setupTestDb, WIDGET_NEWSLETTER_ID } = require('./test-helper');

test.before(async () => {
  await setupTestDb();
});

test('RATE LIMITING & HONEYPOT SPAM PROTECTION SUITE', async (t) => {
  await t.test('Honeypot trap detects spam bots and prevents storing lead', async () => {
    // Count existing submissions before test
    const countBefore = await db.query(
      'SELECT COUNT(*)::int as count FROM submissions WHERE widget_id = $1',
      [WIDGET_NEWSLETTER_ID]
    );
    const initialCount = countBefore.rows[0].count;

    // Submit with honeypot field filled
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .send({
        email: 'spambot@malicious-marketing.com',
        first_name: 'Botty',
        website: 'http://spam-casino.example.com' // Honeypot filled!
      });

    // Returns clean success response so bot doesn't know it was caught
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);

    // Verify submission count DID NOT increase in database
    const countAfter = await db.query(
      'SELECT COUNT(*)::int as count FROM submissions WHERE widget_id = $1',
      [WIDGET_NEWSLETTER_ID]
    );
    assert.strictEqual(countAfter.rows[0].count, initialCount, 'Spam submissions must NEVER be stored in the database');

    // Verify specific spam email does not exist in database
    const checkEmail = await db.query(
      "SELECT * FROM submissions WHERE data->>'email' = 'spambot@malicious-marketing.com'"
    );
    assert.strictEqual(checkEmail.rows.length, 0);
  });

  await t.test('Rate limiter returns 429 Too Many Requests under burst traffic', async () => {
    // Send rapid burst of requests exceeding rate limit (30 requests limit)
    let hitRateLimit = false;
    let rateLimitStatus = 0;

    for (let i = 0; i < 35; i++) {
      const res = await request(app)
        .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
        .set('X-Forwarded-For', '203.0.113.195') // Fixed IP for burst simulation
        .send({
          email: `burst_${i}@example.com`,
          first_name: 'Burst'
        });

      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitStatus = res.status;
        assert.match(res.body.error, /too many submissions/i);
        break;
      }
    }

    assert.strictEqual(hitRateLimit, true, 'Submissions burst must trigger HTTP 429');
    assert.strictEqual(rateLimitStatus, 429);
  });
});
