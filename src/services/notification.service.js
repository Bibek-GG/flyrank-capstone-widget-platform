const crypto = require('crypto');
const jobRepository = require('../repositories/job.repository');
const emailAdapter = require('../integrations/emailAdapter');
const config = require('../config');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Enqueue a notification job into the durable PostgreSQL queue
   */
  async enqueueSubmissionNotification({ submission, widget, ownerEmail }) {
    const jobId = crypto.randomUUID();
    const payload = {
      submissionId: submission.id,
      widgetId: widget.id,
      widgetTitle: widget.title,
      recipientEmail: ownerEmail || 'owner@domain.com',
      data: submission.data,
      clientIp: submission.client_ip,
      geolocation: submission.geolocation,
      submittedAt: submission.created_at
    };

    const job = await jobRepository.enqueue({
      id: jobId,
      submissionId: submission.id,
      widgetId: widget.id,
      ownerId: widget.owner_id,
      payload,
      maxAttempts: config.jobMaxAttempts
    });

    logger.info(`Enqueued notification job ${jobId} for submission ${submission.id}`);
    return job;
  }

  /**
   * Process a single job with bounded retries and failure alert on exhaustion
   */
  async processJob(job) {
    const currentAttempts = (job.attempts || 0) + 1;
    const maxAttempts = job.max_attempts || config.jobMaxAttempts;

    try {
      logger.info(`Processing notification job ${job.id} (Attempt ${currentAttempts}/${maxAttempts})`);
      
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      await emailAdapter.sendNotification(payload);

      await jobRepository.markCompleted(job.id);
      logger.info(`Notification job ${job.id} completed successfully`);
      return { success: true, status: 'completed' };
    } catch (err) {
      const isExhausted = currentAttempts >= maxAttempts;
      const nextDelaySeconds = Math.pow(2, currentAttempts) * 5; // Exponential backoff: 10s, 20s, 40s
      const nextRunAt = new Date(Date.now() + nextDelaySeconds * 1000);

      await jobRepository.markFailed(job.id, err.message, nextRunAt, isExhausted);

      if (isExhausted) {
        // STRUCTURED FAILURE ALERT: Exhausted bounded retries
        logger.error(`[NOTIFICATION_JOB_EXHAUSTED] Job ${job.id} exceeded maximum retry attempts (${maxAttempts}). Alerting engineering team!`, {
          jobId: job.id,
          submissionId: job.submission_id,
          widgetId: job.widget_id,
          attempts: currentAttempts,
          lastError: err.message
        });
      } else {
        logger.warn(`Notification job ${job.id} failed attempt ${currentAttempts}. Scheduled retry at ${nextRunAt.toISOString()}`);
      }

      return { success: false, status: isExhausted ? 'exhausted' : 'failed', error: err.message };
    }
  }

  /**
   * Run one cycle of job processing
   */
  async processPendingJobs(limit = 10) {
    const jobs = await jobRepository.fetchPendingJobs(limit);
    if (!jobs || jobs.length === 0) return 0;

    for (const job of jobs) {
      await this.processJob(job);
    }
    return jobs.length;
  }
}

module.exports = new NotificationService();
