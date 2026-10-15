const widgetService = require('../services/widget.service');

class WidgetController {
  async create(req, res, next) {
    try {
      const widget = await widgetService.createWidget(req.user.id, req.body);
      return res.status(201).json({ widget });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const widgets = await widgetService.listWidgets(req.user.id);
      return res.status(200).json({ widgets });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const widget = await widgetService.getWidget(req.params.id, req.user.id);
      return res.status(200).json({ widget });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const widget = await widgetService.updateWidget(req.params.id, req.user.id, req.body);
      return res.status(200).json({ widget });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await widgetService.deleteWidget(req.params.id, req.user.id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getEmbedSnippet(req, res, next) {
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const reqHost = `${protocol}://${host}`;
      const snippetData = await widgetService.getEmbedSnippet(req.params.id, req.user.id, reqHost);
      return res.status(200).json(snippetData);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WidgetController();
