const widgetService = require('../services/widget.service');
const submissionService = require('../services/submission.service');
const { extractClientIp } = require('../utils/ip');

class PublicController {
  /**
   * GET /api/public/widgets/:widgetId/config
   * Fetches public configuration with caching and ETag headers
   */
  async getConfig(req, res, next) {
    try {
      const config = await widgetService.getPublicConfig(req.params.widgetId);

      // Short, documented cache for public config (60 seconds + 30s stale-while-revalidate)
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');

      return res.status(200).json(config);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/public/widgets/:widgetId/submissions
   * Handles public untrusted lead submissions
   */
  async submitLead(req, res, next) {
    try {
      const { widgetId } = req.params;
      const clientIp = extractClientIp(req);
      const userAgent = req.get('user-agent') || '';
      const referer = req.get('referer') || '';
      const idempotencyKey = req.get('Idempotency-Key') || req.get('idempotency-key') || null;

      const result = await submissionService.createSubmission({
        widgetId,
        payload: req.body,
        clientIp,
        userAgent,
        referer,
        idempotencyKey
      });

      if (idempotencyKey) {
        res.setHeader('Idempotency-Key', idempotencyKey);
      }

      return res.status(result.statusCode).json(result.responseBody);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PublicController();
