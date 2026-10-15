const test = require('node:test');
const assert = require('node:assert');
const notificationService = require('../src/services/notification.service');
const submissionService = require('../src/services/submission.service');
const jobRepository = require('../src/repositories/job.repository');
const emailAdapter = require('../src/integrations/emailAdapter');
const db = require('../src/db');
const { setupTestDb, WIDGET_NEWSLETTER_ID } = require('./test-helper');

test.before(async () => {
  await setupTestDb();
});

test('NOTIFICATION BACKGROUND JOBS & RESILIENCE SUITE', async (t) => {
  await t.test('Notification failure does not cause submission to fail or disappear', async () => {
    // Force simulation failure on notification dispatch
    process.env.NOTIFICATION_SIMULATE_FAIL = 'true';

    const result = await submissionService.createSubmission({
      widgetId: WIDGET_NEWSLETTER_ID,
      payload: {
        email: 'safe_lead@resilience.org',
        first_name: 'ResilientLead'
      },
      clientIp: '127.0.0.1'
    });

    // Reset simulation flag
    process.env.NOTIFICATION_SIMULATE_FAIL = 'false';

    assert.strictEqual(result.statusCode, 201);
    assert.strictEqual(result.responseBody.success, true);
    const submissionId = result.responseBody.submissionId;

    // Verify lead was safely stored in database despite notification failure
    const checkLead = await db.query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
    assert.strictEqual(checkLead.rows.length, 1, 'Lead MUST be safely persisted in PostgreSQL');
  });

  await t.test('Background jobs retry on failure and eventually mark exhausted with structured alert', async () => {
    // Create a real submission first to satisfy foreign key constraint
    const subRes = await submissionService.createSubmission({
      widgetId: WIDGET_NEWSLETTER_ID,
      payload: { email: 'retry_lead@domain.com' },
      clientIp: '127.0.0.1'
    });
    const submissionId = subRes.responseBody.submissionId;
    const jobId = require('crypto').randomUUID();

    const job = await jobRepository.enqueue({
      id: jobId,
      submissionId,
      widgetId: WIDGET_NEWSLETTER_ID,
      ownerId: '11111111-1111-4111-8111-111111111111',
      payload: { test: 'retry_test' },
      maxAttempts: 3
    });

    assert.strictEqual(job.status, 'pending');
    assert.strictEqual(job.attempts, 0);

    // Save original adapter
    const originalSend = emailAdapter.sendNotification;
    // Mock failing adapter
    emailAdapter.sendNotification = async () => {
      throw new Error('SMTP connection refused');
    };

    // Attempt 1
    const res1 = await notificationService.processJob(job);
    assert.strictEqual(res1.status, 'failed');
    let updatedJob = await jobRepository.findById(jobId);
    assert.strictEqual(updatedJob.attempts, 1);
    assert.strictEqual(updatedJob.status, 'pending');

    // Attempt 2
    const res2 = await notificationService.processJob(updatedJob);
    assert.strictEqual(res2.status, 'failed');
    updatedJob = await jobRepository.findById(jobId);
    assert.strictEqual(updatedJob.attempts, 2);
    assert.strictEqual(updatedJob.status, 'pending');

    // Attempt 3 (Max attempts reached -> Exhausted)
    const res3 = await notificationService.processJob(updatedJob);
    assert.strictEqual(res3.status, 'exhausted');
    updatedJob = await jobRepository.findById(jobId);
    assert.strictEqual(updatedJob.attempts, 3);
    assert.strictEqual(updatedJob.status, 'exhausted');
    assert.match(updatedJob.last_error, /SMTP connection refused/);

    // Restore original adapter
    emailAdapter.sendNotification = originalSend;
  });

  await t.test('Background jobs mark completed on successful dispatch', async () => {
    // Create a real submission first to satisfy foreign key constraint
    const subRes = await submissionService.createSubmission({
      widgetId: WIDGET_NEWSLETTER_ID,
      payload: { email: 'success_lead@domain.com' },
      clientIp: '127.0.0.1'
    });
    const submissionId = subRes.responseBody.submissionId;
    const jobId = require('crypto').randomUUID();

    const job = await jobRepository.enqueue({
      id: jobId,
      submissionId,
      widgetId: WIDGET_NEWSLETTER_ID,
      ownerId: '11111111-1111-4111-8111-111111111111',
      payload: { test: 'success_test' },
      maxAttempts: 3
    });

    const res = await notificationService.processJob(job);
    assert.strictEqual(res.status, 'completed');

    const updatedJob = await jobRepository.findById(jobId);
    assert.strictEqual(updatedJob.status, 'completed');
  });
});
