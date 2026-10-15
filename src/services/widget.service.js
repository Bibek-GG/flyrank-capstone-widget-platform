const crypto = require('crypto');
const widgetRepository = require('../repositories/widget.repository');
const config = require('../config');

class WidgetService {
  /**
   * Create a new widget owned by user
   */
  async createWidget(ownerId, data) {
    const widgetId = crypto.randomUUID();

    const widget = await widgetRepository.create({
      id: widgetId,
      ownerId,
      name: data.name,
      type: data.type,
      title: data.title,
      description: data.description,
      buttonText: data.button_text,
      fields: data.fields,
      displaySettings: data.display_settings,
      status: data.status || 'enabled'
    });

    return widget;
  }

  /**
   * List widgets owned by user
   */
  async listWidgets(ownerId) {
    return widgetRepository.findAllByOwner(ownerId);
  }

  /**
   * Get single widget with strict tenant isolation
   */
  async getWidget(id, ownerId) {
    const widget = await widgetRepository.findByIdAndOwner(id, ownerId);
    if (!widget) {
      const error = new Error('Widget not found or you do not have permission to view it.');
      error.status = 404;
      throw error;
    }
    return widget;
  }

  /**
   * Update widget with strict tenant isolation
   */
  async updateWidget(id, ownerId, updates) {
    // Verify existence & ownership first
    const existing = await widgetRepository.findByIdAndOwner(id, ownerId);
    if (!existing) {
      const error = new Error('Widget not found or you do not have permission to update it.');
      error.status = 404;
      throw error;
    }

    const updated = await widgetRepository.update(id, ownerId, updates);
    return updated;
  }

  /**
   * Delete widget with strict tenant isolation
   */
  async deleteWidget(id, ownerId) {
    const existing = await widgetRepository.findByIdAndOwner(id, ownerId);
    if (!existing) {
      const error = new Error('Widget not found or you do not have permission to delete it.');
      error.status = 404;
      throw error;
    }

    await widgetRepository.delete(id, ownerId);
    return { success: true, message: 'Widget deleted successfully.' };
  }

  /**
   * Public configuration lookup for embed script
   */
  async getPublicConfig(id) {
    const widget = await widgetRepository.findPublicById(id);
    if (!widget || widget.status !== 'enabled') {
      const error = new Error('Widget not found or is currently disabled.');
      error.status = 404;
      throw error;
    }

    return {
      id: widget.id,
      type: widget.type,
      title: widget.title,
      description: widget.description,
      button_text: widget.button_text,
      fields: widget.fields,
      display_settings: widget.display_settings
    };
  }

  /**
   * Generate embed snippet for host websites
   */
  async getEmbedSnippet(id, ownerId, reqHost) {
    // Verify ownership
    const widget = await widgetRepository.findByIdAndOwner(id, ownerId);
    if (!widget) {
      const error = new Error('Widget not found or you do not have permission to access it.');
      error.status = 404;
      throw error;
    }

    const hostUrl = reqHost || config.baseUrl;
    const scriptUrl = `${hostUrl}/widget.v1.js`;
    const snippet = `<!-- FlyRank Embeddable Widget -->\n<script src="${scriptUrl}" data-widget-id="${widget.id}"></script>\n<div id="flyrank-widget-${widget.id}"></div>`;

    return {
      widgetId: widget.id,
      widgetName: widget.name,
      snippet,
      scriptUrl
    };
  }
}

module.exports = new WidgetService();
