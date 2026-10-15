const db = require('../db');

class IdempotencyRepository {
  /**
   * Look up an existing idempotency record by key
   */
  async findByKey(key) {
    const res = await db.query(
      `SELECT key, widget_id, response_status, response_body, created_at, expires_at
       FROM idempotency_records
       WHERE key = $1 AND expires_at > NOW()`,
      [key]
    );
    return res.rows[0] || null;
  }

  /**
   * Store the result of an idempotent operation
   */
  async save({ key, widgetId, responseStatus, responseBody, ttlSeconds = 86400 }) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const res = await db.query(
      `INSERT INTO idempotency_records (key, widget_id, response_status, response_body, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       ON CONFLICT (key) DO UPDATE SET
         response_status = EXCLUDED.response_status,
         response_body = EXCLUDED.response_body,
         expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [
        key,
        widgetId,
        responseStatus,
        typeof responseBody === 'object' ? JSON.stringify(responseBody) : responseBody,
        expiresAt
      ]
    );
    return res.rows[0];
  }

  /**
   * Delete expired records (maintenance utility)
   */
  async purgeExpired() {
    const res = await db.query(
      'DELETE FROM idempotency_records WHERE expires_at <= NOW()'
    );
    return res.rowCount;
  }
}

module.exports = new IdempotencyRepository();
