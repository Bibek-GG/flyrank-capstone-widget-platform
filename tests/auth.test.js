const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./test-helper');

test.before(async () => {
  await setupTestDb();
});

test('AUTH SUITE: User Registration and Login', async (t) => {
  await t.test('POST /api/auth/register - successfully registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.token, 'JWT token should be returned');
    assert.strictEqual(res.body.user.email, 'charlie@example.com');
    assert.strictEqual(res.body.user.name, 'Charlie Brown');
    assert.strictEqual(res.body.user.password_hash, undefined, 'Password hash must never leak in response');
  });

  await t.test('POST /api/auth/register - rejects duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Duplicate',
        email: 'alice@example.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 409);
    assert.match(res.body.error, /already exists/i);
  });

  await t.test('POST /api/auth/register - rejects weak password with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Weak Pass',
        email: 'weak@example.com',
        password: 'weak'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Validation failed');
  });

  await t.test('POST /api/auth/login - authenticates valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token, 'Token should be returned');
    assert.strictEqual(res.body.user.email, 'alice@example.com');
  });

  await t.test('POST /api/auth/login - rejects incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'WrongPassword999!'
      });

    assert.strictEqual(res.status, 401);
    assert.match(res.body.error, /invalid email or password/i);
  });

  await t.test('GET /api/auth/me - rejects request with missing JWT with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /api/auth/me - rejects request with malformed JWT with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.fake.token');

    assert.strictEqual(res.status, 401);
  });
});
