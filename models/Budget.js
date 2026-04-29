const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

class BudgetDB {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data', 'budget.json');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    this.adapter = new JSONFile(this.dbPath);
    this.db = new Low(this.adapter, { plans: [], expenses: [] });
    this.db.read();
  }

  async read() {
    await this.db.read();
  }

  async write() {
    await this.db.write();
  }

  // Plans
  async createPlan(month, income, expenses) {
    await this.read();
    const plan = {
      id: Date.now().toString(),
      month,
      income: parseFloat(income) || 0,
      expenses: expenses || {},
      created_at: new Date().toISOString()
    };
    this.db.data.plans.push(plan);
    await this.write();
    return plan;
  }

  async getPlans() {
    await this.read();
    return this.db.data.plans.sort((a, b) => new Date(b.month) - new Date(a.month));
  }

  async getPlanById(id) {
    await this.read();
    return this.db.data.plans.find(p => p.id === id);
  }

  async getLatestPlan() {
    await this.read();
    return this.db.data.plans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  }

  async getPlanByMonth(month) {
    await this.read();
    return this.db.data.plans.filter(p => p.month === month).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  }

  async updatePlanExpense(category, amount) {
    const plan = await this.getLatestPlan();
    if (!plan) throw new Error('No plan found');
    plan.expenses = plan.expenses || {};
    plan.expenses[category] = parseFloat(amount) || 0;
    await this.write();
    return { planId: plan.id, category, amount: plan.expenses[category] };
  }

  async deletePlanExpense(category) {
    const plan = await this.getLatestPlan();
    if (!plan) throw new Error('No plan found');
    if (plan.expenses) delete plan.expenses[category];
    await this.write();
    return plan.id;
  }

  // Expenses
  async createExpense(date, amount, category, note) {
    await this.read();
    const expense = {
      id: Date.now().toString(),
      date,
      amount: parseFloat(amount) || 0,
      category,
      note: note || '',
      created_at: new Date().toISOString()
    };
    this.db.data.expenses.push(expense);
    await this.write();
    return expense;
  }

  async getExpenses() {
    await this.read();
    return this.db.data.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async deleteExpense(id) {
    await this.read();
    const index = this.db.data.expenses.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Expense not found');
    this.db.data.expenses.splice(index, 1);
    await this.write();
    return id;
  }

  async updateExpense(id, updates) {
    await this.read();
    const expense = this.db.data.expenses.find(e => e.id === id);
    if (!expense) throw new Error('Expense not found');
    Object.assign(expense, updates);
    await this.write();
    return expense;
  }
}

module.exports = new BudgetDB();