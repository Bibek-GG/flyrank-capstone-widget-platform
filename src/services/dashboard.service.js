const submissionRepository = require('../repositories/submission.repository');
const widgetRepository = require('../repositories/widget.repository');

class DashboardService {
  /**
   * Get high-level overview metrics for the authenticated tenant
   */
  async getOverview(ownerId) {
    return submissionRepository.getOverviewStats(ownerId);
  }

  /**
   * Get paginated submissions for the authenticated tenant with optional widget filter
   */
  async getSubmissions(ownerId, { widgetId, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // If widgetId specified, verify ownership first (tenant isolation)
    if (widgetId) {
      const widget = await widgetRepository.findByIdAndOwner(widgetId, ownerId);
      if (!widget) {
        const error = new Error('Widget not found or does not belong to you.');
        error.status = 404;
        throw error;
      }
    }

    const [submissions, totalCount] = await Promise.all([
      submissionRepository.findByOwner(ownerId, { widgetId, limit: limitNum, offset }),
      submissionRepository.countByOwner(ownerId, { widgetId })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return {
      submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages
      }
    };
  }

  /**
   * Get per-widget analytics for the authenticated tenant
   */
  async getWidgetStats(widgetId, ownerId) {
    const stats = await submissionRepository.getWidgetStats(widgetId, ownerId);
    if (!stats) {
      const error = new Error('Widget not found or does not belong to you.');
      error.status = 404;
      throw error;
    }
    return stats;
  }
}

module.exports = new DashboardService();
