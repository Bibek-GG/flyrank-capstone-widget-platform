const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, getAliceToken } = require('./test-helper');

let aliceToken;

test.before(async () => {
  await setupTestDb();
  aliceToken = getAliceToken();
});

test('WIDGET CRUD SUITE: Widget Management', async (t) => {
  let createdWidgetId;

  await t.test('POST /api/widgets - creates a valid widget', async () => {
    const res = await request(app)
      .post('/api/widgets')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Webinar RSVP Form',
        type: 'signup',
        title: 'Reserve Your Seat for the 2026 Tech Summit',
        description: 'Live hands-on system architecture sessions.',
        button_text: 'Claim Free Ticket',
        fields: [
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'job_title', label: 'Job Title', type: 'text', required: false }
        ],
        display_settings: {
          theme: 'dark',
          primaryColor: '#6366f1'
        }
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.widget.id);
    assert.strictEqual(res.body.widget.name, 'Webinar RSVP Form');
    assert.strictEqual(res.body.widget.button_text, 'Claim Free Ticket');
    createdWidgetId = res.body.widget.id;
  });

  await t.test('POST /api/widgets - rejects invalid widget type with 400', async () => {
    const res = await request(app)
      .post('/api/widgets')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Invalid Widget',
        type: 'unsupported_type_xyz',
        title: 'Title'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Validation failed');
  });

  await t.test('GET /api/widgets - lists widgets owned by tenant', async () => {
    const res = await request(app)
      .get('/api/widgets')
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.widgets));
    assert.ok(res.body.widgets.length >= 1);
  });

  await t.test('GET /api/widgets/:id - retrieves a single widget', async () => {
    const res = await request(app)
      .get(`/api/widgets/${createdWidgetId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.widget.id, createdWidgetId);
  });

  await t.test('PATCH /api/widgets/:id - updates an existing widget', async () => {
    const res = await request(app)
      .patch(`/api/widgets/${createdWidgetId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'Updated Summit Title 2026',
        button_text: 'Join Now'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.widget.title, 'Updated Summit Title 2026');
    assert.strictEqual(res.body.widget.button_text, 'Join Now');
  });

  await t.test('GET /api/widgets/:id/embed - generates working embed snippet', async () => {
    const res = await request(app)
      .get(`/api/widgets/${createdWidgetId}/embed`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.snippet.includes('widget.v1.js'));
    assert.ok(res.body.snippet.includes(createdWidgetId));
  });

  await t.test('DELETE /api/widgets/:id - deletes the widget', async () => {
    const res = await request(app)
      .delete(`/api/widgets/${createdWidgetId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify subsequent lookup returns 404
    const checkRes = await request(app)
      .get(`/api/widgets/${createdWidgetId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(checkRes.status, 404);
  });
});
