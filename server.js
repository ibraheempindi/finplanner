const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbFile = path.join(__dirname, 'data', 'budget.db');
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

const db = new sqlite3.Database(dbFile);

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT,
    income REAL,
    expenses TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    amount REAL,
    category TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API: get latest plan (prefers current month if exists)
app.get('/api/plan', (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  // try to get current month's plan first
  db.get('SELECT * FROM plan WHERE month = ? ORDER BY id DESC LIMIT 1', [currentMonth], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      try { row.expenses = JSON.parse(row.expenses || '{}'); } catch(e){ row.expenses = {}; }
      return res.json(row);
    }
    // if no current month plan, return latest plan
    db.get('SELECT * FROM plan ORDER BY id DESC LIMIT 1', (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json(null);
      try { row.expenses = JSON.parse(row.expenses || '{}'); } catch(e){ row.expenses = {}; }
      res.json(row);
    });
  });
});

// API: list all plans (id, month, income)
app.get('/api/plans', (req, res) => {
  db.all('SELECT id, month, income, expenses, created_at FROM plan ORDER BY month DESC, id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // parse expenses field for each row
    const parsed = rows.map(r => {
      try { r.expenses = JSON.parse(r.expenses || '{}'); } catch(e){ r.expenses = {}; }
      return r;
    });
    res.json(parsed);
  });
});

// API: get plan by id
app.get('/api/plan/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM plan WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Plan not found' });
    try { row.expenses = JSON.parse(row.expenses || '{}'); } catch(e){ row.expenses = {}; }
    res.json(row);
  });
});

// API: post a new plan
app.post('/api/plan', (req, res) => {
  const { month, income, expenses } = req.body;
  const expensesStr = JSON.stringify(expenses || {});
  db.run('INSERT INTO plan (month, income, expenses) VALUES (?, ?, ?)', [month, income, expensesStr], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// API: post an expense
app.post('/api/expense', (req, res) => {
  const { date, amount, category, note } = req.body;
  db.run('INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)', [date, amount, category, note], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// API: get expenses
app.get('/api/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY date DESC, id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: delete an expense
app.delete('/api/expense/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedId: id });
  });
});

// API: update an expense
app.put('/api/expense/:id', (req, res) => {
  const id = req.params.id;
  const { date, amount, category, note } = req.body;
  db.run('UPDATE expenses SET date = ?, amount = ?, category = ?, note = ? WHERE id = ?', [date, amount, category, note, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updatedId: id });
  });
});

// API: update a planned category amount (updates latest plan)
app.put('/api/plan/expense', (req, res) => {
  const { category, amount } = req.body;
  db.get('SELECT * FROM plan ORDER BY id DESC LIMIT 1', (err, plan) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!plan) return res.status(400).json({ error: 'No plan found' });
    let expenses = {};
    try { expenses = JSON.parse(plan.expenses || '{}'); } catch(e){ expenses = {}; }
    expenses[category] = parseFloat(amount) || 0;
    const expensesStr = JSON.stringify(expenses);
    db.run('UPDATE plan SET expenses = ? WHERE id = ?', [expensesStr, plan.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ planId: plan.id, category, amount: expenses[category] });
    });
  });
});

// API: delete a planned category from latest plan
app.delete('/api/plan/expense/:category', (req, res) => {
  const category = req.params.category;
  db.get('SELECT * FROM plan ORDER BY id DESC LIMIT 1', (err, plan) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!plan) return res.status(400).json({ error: 'No plan found' });
    let expenses = {};
    try { expenses = JSON.parse(plan.expenses || '{}'); } catch(e){ expenses = {}; }
    if (expenses.hasOwnProperty(category)) delete expenses[category];
    const expensesStr = JSON.stringify(expenses);
    db.run('UPDATE plan SET expenses = ? WHERE id = ?', [expensesStr, plan.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ planId: plan.id, deleted: category });
    });
  });
});

// DEV: get all database data for inspection
app.get('/api/dev/db', (req, res) => {
  db.all('SELECT * FROM plan', (err, plans) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all('SELECT * FROM expenses', (err, expenses) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ plans, expenses });
    });
  });
});

// DEV: clear all data (for testing)
app.post('/api/dev/clear', (req, res) => {
  db.run('DELETE FROM plan', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM expenses', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'All data cleared' });
    });
  });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
