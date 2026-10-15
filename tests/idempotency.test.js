const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const { setupTestDb, WIDGET_NEWSLETTER_ID } = require('./test-helper');

test.before(async () => {
  await setupTestDb();
});

test('IDEMPOTENCY SUITE: Retried Submission Deduplication', async (t) => {
  await t.test('Same Idempotency-Key returns cached response without duplicate database record', async () => {
    const idempotencyKey = `test_key_${Date.now()}_abc`;

    // First request
    const res1 = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        email: 'idempotent.user@domain.com',
        first_name: 'UniqueUser'
      });

    assert.strictEqual(res1.status, 201);
    const firstSubmissionId = res1.body.submissionId;
    assert.ok(firstSubmissionId);

    // Second request with exact same Idempotency-Key
    const res2 = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        email: 'idempotent.user@domain.com',
        first_name: 'UniqueUser'
      });

    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.submissionId, firstSubmissionId, 'Replayed request must return the exact same submissionId');

    // Verify in database: exactly ONE submission with this email and idempotency_key
    const dbCheck = await db.query(
      'SELECT id, idempotency_key FROM submissions WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    assert.strictEqual(dbCheck.rows.length, 1, 'Only one record must exist in PostgreSQL submissions table');

    // Verify record in idempotency_records table
    const recordCheck = await db.query(
      'SELECT key, response_status, response_body FROM idempotency_records WHERE key = $1',
      [idempotencyKey]
    );
    assert.strictEqual(recordCheck.rows.length, 1);
    assert.strictEqual(recordCheck.rows[0].response_status, 201);
  });
});
