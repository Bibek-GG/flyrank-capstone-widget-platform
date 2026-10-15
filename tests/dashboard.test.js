const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const {
  setupTestDb,
  getAliceToken,
  WIDGET_NEWSLETTER_ID,
  WIDGET_CONTACT_ID
} = require('./test-helper');

let aliceToken;

test.before(async () => {
  await setupTestDb();
  aliceToken = getAliceToken();
});

test('DASHBOARD AGGREGATION & ANALYTICS SUITE', async (t) => {
  await t.test('GET /api/dashboard/overview - returns aggregate metrics for tenant', async () => {
    const res = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    const stats = res.body.stats;
    assert.ok(stats);
    assert.strictEqual(typeof stats.totalSubmissions, 'number');
    assert.ok(stats.totalSubmissions >= 3);
    assert.strictEqual(typeof stats.totalWidgets, 'number');
    assert.ok(stats.totalWidgets >= 2);
    assert.strictEqual(typeof stats.activeWidgets, 'number');
    assert.ok(Array.isArray(stats.conversionTrend));
    assert.ok(Array.isArray(stats.topWidgets));
  });

  await t.test('GET /api/dashboard/submissions - returns paginated submissions', async () => {
    const res = await request(app)
      .get('/api/dashboard/submissions?page=1&limit=2')
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.submissions));
    assert.strictEqual(res.body.submissions.length, 2);

    const pagination = res.body.pagination;
    assert.strictEqual(pagination.page, 1);
    assert.strictEqual(pagination.limit, 2);
    assert.ok(pagination.total >= 3);
    assert.ok(pagination.totalPages >= 2);
  });

  await t.test('GET /api/dashboard/submissions - filters by specific widget', async () => {
    const res = await request(app)
      .get(`/api/dashboard/submissions?widgetId=${WIDGET_CONTACT_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.submissions));
    res.body.submissions.forEach(sub => {
      assert.strictEqual(sub.widget_id, WIDGET_CONTACT_ID);
    });
  });

  await t.test('GET /api/dashboard/widgets/:id/stats - returns per-widget geolocation and stats', async () => {
    const res = await request(app)
      .get(`/api/dashboard/widgets/${WIDGET_NEWSLETTER_ID}/stats`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.widget);
    assert.strictEqual(res.body.widget.id, WIDGET_NEWSLETTER_ID);
    assert.ok(typeof res.body.totalSubmissions === 'number');
    assert.ok(Array.isArray(res.body.geoBreakdown));
    assert.ok(Array.isArray(res.body.dailySubmissions));
  });

  await t.test('GET /api/dashboard/overview - rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .get('/api/dashboard/overview');

    assert.strictEqual(res.status, 401);
  });
});
