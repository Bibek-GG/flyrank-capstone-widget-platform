const db = require('../db');

class SubmissionRepository {
  /**
   * Insert a new lead submission
   */
  async create({
    id,
    widgetId,
    ownerId,
    data,
    clientIp,
    userAgent,
    referer,
    geolocation,
    idempotencyKey
  }) {
    const res = await db.query(
      `INSERT INTO submissions (
        id, widget_id, owner_id, data, client_ip, user_agent, referer, geolocation, idempotency_key, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, widget_id, owner_id, data, client_ip, user_agent, referer, geolocation, idempotency_key, created_at`,
      [
        id,
        widgetId,
        ownerId,
        typeof data === 'object' ? JSON.stringify(data) : data,
        clientIp || null,
        userAgent || null,
        referer || null,
        geolocation ? JSON.stringify(geolocation) : null,
        idempotencyKey || null
      ]
    );
    return res.rows[0];
  }

  /**
   * Find submissions by owner with optional widget filter and pagination (Tenant Isolated)
   */
  async findByOwner(ownerId, { widgetId, limit = 20, offset = 0 } = {}) {
    const conditions = ['s.owner_id = $1'];
    const params = [ownerId];
    let idx = 2;

    if (widgetId) {
      conditions.push(`s.widget_id = $${idx}`);
      params.push(widgetId);
      idx++;
    }

    params.push(limit);
    const limitIdx = idx++;
    params.push(offset);
    const offsetIdx = idx++;

    const res = await db.query(
      `SELECT s.id, s.widget_id, s.owner_id, s.data, s.client_ip, s.user_agent,
              s.referer, s.geolocation, s.created_at, w.name as widget_name, w.type as widget_type
       FROM submissions s
       JOIN widgets w ON s.widget_id = w.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    return res.rows;
  }

  /**
   * Count total submissions for owner (Tenant Isolated)
   */
  async countByOwner(ownerId, { widgetId } = {}) {
    const conditions = ['owner_id = $1'];
    const params = [ownerId];

    if (widgetId) {
      conditions.push('widget_id = $2');
      params.push(widgetId);
    }

    const res = await db.query(
      `SELECT COUNT(*)::int as count FROM submissions WHERE ${conditions.join(' AND ')}`,
      params
    );
    return res.rows[0].count;
  }

  /**
   * Get single submission by ID and Owner (Tenant Isolated)
   */
  async findByIdAndOwner(id, ownerId) {
    const res = await db.query(
      `SELECT s.id, s.widget_id, s.owner_id, s.data, s.client_ip, s.user_agent,
              s.referer, s.geolocation, s.created_at, w.name as widget_name
       FROM submissions s
       JOIN widgets w ON s.widget_id = w.id
       WHERE s.id = $1 AND s.owner_id = $2`,
      [id, ownerId]
    );
    return res.rows[0] || null;
  }

  /**
   * Overview analytics: aggregate stats for tenant
   */
  async getOverviewStats(ownerId) {
    // 1. Total submissions
    const countRes = await db.query(
      'SELECT COUNT(*)::int as total_submissions FROM submissions WHERE owner_id = $1',
      [ownerId]
    );

    // 2. Total widgets and active widgets
    const widgetRes = await db.query(
      `SELECT 
         COUNT(*)::int as total_widgets,
         COALESCE(SUM(CASE WHEN status = 'enabled' THEN 1 ELSE 0 END), 0)::int as active_widgets
       FROM widgets WHERE owner_id = $1`,
      [ownerId]
    );

    // 3. Submissions timeline (last 7 days)
    const timelineRes = await db.query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
         COUNT(*)::int as count
       FROM submissions
       WHERE owner_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date ASC`,
      [ownerId]
    );

    // 4. Top performing widgets
    const topWidgetsRes = await db.query(
      `SELECT w.id, w.name, w.type, w.status, COUNT(s.id)::int as submission_count
       FROM widgets w
       LEFT JOIN submissions s ON w.id = s.widget_id
       WHERE w.owner_id = $1
       GROUP BY w.id, w.name, w.type, w.status
       ORDER BY submission_count DESC
       LIMIT 5`,
      [ownerId]
    );

    return {
      totalSubmissions: countRes.rows[0]?.total_submissions || 0,
      totalWidgets: widgetRes.rows[0]?.total_widgets || 0,
      activeWidgets: widgetRes.rows[0]?.active_widgets || 0,
      conversionTrend: timelineRes.rows,
      topWidgets: topWidgetsRes.rows
    };
  }

  /**
   * Per-widget analytics: geo breakdown, timeline, count
   */
  async getWidgetStats(widgetId, ownerId) {
    // Verify ownership first
    const widgetRes = await db.query(
      'SELECT id, name, type, status, created_at FROM widgets WHERE id = $1 AND owner_id = $2',
      [widgetId, ownerId]
    );
    if (widgetRes.rows.length === 0) return null;

    // Total count
    const totalRes = await db.query(
      'SELECT COUNT(*)::int as total FROM submissions WHERE widget_id = $1 AND owner_id = $2',
      [widgetId, ownerId]
    );

    // Geolocation breakdown
    const geoRes = await db.query(
      `SELECT 
         COALESCE(geolocation->>'country', 'Unknown') as country,
         COALESCE(geolocation->>'country_code', 'XX') as country_code,
         COUNT(*)::int as count
       FROM submissions
       WHERE widget_id = $1 AND owner_id = $2
       GROUP BY country, country_code
       ORDER BY count DESC
       LIMIT 10`,
      [widgetId, ownerId]
    );

    // Daily submissions timeline
    const timelineRes = await db.query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
         COUNT(*)::int as count
       FROM submissions
       WHERE widget_id = $1 AND owner_id = $2 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date ASC`,
      [widgetId, ownerId]
    );

    return {
      widget: widgetRes.rows[0],
      totalSubmissions: totalRes.rows[0]?.total || 0,
      geoBreakdown: geoRes.rows,
      dailySubmissions: timelineRes.rows
    };
  }
}

module.exports = new SubmissionRepository();
