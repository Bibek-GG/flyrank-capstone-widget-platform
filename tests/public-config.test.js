const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, WIDGET_NEWSLETTER_ID, getAliceToken } = require('./test-helper');

let aliceToken;

test.before(async () => {
  await setupTestDb();
  aliceToken = getAliceToken();
});

test('PUBLIC CONFIG & ASSET DELIVERY SUITE', async (t) => {
  await t.test('GET /api/public/widgets/:id/config - returns sanitized configuration', async () => {
    const res = await request(app)
      .get(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/config`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, WIDGET_NEWSLETTER_ID);
    assert.ok(res.body.title);
    assert.ok(Array.isArray(res.body.fields));
    assert.strictEqual(res.body.owner_id, undefined, 'Must not leak owner_id');
    assert.strictEqual(res.body.password_hash, undefined, 'Must not leak credentials');

    // Cache headers
    assert.ok(res.headers['cache-control'].includes('max-age=60'));
    assert.ok(res.headers['cache-control'].includes('stale-while-revalidate=30'));
    assert.ok(res.headers['etag'], 'ETag header should be present');
  });

  await t.test('GET /api/public/widgets/:id/config - returns 404 for nonexistent widget', async () => {
    const res = await request(app)
      .get('/api/public/widgets/00000000-0000-0000-0000-000000000000/config');

    assert.strictEqual(res.status, 404);
  });

  await t.test('GET /api/public/widgets/:id/config - returns 404 for disabled widget', async () => {
    // Disable the widget
    await request(app)
      .patch(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'disabled' });

    const res = await request(app)
      .get(`/api/public/widgets/${WIDGET_NEWSLETTER_ID}/config`);

    assert.strictEqual(res.status, 404);

    // Re-enable for subsequent tests
    await request(app)
      .patch(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ status: 'enabled' });
  });

  await t.test('GET /widget.v1.js - serves versioned JavaScript asset with immutable caching', async () => {
    const res = await request(app)
      .get('/widget.v1.js');

    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.strictEqual(res.headers['cache-control'], 'public, max-age=86400, immutable');
    assert.ok(res.text.includes('data-widget-id'));
  });

  await t.test('GET /widget.v1.css - serves versioned CSS asset with immutable caching', async () => {
    const res = await request(app)
      .get('/widget.v1.css');

    assert.strictEqual(res.status, 200);
    assert.match(res.headers['content-type'], /css/);
    assert.strictEqual(res.headers['cache-control'], 'public, max-age=86400, immutable');
    assert.ok(res.text.includes('flyrank-widget-card'));
  });
});
