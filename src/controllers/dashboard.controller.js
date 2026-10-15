const dashboardService = require('../services/dashboard.service');

class DashboardController {
  async getOverview(req, res, next) {
    try {
      const overview = await dashboardService.getOverview(req.user.id);
      return res.status(200).json({ stats: overview });
    } catch (err) {
      next(err);
    }
  }

  async getSubmissions(req, res, next) {
    try {
      const { widgetId, page, limit } = req.query;
      const data = await dashboardService.getSubmissions(req.user.id, {
        widgetId,
        page,
        limit
      });
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getWidgetStats(req, res, next) {
    try {
      const { widgetId } = req.params;
      const stats = await dashboardService.getWidgetStats(widgetId, req.user.id);
      return res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
