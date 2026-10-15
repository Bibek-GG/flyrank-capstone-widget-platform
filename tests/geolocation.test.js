const test = require('node:test');
const assert = require('node:assert');
const geolocationService = require('../src/services/geolocation.service');
const submissionService = require('../src/services/submission.service');
const { setupTestDb, WIDGET_NEWSLETTER_ID } = require('./test-helper');
const config = require('../src/config');

test.before(async () => {
  await setupTestDb();
});

test('GEOLOCATION ENRICHMENT & FALLBACK CHAIN SUITE', async (t) => {
  // Save original providers to restore later
  const originalProviderA = geolocationService.providerA;
  const originalProviderB = geolocationService.providerB;

  t.afterEach(() => {
    geolocationService.providerA = originalProviderA;
    geolocationService.providerB = originalProviderB;
    process.env.GEO_PROVIDER_A_SIMULATE_FAIL = 'false';
    process.env.GEO_PROVIDER_B_SIMULATE_FAIL = 'false';
  });

  await t.test('Scenario 1: Provider A succeeds, returns enriched geolocation', async () => {
    geolocationService.providerA = {
      name: 'ip-api',
      lookup: async (ip) => ({
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
        country_code: 'US',
        provider: 'ip-api'
      })
    };

    const res = await geolocationService.enrichIp('203.0.113.1');
    assert.strictEqual(res.country, 'United States');
    assert.strictEqual(res.city, 'San Francisco');
    assert.strictEqual(res.provider, 'ip-api');
  });

  await t.test('Scenario 2: Provider A fails, falls back to Provider B which succeeds', async () => {
    geolocationService.providerA = {
      name: 'ip-api',
      lookup: async () => { throw new Error('Provider A connection timeout'); }
    };

    geolocationService.providerB = {
      name: 'ipapi',
      lookup: async (ip) => ({
        country: 'Germany',
        region: 'Bavaria',
        city: 'Munich',
        country_code: 'DE',
        provider: 'ipapi'
      })
    };

    const res = await geolocationService.enrichIp('203.0.113.2');
    assert.strictEqual(res.country, 'Germany');
    assert.strictEqual(res.city, 'Munich');
    assert.strictEqual(res.provider, 'ipapi');
  });

  await t.test('Scenario 3: Both providers fail, returns null without throwing error', async () => {
    geolocationService.providerA = {
      name: 'ip-api',
      lookup: async () => { throw new Error('Provider A 503 Service Unavailable'); }
    };

    geolocationService.providerB = {
      name: 'ipapi',
      lookup: async () => { throw new Error('Provider B 429 Rate Exceeded'); }
    };

    const res = await geolocationService.enrichIp('203.0.113.3');
    assert.strictEqual(res, null, 'Must return null gracefully when both providers fail');
  });

  await t.test('Scenario 4: Submission succeeds even when all geolocation providers fail', async () => {
    geolocationService.providerA = {
      name: 'ip-api',
      lookup: async () => { throw new Error('Provider A down'); }
    };

    geolocationService.providerB = {
      name: 'ipapi',
      lookup: async () => { throw new Error('Provider B down'); }
    };

    const result = await submissionService.createSubmission({
      widgetId: WIDGET_NEWSLETTER_ID,
      payload: {
        email: 'fallback-lead@enterprise.com',
        first_name: 'Resilient'
      },
      clientIp: '198.51.100.45'
    });

    assert.strictEqual(result.statusCode, 201);
    assert.strictEqual(result.responseBody.success, true);
    assert.ok(result.responseBody.submissionId);
  });

  await t.test('Scenario 5: Default geo providers in test mode do not make live external calls', async () => {
    geolocationService.providerA = originalProviderA;
    geolocationService.providerB = originalProviderB;

    const resA = await originalProviderA.lookup('8.8.8.8');
    assert.strictEqual(resA.country, 'United States');
    assert.strictEqual(resA.provider, 'ip-api');

    const resB = await originalProviderB.lookup('8.8.8.8');
    assert.strictEqual(resB.country, 'Germany');
    assert.strictEqual(resB.provider, 'ipapi');
  });
});
