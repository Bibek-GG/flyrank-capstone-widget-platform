const crypto = require('crypto');
const widgetRepository = require('../repositories/widget.repository');
const submissionRepository = require('../repositories/submission.repository');
const idempotencyRepository = require('../repositories/idempotency.repository');
const userRepository = require('../repositories/user.repository');
const geolocationService = require('./geolocation.service');
const notificationService = require('./notification.service');
const { validateSubmission } = require('../validators/submission.validator');
const logger = require('../utils/logger');
const config = require('../config');

class SubmissionService {
  /**
   * Process a public lead submission
   */
  async createSubmission({
    widgetId,
    payload,
    clientIp,
    userAgent,
    referer,
    idempotencyKey
  }) {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const cached = await idempotencyRepository.findByKey(idempotencyKey);
      if (cached) {
        logger.info(`[IDEMPOTENCY_HIT] Returning cached response for key: ${idempotencyKey}`);
        return {
          statusCode: cached.response_status,
          responseBody: typeof cached.response_body === 'string'
            ? JSON.parse(cached.response_body)
            : cached.response_body,
          isCached: true
        };
      }
    }

    // 2. Lookup Widget and Verify Enabled Status
    const widget = await widgetRepository.findPublicById(widgetId);
    if (!widget || widget.status !== 'enabled') {
      const error = new Error('Widget not found or is currently disabled.');
      error.status = 404;
      throw error;
    }

    // 3. Validate Untrusted Submission Body Against Configured Fields & Check Honeypot
    const fields = Array.isArray(widget.fields) ? widget.fields : (typeof widget.fields === 'string' ? JSON.parse(widget.fields) : []);
    const validationResult = validateSubmission(payload, fields);

    // Spam / Honeypot Detection
    if (validationResult.isSpam) {
      logger.warn(`[SPAM_DROPPED] Honeypot trap triggered for widget ${widgetId} from IP ${clientIp}. Silently dropping submission.`);
      const spamResponse = {
        success: true,
        message: 'Submission received successfully'
      };
      return {
        statusCode: 201,
        responseBody: spamResponse,
        isSpam: true
      };
    }

    // Validation Failure
    if (!validationResult.isValid) {
      const error = new Error('Validation failed for submitted fields.');
      error.status = 400;
      error.details = validationResult.errors;
      throw error;
    }

    // 4. Geolocation Enrichment with Fallback Chain
    let geolocation = null;
    try {
      geolocation = await geolocationService.enrichIp(clientIp);
    } catch (err) {
      logger.warn(`Geolocation enrichment failed safely: ${err.message}`);
      geolocation = null;
    }

    // Lookup widget owner (for owner_id and notification email)
    const owner = await userRepository.findById(widget.owner_id);
    const ownerEmail = owner ? owner.email : 'owner@domain.com';

    // 5. Persist Submission in PostgreSQL
    const submissionId = crypto.randomUUID();
    const submission = await submissionRepository.create({
      id: submissionId,
      widgetId: widget.id,
      ownerId: widget.owner_id,
      data: validationResult.cleanData,
      clientIp,
      userAgent,
      referer,
      geolocation,
      idempotencyKey: idempotencyKey || null
    });

    // 6. Enqueue Durable Background Notification Job (Failure must never fail submission)
    try {
      await notificationService.enqueueSubmissionNotification({
        submission,
        widget,
        ownerEmail
      });
    } catch (jobErr) {
      logger.error('Failed to enqueue notification job, lead remains safely stored', jobErr);
    }

    const responseBody = {
      success: true,
      submissionId: submission.id,
      message: 'Submission received successfully'
    };

    // 7. Persist Idempotency Record if key provided
    if (idempotencyKey) {
      try {
        await idempotencyRepository.save({
          key: idempotencyKey,
          widgetId: widget.id,
          responseStatus: 201,
          responseBody,
          ttlSeconds: config.idempotencyTtlSeconds
        });
      } catch (idemErr) {
        logger.warn(`Failed to store idempotency key ${idempotencyKey}: ${idemErr.message}`);
      }
    }

    return {
      statusCode: 201,
      responseBody
    };
  }
}

module.exports = new SubmissionService();
