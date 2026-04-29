const { pool } = require('./db');
const bcrypt = require('bcryptjs');

class User {
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  async create(email, password) {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }
    const hashedPassword = await this.hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    return result.rows[0];
  }

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

module.exports = new User();