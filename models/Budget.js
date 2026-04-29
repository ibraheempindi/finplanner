const { pool } = require('./db');

class BudgetDB {
  async createPlan(month, income, expenses, userId) {
    const result = await pool.query(
      'INSERT INTO plans (user_id, month, income, expenses) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, month, parseFloat(income) || 0, expenses || {}]
    );
    return result.rows[0];
  }

  async getPlans(userId) {
    const result = await pool.query(
      'SELECT id, month, income, expenses, created_at FROM plans WHERE user_id = $1 ORDER BY month DESC, created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async getPlanById(id, userId) {
    const result = await pool.query('SELECT * FROM plans WHERE id = $1 AND user_id = $2', [id, userId]);
    return result.rows[0] || null;
  }

  async getLatestPlan(userId) {
    const result = await pool.query(
      'SELECT * FROM plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  }

  async getPlanByMonth(month, userId) {
    const result = await pool.query(
      'SELECT * FROM plans WHERE user_id = $1 AND month = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, month]
    );
    return result.rows[0] || null;
  }

  async updatePlanExpense(category, amount, userId) {
    const plan = await this.getLatestPlan(userId);
    if (!plan) throw new Error('No plan found');
    const expenses = plan.expenses || {};
    expenses[category] = parseFloat(amount) || 0;
    await pool.query('UPDATE plans SET expenses = $1 WHERE id = $2', [expenses, plan.id]);
    return { planId: plan.id, category, amount: expenses[category] };
  }

  async deletePlanExpense(category, userId) {
    const plan = await this.getLatestPlan(userId);
    if (!plan) throw new Error('No plan found');
    const expenses = plan.expenses || {};
    delete expenses[category];
    await pool.query('UPDATE plans SET expenses = $1 WHERE id = $2', [expenses, plan.id]);
    return plan.id;
  }

  async createExpense(date, amount, category, note, userId) {
    const result = await pool.query(
      'INSERT INTO expenses (user_id, date, amount, category, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, date, parseFloat(amount) || 0, category, note || '']
    );
    return result.rows[0];
  }

  async getExpenses(userId) {
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async deleteExpense(id, userId) {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (!result.rowCount) throw new Error('Expense not found');
    return result.rows[0].id;
  }

  async updateExpense(id, updates, userId) {
    const result = await pool.query(
      'UPDATE expenses SET date = $1, amount = $2, category = $3, note = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [updates.date, parseFloat(updates.amount) || 0, updates.category, updates.note || '', id, userId]
    );
    if (!result.rowCount) throw new Error('Expense not found');
    return result.rows[0];
  }
}

module.exports = new BudgetDB();