const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const {
  setupTestDb,
  getAliceToken,
  getBobToken,
  WIDGET_NEWSLETTER_ID,
  WIDGET_WAITLIST_ID
} = require('./test-helper');

let aliceToken;
let bobToken;

test.before(async () => {
  await setupTestDb();
  aliceToken = getAliceToken();
  bobToken = getBobToken();
});

test('TENANT ISOLATION SUITE: Multi-Tenant Boundary Enforcement', async (t) => {
  // Alice owns WIDGET_NEWSLETTER_ID; Bob owns WIDGET_WAITLIST_ID

  await t.test('Tenant B cannot read Tenant A widget by ID (404 Not Found)', async () => {
    const res = await request(app)
      .get(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${bobToken}`);

    assert.strictEqual(res.status, 404);
    assert.match(res.body.error, /not found or you do not have permission/i);
  });

  await t.test('Tenant A cannot read Tenant B widget by ID (404 Not Found)', async () => {
    const res = await request(app)
      .get(`/api/widgets/${WIDGET_WAITLIST_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 404);
    assert.match(res.body.error, /not found or you do not have permission/i);
  });

  await t.test('Tenant B cannot update Tenant A widget (404 Not Found)', async () => {
    const res = await request(app)
      .patch(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: 'Malicious Overwrite by Bob' });

    assert.strictEqual(res.status, 404);

    // Verify title was NOT modified
    const checkRes = await request(app)
      .get(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.notStrictEqual(checkRes.body.widget.title, 'Malicious Overwrite by Bob');
  });

  await t.test('Tenant B cannot delete Tenant A widget (404 Not Found)', async () => {
    const res = await request(app)
      .delete(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${bobToken}`);

    assert.strictEqual(res.status, 404);

    // Verify widget still exists for Alice
    const checkRes = await request(app)
      .get(`/api/widgets/${WIDGET_NEWSLETTER_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(checkRes.status, 200);
  });

  await t.test('Tenant A cannot view Tenant B submissions in dashboard (filtered by Bob widget)', async () => {
    const res = await request(app)
      .get(`/api/dashboard/submissions?widgetId=${WIDGET_WAITLIST_ID}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 404);
    assert.match(res.body.error, /does not belong to you/i);
  });

  await t.test('Tenant A general dashboard submissions list excludes Tenant B data', async () => {
    const res = await request(app)
      .get('/api/dashboard/submissions')
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    const submissions = res.body.submissions || [];

    // Ensure none of the submissions belong to Bob's widget
    const bobSubmissions = submissions.filter(s => s.widget_id === WIDGET_WAITLIST_ID);
    assert.strictEqual(bobSubmissions.length, 0, 'Alice dashboard must never contain Bob submissions');
  });

  await t.test('Tenant A cannot access Tenant B per-widget statistics (404)', async () => {
    const res = await request(app)
      .get(`/api/dashboard/widgets/${WIDGET_WAITLIST_ID}/stats`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 404);
    assert.match(res.body.error, /does not belong to you/i);
  });
});
