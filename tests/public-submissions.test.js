const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, WIDGET_NEWSLETTER_ID, WIDGET_CONTACT_ID } = require('./test-helper');

test.before(async () => {
  await setupTestDb();
});

test('PUBLIC SUBMISSIONS & VALIDATION SUITE', async (t) => {
  await t.test('POST /api/public/widgets/:id/submissions - accepts valid lead submission (201)', async () => {
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .set('Origin', 'http://localhost:5500')
      .send({
        email: 'engineer@innovate.com',
        first_name: 'David'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.submissionId);
  });

  await t.test('OPTIONS /api/public/widgets/:id/submissions - handles CORS preflight correctly', async () => {
    const res = await request(app)
      .options(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .set('Origin', 'http://localhost:5500')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Idempotency-Key');

    assert.strictEqual(res.status, 204);
    assert.ok(res.headers['access-control-allow-origin']);
    assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
  });

  await t.test('POST submissions - rejects missing required field with 400', async () => {
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .send({
        first_name: 'No Email Provided'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Validation failed for submitted fields.');
    assert.ok(Array.isArray(res.body.details));
  });

  await t.test('POST submissions - rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .send({
        email: 'invalid-email-not-an-address',
        first_name: 'David'
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.details.some(d => d.includes('valid email')));
  });

  await t.test('POST submissions - rejects excessive field length (>1000 chars) with 400', async () => {
    const longString = 'A'.repeat(1005);
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .send({
        email: 'dev@test.com',
        first_name: longString
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.details.some(d => d.includes('maximum allowed length')));
  });

  await t.test('POST submissions - rejects malformed JSON with 400 Bad Request', async () => {
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .set('Content-Type', 'application/json')
      .send('{ "email": "test@domain.com", "first_name": broken_json }');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Malformed JSON');
  });

  await t.test('POST submissions - rejects oversized payload (>10KB) with 413 Payload Too Large', async () => {
    const largeBuffer = 'B'.repeat(12 * 1024); // 12KB
    const res = await request(app)
      .post(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/submissions`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'large@test.com', data: largeBuffer }));

    assert.strictEqual(res.status, 413);
    assert.strictEqual(res.body.error, 'Payload Too Large');
  });

  await t.test('POST submissions - returns 404 for nonexistent widget', async () => {
    const res = await request(app)
      .post('/api/public/widgets/00000000-0000-0000-0000-000000000000/submissions')
      .send({ email: 'test@domain.com' });

    assert.strictEqual(res.status, 404);
  });
});
