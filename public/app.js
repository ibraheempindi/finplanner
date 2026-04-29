let currentPlan = null;
let plansCache = [];
let allExpenses = [];  // cache all expenses for filtering

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

async function getPlan(){
  try {
    const res = await fetch('/api/plan', { headers: getAuthHeaders() });
    const data = await res.json();
    currentPlan = data;

    const el = document.getElementById('current-plan');
    if (!data) {
      el.innerHTML = '<p class="no-data">No plan set yet.</p>';
      populateCategoryDropdown();
      updateSummaryBar(null, []);
      return;
    }

    // Get all expenses to calculate remaining balance
    const expensesRes = await fetch('/api/expenses', { headers: getAuthHeaders() });
    const expenses = await expensesRes.json();

    // Build HTML display
    let html = `<div class="plan-header"><p><strong>Month:</strong> ${data.month} | <strong>Total Income:</strong> $${parseFloat(data.income).toFixed(2)}</p></div>`;
    html += '<div class="plan-categories">';

    let totalExpensed = 0;
    for (const [category, planned] of Object.entries(data.expenses)) {
      const spent = expenses
        .filter(e => e.category === category)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const remaining = parseFloat(planned) - spent;
      totalExpensed += spent;
      const statusClass = remaining < 0 ? 'over' : remaining === 0 ? 'full' : 'ok';
      html += `
        <div class="category-item ${statusClass}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="cat-name">${category}</div>
            <div style="display:flex;gap:8px">
              <button class="btn-small edit-plan-cat" data-category="${category}">Edit</button>
              <button class="btn-small delete-plan-cat" data-category="${category}">Delete</button>
            </div>
          </div>
          <div class="cat-planned">Planned: $${parseFloat(planned).toFixed(2)}</div>
          <div class="cat-spent">Spent: $${spent.toFixed(2)}</div>
          <div class="cat-remaining">Remaining: <span class="amount">$${remaining.toFixed(2)}</span></div>
        </div>
      `;
    }
    html += '</div>';
    html += `<div class="plan-summary"><p><strong>Total Expenses Planned:</strong> $${Object.values(data.expenses).reduce((a,b)=>a+parseFloat(b),0).toFixed(2)} | <strong>Total Spent:</strong> $${totalExpensed.toFixed(2)} | <strong>Remaining Budget:</strong> $${(parseFloat(data.income) - totalExpensed).toFixed(2)}</p></div>`;

    el.innerHTML = html;
    // attach handlers for plan category edit/delete
    document.querySelectorAll('.edit-plan-cat').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const cat = btn.dataset.category;
        const newAmount = prompt('New planned amount for ' + cat + ':');
        if (newAmount === null) return;
        const amt = parseFloat(newAmount);
        if (isNaN(amt)) { alert('Invalid amount'); return; }
        try {
          const r = await fetch('/api/plan/expense', {
            method: 'PUT', headers: getAuthHeaders(),
            body: JSON.stringify({ category: cat, amount: amt })
          });
          if (!r.ok) throw new Error('Failed');
          await getPlan();
        } catch (e) { alert('Error updating planned category'); }
      });
    });
    document.querySelectorAll('.delete-plan-cat').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const cat = btn.dataset.category;
        if (!confirm('Delete planned category "' + cat + '"?')) return;
        try {
          const r = await fetch('/api/plan/expense/' + encodeURIComponent(cat), { method: 'DELETE', headers: getAuthHeaders() });
          if (!r.ok) throw new Error('Failed');
          await getPlan();
        } catch (e) { alert('Error deleting planned category'); }
      });
    });
    populateCategoryDropdown();
    updateSummaryBar(data, expenses);
  } catch(e) {
    console.error('Error loading plan:', e);
  }
}

// load list of available plans (history) and populate selector
async function loadPlansList(){
  try {
    const res = await fetch('/api/plans', { headers: getAuthHeaders() });
    const list = await res.json();
    plansCache = list;
    const sel = document.getElementById('history-months');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select month --</option>';
    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.month}  (${p.id})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Error loading plans list', e);
  }
}

// load a specific plan by id and render it as the active view (without making it currentPlan)
async function loadPlanById(id){
  try {
    const res = await fetch('/api/plan/' + id, { headers: getAuthHeaders() });
    if (!res.ok) { alert('Unable to load plan'); return; }
    const plan = await res.json();
    // fetch expenses and filter by plan.month
    const expRes = await fetch('/api/expenses', { headers: getAuthHeaders() });
    const allExpenses = await expRes.json();
    const filtered = allExpenses.filter(e => e.date && e.date.startsWith(plan.month));
    // render the plan details into the current-plan element (don't change active currentPlan)
    const el = document.getElementById('current-plan');
    if (!el) return;
    let html = `<div class="plan-header"><p><strong>Month:</strong> ${plan.month} | <strong>Total Income:</strong> $${parseFloat(plan.income).toFixed(2)}</p></div>`;
    html += '<div class="plan-categories">';
    let totalExpensed = 0;
    for (const [category, planned] of Object.entries(plan.expenses)) {
      const spent = filtered.filter(e => e.category === category).reduce((s, e) => s + parseFloat(e.amount), 0);
      const remaining = parseFloat(planned) - spent;
      totalExpensed += spent;
      const statusClass = remaining < 0 ? 'over' : remaining === 0 ? 'full' : 'ok';
      html += `
        <div class="category-item ${statusClass}">
          <div class="cat-name">${category}</div>
          <div class="cat-planned">Planned: $${parseFloat(planned).toFixed(2)}</div>
          <div class="cat-spent">Spent: $${spent.toFixed(2)}</div>
          <div class="cat-remaining">Remaining: <span class="amount">$${remaining.toFixed(2)}</span></div>
        </div>
      `;
    }
    html += '</div>';
    html += `<div class="plan-summary"><p><strong>Total Expenses Planned:</strong> $${Object.values(plan.expenses).reduce((a,b)=>a+parseFloat(b),0).toFixed(2)} | <strong>Total Spent:</strong> $${totalExpensed.toFixed(2)}</p></div>`;
    el.innerHTML = html;
    // update the summary bar to reflect this historic plan and its filtered expenses
    try { updateSummaryBar(plan, filtered); } catch(e) { console.error('updateSummaryBar failed', e); }
    // also render expenses list filtered
    const listEl = document.getElementById('expenses-list');
    if (listEl) {
      listEl.innerHTML = '';
      if (filtered.length === 0) listEl.innerHTML = '<li class="no-data">No expenses for this month.</li>';
      filtered.forEach(r => {
        const li = document.createElement('li');
        li.className = 'expense-item';
        // parse date string (YYYY-MM-DD) and format in local timezone
        const [year, month, day] = r.date.split('T')[0].split('-');
        const dateObj = new Date(year, month - 1, day);
        const dateStr = dateObj.toLocaleDateString();
        li.innerHTML = `
          <div class="exp-date">${dateStr}</div>
          <div class="exp-details">
            <div class="exp-category">${r.category || 'Uncategorized'}</div>
            <div class="exp-note">${r.note || ''}</div>
          </div>
          <div class="exp-amount">$${parseFloat(r.amount).toFixed(2)}</div>
        `;
        listEl.appendChild(li);
      });
    }
    // do not modify the global currentPlan so expense entry UI stays pointed at latest plan
  } catch (e) {
    console.error('Error loading plan by id', e);
  }
}

function addHistoryHandlers(){
  const loadBtn = document.getElementById('load-history');
  const sel = document.getElementById('history-months');
  const copyCurrent = document.getElementById('copy-to-current');
  const copyNext = document.getElementById('copy-to-next');
  if (loadBtn && sel) {
    loadBtn.addEventListener('click', () => {
      const id = sel.value;
      if (!id) { alert('Select a month'); return; }
      loadPlanById(id);
    });
  }
  if (copyCurrent && sel) {
    copyCurrent.addEventListener('click', async () => {
      const id = sel.value;
      if (!id) { alert('Select a month'); return; }
      const plan = plansCache.find(p => String(p.id) === String(id));
      if (!plan) { alert('Plan not found'); return; }
      // copy into current month (month input)
      const monthInput = document.querySelector('input[name="month"]');
      const targetMonth = monthInput ? monthInput.value : new Date().toISOString().slice(0,7);
      // check if target month already has a plan
      const existing = plansCache.find(p => p.month === targetMonth);
      if (existing) {
        const ok = confirm(`${targetMonth} already has planned values. Overwrite?`);
        if (!ok) return;
        // if overwrite, delete existing plan and create new one
      }
      try {
        const r = await fetch('/api/plan', {
          method: 'POST', headers: getAuthHeaders(),
          body: JSON.stringify({ month: targetMonth, income: plan.income, expenses: plan.expenses })
        });
        if (!r.ok) throw new Error('Failed');
        await loadPlansList();
        await getPlan();
        alert('Plan copied to ' + targetMonth);
      } catch (e) { alert('Error copying plan'); }
    });
  }
  if (copyNext && sel) {
    copyNext.addEventListener('click', async () => {
      const id = sel.value;
      if (!id) { alert('Select a month'); return; }
      const plan = plansCache.find(p => String(p.id) === String(id));
      if (!plan) { alert('Plan not found'); return; }
      // compute next month
      const [y,m] = plan.month.split('-').map(Number);
      let ny = y; let nm = m + 1;
      if (nm > 12) { nm = 1; ny += 1; }
      const targetMonth = `${String(ny).padStart(4,'0')}-${String(nm).padStart(2,'0')}`;
      // check existing
      const existing = plansCache.find(p => p.month === targetMonth);
      if (existing) {
        const ok = confirm(`${targetMonth} already has planned values. Overwrite?`);
        if (!ok) return;
      }
      try {
        const r = await fetch('/api/plan', {
          method: 'POST', headers: {'content-type':'application/json'},
          body: JSON.stringify({ month: targetMonth, income: plan.income, expenses: plan.expenses })
        });
        if (!r.ok) throw new Error('Failed');
        await loadPlansList();
        await getPlan();
        alert('Plan copied to ' + targetMonth);
      } catch (e) { alert('Error copying plan'); }
    });
  }
}

async function submitPlan(ev){
  ev.preventDefault();
  try {
    const f = ev.target;
    const month = f.month.value;
    const income = parseFloat(f.income.value);
    let expenses = {};
    try {
      expenses = JSON.parse(f.expenses.value || '{}');
    } catch (e) {
      alert('Expenses must be valid JSON. Example: {"Rent":1000, "Food":300}');
      return;
    }

    const res = await fetch('/api/plan', {
      method:'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ month, income, expenses })
    });

    if (!res.ok) {
      alert('Error saving plan');
      return;
    }

    f.reset();
    await getPlan();
    alert('Plan saved successfully!');
  } catch(e) {
    console.error('Error submitting plan:', e);
    alert('Error saving plan: ' + e.message);
  }
}

async function loadExpenses(){
  try {
    const res = await fetch('/api/expenses');
    const rows = await res.json();
    allExpenses = rows;  // store all expenses
    
    // populate filter category dropdown
    const filterCat = document.getElementById('filter-category');
    if (filterCat) {
      const cats = new Set(['']);
      rows.forEach(r => { if(r.category) cats.add(r.category); });
      const currVal = filterCat.value;
      filterCat.innerHTML = '<option value="">All</option>';
      Array.from(cats).sort().forEach(cat => {
        if (cat) {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          filterCat.appendChild(opt);
        }
      });
      filterCat.value = currVal;
    }
    
    applyExpenseFilters();  // apply filters and render
  } catch(e) {
    console.error('Error loading expenses:', e);
  }
}

function applyExpenseFilters(){
  const startDate = document.getElementById('filter-start-date')?.value || '';
  const endDate = document.getElementById('filter-end-date')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const minAmount = parseFloat(document.getElementById('filter-min-amount')?.value || '0') || 0;
  const maxAmount = parseFloat(document.getElementById('filter-max-amount')?.value || '999999999') || 999999999;
  
  console.log('Applying filters:', { startDate, endDate, category, minAmount, maxAmount, allExpensesCount: allExpenses.length });
  
  // filter expenses
  let filtered = allExpenses.filter(r => {
    // normalize dates for comparison
    const rDateStr = String(r.date).slice(0, 10);
    const pass = (!startDate || rDateStr >= startDate) && 
                 (!endDate || rDateStr <= endDate) &&
                 (!category || r.category === category) &&
                 (parseFloat(r.amount) >= minAmount && parseFloat(r.amount) <= maxAmount);
    return pass;
  });
  
  console.log('Filtered results:', filtered.length, filtered.slice(0,3));
  
  // render filtered expenses
  const list = document.getElementById('expenses-list');
  list.innerHTML = '';
  
  if (filtered.length === 0) {
    list.innerHTML = '<li class="no-data">No expenses match filters.</li>';
    // clear total
    const totalEl = document.getElementById('expenses-total');
    if (totalEl) totalEl.textContent = 'Total: $0.00';
    return;
  }
  
  // compute and display total
  const total = filtered.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const totalEl = document.getElementById('expenses-total');
  if (totalEl) totalEl.textContent = `Total: $${total.toFixed(2)}`;
  
  filtered.forEach(r => {
    const li = document.createElement('li');
    li.className = 'expense-item';
    // parse date string (YYYY-MM-DD) and format in local timezone
    const [year, month, day] = r.date.split('T')[0].split('-');
    const dateObj = new Date(year, month - 1, day);
    const dateStr = dateObj.toLocaleDateString();
    li.innerHTML = `
      <div class="exp-date">${dateStr}</div>
      <div class="exp-details">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="exp-category">${r.category || 'Uncategorized'}</div>
          <div style="display:flex;gap:8px">
            <button class="btn-small btn-exp-edit" data-id="${r.id}" data-date="${r.date}" data-amount="${r.amount}" data-category="${r.category}" data-note="${r.note}">Edit</button>
            <button class="btn-small btn-exp-delete" data-id="${r.id}">Delete</button>
          </div>
        </div>
        <div class="exp-note">${r.note || ''}</div>
      </div>
      <div class="exp-amount">$${parseFloat(r.amount).toFixed(2)}</div>
    `;
    list.appendChild(li);
    // attach event listeners for this item
    const editBtn = li.querySelector('.btn-exp-edit');
    const delBtn = li.querySelector('.btn-exp-delete');
    if (editBtn) {
      editBtn.addEventListener('click', async () => {
        const id = editBtn.dataset.id;
        const newDate = prompt('Date (YYYY-MM-DD):', editBtn.dataset.date || new Date().toISOString().slice(0,10));
        if (newDate === null) return;
        const newAmount = prompt('Amount:', editBtn.dataset.amount || '0');
        if (newAmount === null) return;
        const newCategory = prompt('Category:', editBtn.dataset.category || '');
        if (newCategory === null) return;
        const newNote = prompt('Note:', editBtn.dataset.note || '');
        if (newNote === null) return;
        try {
          const res = await fetch('/api/expense/' + id, {
            method: 'PUT', headers: {'content-type':'application/json'},
            body: JSON.stringify({ date: newDate, amount: parseFloat(newAmount), category: newCategory, note: newNote })
          });
          if (!res.ok) throw new Error('Failed');
          await loadExpenses();
          await getPlan();
        } catch (e) { alert('Error updating expense'); }
      });
    }
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        const id = delBtn.dataset.id;
        if (!confirm('Delete this expense?')) return;
        try {
          const res = await fetch('/api/expense/' + id, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed');
          await loadExpenses();
          await getPlan();
        } catch (e) { alert('Error deleting expense'); }
      });
    }
  });
}


async function submitExpense(ev){
  ev.preventDefault();
  try {
    const f = ev.target;
    const date = f.date.value;
    const amount = parseFloat(f.amount.value);
    const category = document.getElementById('category-select').value;
    const note = f.note.value;

    if (!category) {
      alert('Please select a category');
      return;
    }

    const res = await fetch('/api/expense', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ date, amount, category, note })
    });

    if (!res.ok) {
      alert('Error saving expense');
      return;
    }

    f.reset();
    await loadExpenses();
    await getPlan();
    alert('Expense recorded!');
  } catch(e) {
    console.error('Error submitting expense:', e);
    alert('Error saving expense: ' + e.message);
  }
}

function populateCategoryDropdown(){
  try {
    const categorySelect = document.getElementById('category-select');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">Select a category...</option>';

    if (!currentPlan || !currentPlan.expenses) return;

    for (const category of Object.keys(currentPlan.expenses)) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    }
  } catch(e) {
    console.error('Error populating dropdown:', e);
  }
}

function updateSummaryBar(plan, expenses){
  const summaryEl = document.getElementById('plan-summary-bar');
  if (!summaryEl) return;
  if (!plan) { summaryEl.classList.add('hidden'); return }

  const totalPlanned = Object.values(plan.expenses).reduce((a,b)=>a+parseFloat(b),0);
  const totalSpent = Object.keys(plan.expenses).reduce((sum, cat) => {
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0);
    return sum + spent;
  }, 0);
  const remainingBudget = parseFloat(plan.income) - totalSpent;

  // build chips with progress bars and color thresholds
  let chips = Object.keys(plan.expenses).map(category => {
    const planned = parseFloat(plan.expenses[category]) || 0;
    const spent = expenses.filter(e => e.category === category).reduce((s, e) => s + parseFloat(e.amount), 0);
    const remaining = planned - spent;
    const rawPercent = planned > 0 ? (remaining / planned) * 100 : 0;
    let displayPercent;
    let colorClass = 'green';
    // if over-budget, show a full red bar
    if (remaining <= 0) {
      displayPercent = 100;
      colorClass = 'red';
    } else {
      displayPercent = Math.max(0, Math.min(100, rawPercent));
      if (displayPercent <= 10) colorClass = 'red';
      else if (displayPercent <= 20) colorClass = 'yellow';
    }
    const overClass = remaining <= 0 ? 'over' : '';

    return `
      <div class="summary-chip ${overClass}">
        <div class="chip-header">
          <strong>${category}</strong>
          <span class="chip-amount">$${remaining.toFixed(2)} / $${planned.toFixed(2)}</span>
        </div>
        <div class="progress">
          <div class="progress-fill ${colorClass}" style="width:${displayPercent}%"></div>
        </div>
      </div>`;
  }).join('');

  summaryEl.innerHTML = `
    <div class="plan-summary-bar-header">
      <strong>Balance Summary</strong>
      <button id="toggle-summary-bar">Hide</button>
    </div>
    <div id="summary-bar-content">
      ${ (typeof currentPlan !== 'undefined' && currentPlan && plan.month !== currentPlan.month) ? `<div class="historic-indicator">Viewing historic: <strong>${plan.month}</strong> <button id="back-to-current" class="btn-small">Back to Current</button></div>` : '' }
      <div class="plan-summary-row">
        <div class="summary-left"><strong>Month:</strong> ${plan.month} &nbsp; <strong>Income:</strong> $${parseFloat(plan.income).toFixed(2)}</div>
        <div class="summary-right"><strong>Remaining:</strong> $${remainingBudget.toFixed(2)}</div>
      </div>
      <div class="summary-chips">${chips}</div>
    </div>
  `;
  summaryEl.classList.remove('hidden');
  // attach toggle handler after rendering
  const toggleBtn = document.getElementById('toggle-summary-bar');
  const summaryContent = document.getElementById('summary-bar-content');
  if (toggleBtn && summaryContent) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = summaryContent.style.display === 'none';
      summaryContent.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
      localStorage.setItem('summaryBarCollapsed', isHidden ? 'false' : 'true');
    });
    // restore from localStorage
    if (localStorage.getItem('summaryBarCollapsed') === 'true') {
      summaryContent.style.display = 'none';
      toggleBtn.textContent = 'Show';
    }
  }
  // attach back-to-current handler if present
  const backBtn = document.getElementById('back-to-current');
  if (backBtn) {
    backBtn.addEventListener('click', async () => {
      // clear history selector and reload latest plan
      const sel = document.getElementById('history-months');
      if (sel) sel.value = '';
      await getPlan();
      await loadPlansList();
    });
  }
}

// copy example behavior
function setupExampleCopy(){
  const copyBtn = document.getElementById('copy-example');
  const examplePre = document.getElementById('expenses-example');
  const expensesTextarea = document.getElementById('expenses-textarea');
  if (!copyBtn || !examplePre) return;
  copyBtn.addEventListener('click', async () => {
    const txt = examplePre.innerText.trim();
    try {
      await navigator.clipboard.writeText(txt);
      alert('Example copied to clipboard');
    } catch (e) {
      if (expensesTextarea) {
        expensesTextarea.value = txt;
        expensesTextarea.focus();
        expensesTextarea.select();
        alert('Example inserted into the expenses textarea');
      } else {
        alert('Unable to copy example');
      }
    }
  });
  examplePre.addEventListener('click', () => {
    const range = document.createRange();
    range.selectNodeContents(examplePre);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
}

// initialize
document.addEventListener('DOMContentLoaded', () => {
  const planForm = document.getElementById('plan-form');
  const expenseForm = document.getElementById('expense-form');
  const showPlanBtn = document.getElementById('show-plan');
  const showExpenseBtn = document.getElementById('show-expense');

  if (planForm) planForm.addEventListener('submit', submitPlan);
  if (expenseForm) expenseForm.addEventListener('submit', submitExpense);
  if (showPlanBtn) showPlanBtn.addEventListener('click', () => {
    document.getElementById('plan-section').classList.remove('hidden');
    document.getElementById('expense-section').classList.add('hidden');
  });
  if (showExpenseBtn) showExpenseBtn.addEventListener('click', () => {
    document.getElementById('expense-section').classList.remove('hidden');
    document.getElementById('plan-section').classList.add('hidden');
  });

  // pre-fill today's date for expense form (use local time, not UTC)
  const dateInput = document.querySelector('input[name="date"]');
  if (dateInput) {
    const today = new Date();
    const localDateStr = today.getFullYear() + '-' + 
                         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(today.getDate()).padStart(2, '0');
    dateInput.value = localDateStr;
  }
  // pre-fill current month for plan form
  const monthInput = document.querySelector('input[name="month"]');
  if (monthInput) monthInput.value = new Date().toISOString().slice(0,7);
  getPlan();
  loadExpenses();
  loadPlansList();
  addHistoryHandlers();
  // ensure startup shows the current/latest plan view
  const planSection = document.getElementById('plan-section');
  const expenseSection = document.getElementById('expense-section');
  if (planSection) planSection.classList.remove('hidden');
  if (expenseSection) expenseSection.classList.add('hidden');
  
  // add event listeners for expense filters
  const filterStartDate = document.getElementById('filter-start-date');
  const filterEndDate = document.getElementById('filter-end-date');
  const filterCategory = document.getElementById('filter-category');
  const filterMinAmount = document.getElementById('filter-min-amount');
  const filterMaxAmount = document.getElementById('filter-max-amount');
  const clearFiltersBtn = document.getElementById('clear-filters');
  
  // pre-fill start and end dates with current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startDateStr = firstDay.toISOString().slice(0, 10);
  const endDateStr = lastDay.toISOString().slice(0, 10);
  if (filterStartDate) filterStartDate.value = startDateStr;
  if (filterEndDate) filterEndDate.value = endDateStr;
  
  [filterStartDate, filterEndDate, filterCategory, filterMinAmount, filterMaxAmount].forEach(input => {
    if (input) input.addEventListener('change', applyExpenseFilters);
    if (input) input.addEventListener('input', applyExpenseFilters);
  });
  
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (filterStartDate) filterStartDate.value = '';
      if (filterEndDate) filterEndDate.value = '';
      if (filterCategory) filterCategory.value = '';
      if (filterMinAmount) filterMinAmount.value = '';
      if (filterMaxAmount) filterMaxAmount.value = '';
      applyExpenseFilters();
    });
  }
});
