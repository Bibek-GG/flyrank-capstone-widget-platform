const config = require('../config');
const logger = require('../utils/logger');

class EmailAdapter {
  /**
   * Send notification for a new lead submission
   * @param {object} payload - Job payload with lead details
   */
  async sendNotification(payload) {
    if (config.notificationSimulateFail || process.env.NOTIFICATION_SIMULATE_FAIL === 'true') {
      throw new Error('[SIMULATED_FAILURE] Notification dispatch failed (SMTP/service unreachable)');
    }

    // Default local adapter: structured dispatch log
    logger.info('[NOTIFICATION_DISPATCHED] New lead captured successfully', {
      recipient: payload.recipientEmail || 'owner@domain.com',
      widgetTitle: payload.widgetTitle,
      submittedAt: payload.submittedAt,
      fieldsCount: Object.keys(payload.data || {}).length
    });

    return {
      status: 'sent',
      dispatchedAt: new Date().toISOString()
    };
  }
}

module.exports = new EmailAdapter();
