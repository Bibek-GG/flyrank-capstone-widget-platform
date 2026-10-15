const db = require('../db');

class WidgetRepository {
  /**
   * Find widget by ID and Owner ID (Tenant Isolated)
   */
  async findByIdAndOwner(id, ownerId) {
    const res = await db.query(
      `SELECT id, owner_id, name, type, title, description, button_text,
              fields, display_settings, status, created_at, updated_at
       FROM widgets
       WHERE id = $1 AND owner_id = $2`,
      [id, ownerId]
    );
    return res.rows[0] || null;
  }

  /**
   * List all widgets for a specific tenant owner
   */
  async findAllByOwner(ownerId) {
    const res = await db.query(
      `SELECT id, owner_id, name, type, title, description, button_text,
              fields, display_settings, status, created_at, updated_at
       FROM widgets
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [ownerId]
    );
    return res.rows;
  }

  /**
   * Public fetch: Find widget by ID for embedding (only public fields, no owner credentials)
   */
  async findPublicById(id) {
    const res = await db.query(
      `SELECT id, owner_id, type, title, description, button_text, fields, display_settings, status
       FROM widgets
       WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Create a new widget owned by tenant
   */
  async create({
    id,
    ownerId,
    name,
    type,
    title,
    description,
    buttonText,
    fields,
    displaySettings,
    status
  }) {
    const res = await db.query(
      `INSERT INTO widgets (
        id, owner_id, name, type, title, description,
        button_text, fields, display_settings, status,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, owner_id, name, type, title, description,
                button_text, fields, display_settings, status,
                created_at, updated_at`,
      [
        id,
        ownerId,
        name,
        type,
        title,
        description || '',
        buttonText || 'Submit',
        JSON.stringify(fields || []),
        JSON.stringify(displaySettings || {}),
        status || 'enabled'
      ]
    );
    return res.rows[0];
  }

  /**
   * Update widget with tenant isolation check
   */
  async update(id, ownerId, updates) {
    const fieldsToUpdate = [];
    const values = [];
    let idx = 1;

    const allowed = [
      'name',
      'type',
      'title',
      'description',
      'button_text',
      'fields',
      'display_settings',
      'status'
    ];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fieldsToUpdate.push(`${key} = $${idx}`);
        const val = (key === 'fields' || key === 'display_settings') && typeof updates[key] === 'object'
          ? JSON.stringify(updates[key])
          : updates[key];
        values.push(val);
        idx++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return this.findByIdAndOwner(id, ownerId);
    }

    fieldsToUpdate.push(`updated_at = NOW()`);
    values.push(id);
    const idIdx = idx++;
    values.push(ownerId);
    const ownerIdx = idx++;

    const res = await db.query(
      `UPDATE widgets
       SET ${fieldsToUpdate.join(', ')}
       WHERE id = $${idIdx} AND owner_id = $${ownerIdx}
       RETURNING id, owner_id, name, type, title, description,
                 button_text, fields, display_settings, status,
                 created_at, updated_at`,
      values
    );

    return res.rows[0] || null;
  }

  /**
   * Delete widget with tenant isolation
   */
  async delete(id, ownerId) {
    const res = await db.query(
      'DELETE FROM widgets WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, ownerId]
    );
    return res.rowCount > 0;
  }
}

module.exports = new WidgetRepository();
