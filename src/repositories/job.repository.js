const db = require('../db');

class JobRepository {
  /**
   * Enqueue a new notification job
   */
  async enqueue({
    id,
    submissionId,
    widgetId,
    ownerId,
    payload,
    maxAttempts = 3
  }) {
    const res = await db.query(
      `INSERT INTO notification_jobs (
        id, submission_id, widget_id, owner_id, payload,
        status, attempts, max_attempts, next_run_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        id,
        submissionId,
        widgetId,
        ownerId,
        typeof payload === 'object' ? JSON.stringify(payload) : payload,
        maxAttempts
      ]
    );
    return res.rows[0];
  }

  /**
   * Fetch and lock next batch of pending jobs ready for processing
   */
  async fetchPendingJobs(limit = 10) {
    return db.withTransaction(async (client) => {
      let selectRes;
      try {
        selectRes = await client.query(
          `SELECT id, submission_id, widget_id, owner_id, payload,
                  status, attempts, max_attempts, last_error, next_run_at
           FROM notification_jobs
           WHERE status = 'pending' AND next_run_at <= NOW()
           ORDER BY next_run_at ASC
           LIMIT $1
           FOR UPDATE SKIP LOCKED`,
          [limit]
        );
      } catch (err) {
        // Fallback for database engines or emulators that do not support SKIP LOCKED
        selectRes = await client.query(
          `SELECT id, submission_id, widget_id, owner_id, payload,
                  status, attempts, max_attempts, last_error, next_run_at
           FROM notification_jobs
           WHERE status = 'pending' AND next_run_at <= NOW()
           ORDER BY next_run_at ASC
           LIMIT $1`,
          [limit]
        );
      }

      const jobs = selectRes.rows;
      if (jobs.length > 0) {
        const ids = jobs.map(j => j.id);
        await client.query(
          `UPDATE notification_jobs
           SET status = 'processing', updated_at = NOW()
           WHERE id = ANY($1::uuid[])`,
          [ids]
        );
      }
      return jobs;
    });
  }

  /**
   * Mark job as completed
   */
  async markCompleted(id) {
    const res = await db.query(
      `UPDATE notification_jobs
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0];
  }

  /**
   * Mark job failure with retry scheduling or exhaustion
   */
  async markFailed(id, errorMessage, nextRunAt, isExhausted) {
    const newStatus = isExhausted ? 'exhausted' : 'pending';
    const res = await db.query(
      `UPDATE notification_jobs
       SET attempts = attempts + 1,
           last_error = $2,
           status = $3,
           next_run_at = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, errorMessage, newStatus, nextRunAt]
    );
    return res.rows[0];
  }

  /**
   * Get job by ID (useful for tests)
   */
  async findById(id) {
    const res = await db.query(
      'SELECT * FROM notification_jobs WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }
}

module.exports = new JobRepository();
