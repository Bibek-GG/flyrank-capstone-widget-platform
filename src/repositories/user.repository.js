const db = require('../db');

class UserRepository {
  async findById(id) {
    const res = await db.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async findByEmail(email) {
    const res = await db.query(
      'SELECT id, email, password_hash, name, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return res.rows[0] || null;
  }

  async create({ id, email, passwordHash, name }) {
    const res = await db.query(
      `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, name, created_at, updated_at`,
      [id, email.toLowerCase(), passwordHash, name]
    );
    return res.rows[0];
  }
}

module.exports = new UserRepository();
