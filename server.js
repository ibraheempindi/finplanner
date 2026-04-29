const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('./models/User');
const BudgetDB = require('./models/Budget');

const app = express();
const PORT = process.env.PORT || 3000;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'iby-secret-key'
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error, false);
  }
}));

app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.create(email, password);
    const token = jwt.sign({ id: user.id, email: user.email }, jwtOptions.secretOrKey);
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || !(await User.comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, jwtOptions.secretOrKey);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: get latest plan (prefers current month if exists)
app.get('/api/plan', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let plan = await BudgetDB.getPlanByMonth(currentMonth);
    if (!plan) {
      plan = await BudgetDB.getLatestPlan();
    }
    res.json(plan || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: list all plans (id, month, income)
app.get('/api/plans', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const plans = await BudgetDB.getPlans();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: get plan by id
app.get('/api/plan/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const plan = await BudgetDB.getPlanById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: post a new plan
app.post('/api/plan', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { month, income, expenses } = req.body;
    const plan = await BudgetDB.createPlan(month, income, expenses);
    res.json({ id: plan.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: post an expense
app.post('/api/expense', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { date, amount, category, note } = req.body;
    const expense = await BudgetDB.createExpense(date, amount, category, note);
    res.json({ id: expense.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: get expenses
app.get('/api/expenses', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const expenses = await BudgetDB.getExpenses();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: delete an expense
app.delete('/api/expense/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const id = await BudgetDB.deleteExpense(req.params.id);
    res.json({ deletedId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: update an expense
app.put('/api/expense/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { date, amount, category, note } = req.body;
    const expense = await BudgetDB.updateExpense(req.params.id, { date, amount: parseFloat(amount), category, note });
    res.json({ updatedId: expense.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: update a planned category amount (updates latest plan)
app.put('/api/plan/expense', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { category, amount } = req.body;
    const result = await BudgetDB.updatePlanExpense(category, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: delete a planned category from latest plan
app.delete('/api/plan/expense/:category', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const planId = await BudgetDB.deletePlanExpense(req.params.category);
    res.json({ planId });
  } catch (error) {
    res.status(500).json({ error: error.message });
// API: delete a planned category from latest plan
app.delete('/api/plan/expense/:category', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const planId = await BudgetDB.deletePlanExpense(req.params.category);
    res.json({ planId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
