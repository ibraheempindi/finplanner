const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');
const path = require('path');

class User {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data', 'users.json');
    this.adapter = new JSONFile(this.dbPath);
    this.db = new Low(this.adapter, { users: [] });
    this.db.read();
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  async create(email, password) {
    await this.db.read();
    const existingUser = this.db.data.users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }
    const hashedPassword = await this.hashPassword(password);
    const user = { id: Date.now().toString(), email, password: hashedPassword };
    this.db.data.users.push(user);
    await this.db.write();
    return { id: user.id, email: user.email };
  }

  async findByEmail(email) {
    await this.db.read();
    return this.db.data.users.find(u => u.email === email);
  }

  async findById(id) {
    await this.db.read();
    return this.db.data.users.find(u => u.id === id);
  }
}

module.exports = new User();