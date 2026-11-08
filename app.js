/**
 * Keuangan Offline v1.0
 * Aplikasi pencatatan keuangan 100% offline + autosave (localStorage)
 * Fitur: akun, kategori, transaksi, transfer, berulang, laporan, import/export + .mmbak
 */

const STORAGE_KEY = 'keuangan_offline_v1';

const DEFAULT_CATEGORIES = [
  { id: 'c1', name: 'Gaji', type: 'income', icon: '💰' },
  { id: 'c2', name: 'Bonus', type: 'income', icon: '🎁' },
  { id: 'c3', name: 'Investasi', type: 'income', icon: '📈' },
  { id: 'c4', name: 'Lainnya', type: 'income', icon: '➕' },
  { id: 'c5', name: 'Makanan', type: 'expense', icon: '🍔' },
  { id: 'c6', name: 'Transport', type: 'expense', icon: '🚗' },
  { id: 'c7', name: 'Belanja', type: 'expense', icon: '🛒' },
  { id: 'c8', name: 'Tagihan', type: 'expense', icon: '📄' },
  { id: 'c9', name: 'Hiburan', type: 'expense', icon: '🎮' },
  { id: 'c10', name: 'Kesehatan', type: 'expense', icon: '🏥' },
  { id: 'c11', name: 'Pendidikan', type: 'expense', icon: '📚' },
  { id: 'c12', name: 'Lainnya', type: 'expense', icon: '📦' },
];

const DEFAULT_ACCOUNTS = [
  { id: 'a1', name: 'Dompet Tunai', type: 'cash', balance: 0, color: '#14b8a6' },
  { id: 'a2', name: 'Rekening Bank', type: 'bank', balance: 0, color: '#60a5fa' },
];

let state = { accounts: [], categories: [], transactions: [], recurring: [], lastRecurringCheck: null };

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function formatRp(num) { return 'Rp ' + Math.round(num).toLocaleString('id-ID'); }
function today() { return new Date().toISOString().slice(0, 10); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function toast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      state.accounts = state.accounts || [];
      state.categories = state.categories || [];
      state.transactions = state.transactions || [];
      state.recurring = state.recurring || [];
    } catch (e) { initDefaults(); }
  } else { initDefaults(); }
}
function initDefaults() {
  state = {
    accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    transactions: [], recurring: [], lastRecurringCheck: null,
  };
  save();
}
function updateAccountBalance(accountId, delta) {
  const acc = state.accounts.find(a => a.id === accountId);
  if (acc) acc.balance = (acc.balance || 0) + delta;
}

function processRecurring() {
  const todayStr = today();
  let added = 0;
  state.recurring.forEach(rec => {
    if (!rec.active) return;
    let nextDate = rec.nextDate || rec.startDate;
    while (nextDate <= todayStr) {
      const tx = {
        id: uid(), type: rec.type, amount: rec.amount, accountId: rec.accountId,
        categoryId: rec.categoryId, date: nextDate,
        note: (rec.note || '') + ' (otomatis)', createdAt: new Date().toISOString(), fromRecurring: rec.id,
      };
      state.transactions.push(tx);
      if (rec.type === 'income') updateAccountBalance(rec.accountId, rec.amount);
      else updateAccountBalance(rec.accountId, -rec.amount);
      nextDate = advanceDate(nextDate, rec.freq);
      rec.nextDate = nextDate;
      added++;
    }
  });
  if (added > 0) { save(); toast(added + ' transaksi berulang ditambahkan otomatis'); }
  state.lastRecurringCheck = todayStr;
  save();
}
function advanceDate(dateStr, freq) {
  const d = new Date(dateStr + 'T12:00:00');
  if (freq === 'daily') d.setDate(d.getDate() + 1);
  else if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function render() {
  renderSummary(); renderTransactions(); renderAccounts(); renderCategories();
  renderReports(); renderRecurring(); fillAccountSelects(); fillCategorySelects();
}
function renderSummary() {
  const total = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);
  document.getElementById('total-balance').textContent = formatRp(total);
  const month = currentMonth();
  let income = 0, expense = 0;
  state.transactions.forEach(tx => {
    if (!tx.date.startsWith(month)) return;
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expense += tx.amount;
  });
  document.getElementById('month-income').textContent = formatRp(income);
  document.getElementById('month-expense').textContent = formatRp(expense);
}
function renderTransactions() {
  const list = document.getElementById('transaction-list');
  const filterAcc = document.getElementById('filter-account').value;
  const filterType = document.getElementById('filter-type').value;
  const filterMonth = document.getElementById('filter-month').value || currentMonth();
  let txs = [...state.transactions].filter(tx => {
    if (filterAcc !== 'all' && tx.accountId !== filterAcc && tx.toAccountId !== filterAcc) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterMonth && !tx.date.startsWith(filterMonth)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (txs.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="emoji">📭</div><p>Belum ada transaksi</p></div>';
    return;
  }
  list.innerHTML = txs.map(tx => {
    const cat = state.categories.find(c => c.id === tx.categoryId);
    const acc = state.accounts.find(a => a.id === tx.accountId);
    const icon = cat?.icon || (tx.type === 'transfer' ? '🔄' : '💵');
    const title = tx.type === 'transfer' ? 'Transfer → ' + (state.accounts.find(a => a.id === tx.toAccountId)?.name || '?') : (cat?.name || 'Tanpa kategori');
    const sign = tx.type === 'income' ? '+' : (tx.type === 'expense' ? '-' : '');
    return '<div class="list-item" data-id="' + tx.id + '">' +
      '<div class="icon" style="background:' + (tx.type === 'income' ? 'rgba(52,211,153,0.15)' : tx.type === 'expense' ? 'rgba(248,113,113,0.15)' : 'rgba(96,165,250,0.15)') + '">' + icon + '</div>' +
      '<div class="info"><div class="title">' + title + '</div><div class="meta">' + tx.date + ' · ' + (acc?.name || '?') + (tx.note ? ' · ' + tx.note : '') + '</div></div>' +
      '<div class="amount ' + tx.type + '">' + sign + formatRp(tx.amount) + '</div>' +
      '<div class="actions"><button class="btn-sm edit" onclick="editTransaction(\'' + tx.id + '\')">✏️</button>' +
      '<button class="btn-sm delete" onclick="deleteTransaction(\'' + tx.id + '\')">🗑️</button></div></div>';
  }).join('');
}
function renderAccounts() {
  const list = document.getElementById('account-list');
  if (state.accounts.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="emoji">🏦</div><p>Belum ada akun</p></div>';
    return;
  }
  list.innerHTML = state.accounts.map(acc =>
    '<div class="list-item"><div class="icon" style="background:' + acc.color + '22;color:' + acc.color + '">' +
    (acc.type === 'cash' ? '💵' : acc.type === 'bank' ? '🏦' : acc.type === 'ewallet' ? '📱' : '💼') +
    '</div><div class="info"><div class="title">' + acc.name + '</div><div class="meta">' + acc.type + '</div></div>' +
    '<div class="amount">' + formatRp(acc.balance || 0) + '</div>' +
    '<div class="actions"><button class="btn-sm edit" onclick="editAccount(\'' + acc.id + '\')">✏️</button>' +
    '<button class="btn-sm delete" onclick="deleteAccount(\'' + acc.id + '\')">🗑️</button></div></div>'
  ).join('');
}
function renderCategories() {
  const incomeList = document.getElementById('category-income-list');
  const expenseList = document.getElementById('category-expense-list');
  const renderCat = (cats) => {
    if (cats.length === 0) return '<div class="empty-state"><p>Kosong</p></div>';
    return cats.map(c =>
      '<div class="list-item"><div class="icon" style="background:#1a2332">' + (c.icon || '📁') + '</div>' +
      '<div class="info"><div class="title">' + c.name + '</div></div>' +
      '<div class="actions"><button class="btn-sm edit" onclick="editCategory(\'' + c.id + '\')">✏️</button>' +
      '<button class="btn-sm delete" onclick="deleteCategory(\'' + c.id + '\')">🗑️</button></div></div>'
    ).join('');
  };
  incomeList.innerHTML = renderCat(state.categories.filter(c => c.type === 'income'));
  expenseList.innerHTML = renderCat(state.categories.filter(c => c.type === 'expense'));
}
function renderReports() {
  const month = document.getElementById('report-month').value || currentMonth();
  document.getElementById('report-month').value = month;
  let income = 0, expense = 0;
  const expByCat = {}, incByCat = {};
  state.transactions.forEach(tx => {
    if (!tx.date.startsWith(month)) return;
    if (tx.type === 'income') {
      income += tx.amount;
      const name = state.categories.find(c => c.id === tx.categoryId)?.name || 'Lainnya';
      incByCat[name] = (incByCat[name] || 0) + tx.amount;
    } else if (tx.type === 'expense') {
      expense += tx.amount;
      const name = state.categories.find(c => c.id === tx.categoryId)?.name || 'Lainnya';
      expByCat[name] = (expByCat[name] || 0) + tx.amount;
    }
  });
  document.getElementById('report-summary').innerHTML =
    '<div class="breakdown-item"><span>Total Pemasukan</span><strong style="color:var(--income)">' + formatRp(income) + '</strong></div>' +
    '<div class="breakdown-item"><span>Total Pengeluaran</span><strong style="color:var(--expense)">' + formatRp(expense) + '</strong></div>' +
    '<div class="breakdown-item"><span>Selisih</span><strong>' + formatRp(income - expense) + '</strong></div>';
  const renderBars = (data, containerId, isIncome) => {
    const el = document.getElementById(containerId);
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Tidak ada data</p>'; return; }
    const max = Math.max(...entries.map(e => e[1]), 1);
    el.innerHTML = '<div class="bar-chart">' + entries.map(([name, val]) =>
      '<div class="bar-row"><div class="bar-label">' + name + '</div>' +
      '<div class="bar-track"><div class="bar-fill ' + (isIncome ? 'income' : '') + '" style="width:' + (val / max * 100).toFixed(1) + '%"></div></div>' +
      '<div class="bar-value">' + formatRp(val) + '</div></div>'
    ).join('') + '</div>';
  };
  renderBars(expByCat, 'expense-breakdown', false);
  renderBars(incByCat, 'income-breakdown', true);
  document.getElementById('chart-expense').style.display = 'none';
  document.getElementById('chart-income').style.display = 'none';
}
function renderRecurring() {
  const list = document.getElementById('recurring-list');
  if (state.recurring.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="emoji">🔁</div><p>Belum ada transaksi berulang</p></div>';
    return;
  }
  const freqMap = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' };
  list.innerHTML = state.recurring.map(rec => {
    const cat = state.categories.find(c => c.id === rec.categoryId);
    const acc = state.accounts.find(a => a.id === rec.accountId);
    return '<div class="list-item"><div class="icon" style="background:#1a2332">' + (cat?.icon || '🔁') + '</div>' +
      '<div class="info"><div class="title">' + (cat?.name || '?') + ' · ' + formatRp(rec.amount) + '</div>' +
      '<div class="meta">' + freqMap[rec.freq] + ' · ' + (acc?.name || '') + ' · Next: ' + (rec.nextDate || rec.startDate) + '</div></div>' +
      '<div class="actions"><button class="btn-sm delete" onclick="deleteRecurring(\'' + rec.id + '\')">🗑️</button></div></div>';
  }).join('');
}
function fillAccountSelects() {
  ['tx-account', 'tx-to-account', 'rec-account', 'filter-account'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const isFilter = id === 'filter-account';
    el.innerHTML = isFilter
      ? '<option value="all">Semua Akun</option>' + state.accounts.map(a => '<option value="' + a.id + '">' + a.name + '</option>').join('')
      : state.accounts.map(a => '<option value="' + a.id + '">' + a.name + '</option>').join('');
    if (current) el.value = current;
  });
}
function fillCategorySelects(type = null) {
  const txType = document.querySelector('.btn-type.active')?.dataset.type || 'expense';
  const effectiveType = type || (txType === 'transfer' ? 'expense' : txType);
  const fill = (selectId, t) => {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = state.categories.filter(c => c.type === t).map(c => '<option value="' + c.id + '">' + (c.icon || '') + ' ' + c.name + '</option>').join('');
  };
  fill('tx-category', effectiveType);
  fill('rec-category', document.getElementById('rec-type')?.value || 'expense');
}

function openTransactionModal(id = null) {
  const modal = document.getElementById('modal-transaction');
  document.getElementById('form-transaction').reset();
  document.getElementById('tx-id').value = '';
  document.getElementById('tx-date').value = today();
  document.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
  document.querySelector('.btn-type[data-type="expense"]').classList.add('active');
  document.getElementById('group-to-account').style.display = 'none';
  document.getElementById('group-category').style.display = 'block';
  if (id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    document.getElementById('modal-transaction-title').textContent = 'Edit Transaksi';
    document.getElementById('tx-id').value = tx.id;
    document.getElementById('tx-amount').value = tx.amount;
    document.getElementById('tx-account').value = tx.accountId;
    document.getElementById('tx-date').value = tx.date;
    document.getElementById('tx-note').value = tx.note || '';
    document.querySelectorAll('.btn-type').forEach(b => b.classList.toggle('active', b.dataset.type === tx.type));
    if (tx.type === 'transfer') {
      document.getElementById('group-to-account').style.display = 'block';
      document.getElementById('group-category').style.display = 'none';
      document.getElementById('tx-to-account').value = tx.toAccountId;
    } else {
      fillCategorySelects(tx.type);
      document.getElementById('tx-category').value = tx.categoryId;
    }
  } else {
    document.getElementById('modal-transaction-title').textContent = 'Tambah Transaksi';
    fillCategorySelects('expense');
  }
  fillAccountSelects();
  modal.classList.add('open');
}
function editTransaction(id) { openTransactionModal(id); }
function deleteTransaction(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  if (tx.type === 'income') updateAccountBalance(tx.accountId, -tx.amount);
  else if (tx.type === 'expense') updateAccountBalance(tx.accountId, tx.amount);
  else if (tx.type === 'transfer') {
    updateAccountBalance(tx.accountId, tx.amount);
    updateAccountBalance(tx.toAccountId, -tx.amount);
  }
  state.transactions = state.transactions.filter(t => t.id !== id);
  save(); render(); toast('Transaksi dihapus');
}
function openAccountModal(id = null) {
  const modal = document.getElementById('modal-account');
  document.getElementById('form-account').reset();
  document.getElementById('acc-id').value = '';
  document.getElementById('acc-balance').value = 0;
  document.getElementById('acc-color').value = '#14b8a6';
  if (id) {
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('modal-account-title').textContent = 'Edit Akun';
    document.getElementById('acc-id').value = acc.id;
    document.getElementById('acc-name').value = acc.name;
    document.getElementById('acc-balance').value = acc.balance;
    document.getElementById('acc-type').value = acc.type;
    document.getElementById('acc-color').value = acc.color || '#14b8a6';
  } else document.getElementById('modal-account-title').textContent = 'Tambah Akun';
  modal.classList.add('open');
}
function editAccount(id) { openAccountModal(id); }
function deleteAccount(id) {
  if (state.accounts.length <= 1) { toast('Minimal harus ada 1 akun'); return; }
  if (!confirm('Hapus akun ini?')) return;
  state.accounts = state.accounts.filter(a => a.id !== id);
  save(); render(); toast('Akun dihapus');
}
function openCategoryModal(id = null) {
  const modal = document.getElementById('modal-category');
  document.getElementById('form-category').reset();
  document.getElementById('cat-id').value = '';
  document.getElementById('cat-icon').value = '';
  if (id) {
    const cat = state.categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('modal-category-title').textContent = 'Edit Kategori';
    document.getElementById('cat-id').value = cat.id;
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-type').value = cat.type;
    document.getElementById('cat-icon').value = cat.icon || '';
  } else document.getElementById('modal-category-title').textContent = 'Tambah Kategori';
  modal.classList.add('open');
}
function editCategory(id) { openCategoryModal(id); }
function deleteCategory(id) {
  if (!confirm('Hapus kategori ini?')) return;
  state.categories = state.categories.filter(c => c.id !== id);
  save(); render(); toast('Kategori dihapus');
}
function openRecurringModal() {
  const modal = document.getElementById('modal-recurring');
  document.getElementById('form-recurring').reset();
  document.getElementById('rec-id').value = '';
  document.getElementById('rec-start').value = today();
  fillAccountSelects(); fillCategorySelects('expense');
  modal.classList.add('open');
}
function deleteRecurring(id) {
  if (!confirm('Hapus transaksi berulang ini?')) return;
  state.recurring = state.recurring.filter(r => r.id !== id);
  save(); render(); toast('Dihapus');
}

document.addEventListener('DOMContentLoaded', () => {
  load(); processRecurring();
  document.getElementById('filter-month').value = currentMonth();
  document.getElementById('report-month').value = currentMonth();
  render();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'reports') renderReports();
    });
  });
  document.querySelectorAll('.btn-type').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      if (type === 'transfer') {
        document.getElementById('group-to-account').style.display = 'block';
        document.getElementById('group-category').style.display = 'none';
      } else {
        document.getElementById('group-to-account').style.display = 'none';
        document.getElementById('group-category').style.display = 'block';
        fillCategorySelects(type);
      }
    });
  });
  ['filter-account', 'filter-type', 'filter-month'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderTransactions);
  });
  document.getElementById('report-month').addEventListener('change', renderReports);
  document.getElementById('btn-add-transaction').addEventListener('click', () => openTransactionModal());
  document.getElementById('fab-add').addEventListener('click', () => openTransactionModal());
  document.getElementById('btn-add-account').addEventListener('click', () => openAccountModal());
  document.getElementById('btn-add-category').addEventListener('click', () => openCategoryModal());
  document.getElementById('btn-add-recurring').addEventListener('click', () => openRecurringModal());
  document.getElementById('btn-settings').addEventListener('click', () => document.getElementById('modal-settings').classList.add('open'));
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal').classList.remove('open')));
  document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); }));

  document.getElementById('form-transaction').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('tx-id').value;
    const type = document.querySelector('.btn-type.active').dataset.type;
    const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
    const accountId = document.getElementById('tx-account').value;
    const toAccountId = document.getElementById('tx-to-account').value;
    const categoryId = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('tx-note').value.trim();
    if (amount <= 0) { toast('Jumlah harus lebih dari 0'); return; }
    if (type === 'transfer' && accountId === toAccountId) { toast('Akun tujuan harus berbeda'); return; }
    if (id) {
      const old = state.transactions.find(t => t.id === id);
      if (old) {
        if (old.type === 'income') updateAccountBalance(old.accountId, -old.amount);
        else if (old.type === 'expense') updateAccountBalance(old.accountId, old.amount);
        else if (old.type === 'transfer') { updateAccountBalance(old.accountId, old.amount); updateAccountBalance(old.toAccountId, -old.amount); }
        old.type = type; old.amount = amount; old.accountId = accountId;
        old.toAccountId = type === 'transfer' ? toAccountId : null;
        old.categoryId = type === 'transfer' ? null : categoryId;
        old.date = date; old.note = note;
        if (type === 'income') updateAccountBalance(accountId, amount);
        else if (type === 'expense') updateAccountBalance(accountId, -amount);
        else if (type === 'transfer') { updateAccountBalance(accountId, -amount); updateAccountBalance(toAccountId, amount); }
      }
    } else {
      const tx = { id: uid(), type, amount, accountId, toAccountId: type === 'transfer' ? toAccountId : null, categoryId: type === 'transfer' ? null : categoryId, date, note, createdAt: new Date().toISOString() };
      state.transactions.push(tx);
      if (type === 'income') updateAccountBalance(accountId, amount);
      else if (type === 'expense') updateAccountBalance(accountId, -amount);
      else if (type === 'transfer') { updateAccountBalance(accountId, -amount); updateAccountBalance(toAccountId, amount); }
    }
    save(); render();
    document.getElementById('modal-transaction').classList.remove('open');
    toast(id ? 'Transaksi diperbarui' : 'Transaksi ditambahkan');
  });

  document.getElementById('form-account').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('acc-id').value;
    const name = document.getElementById('acc-name').value.trim();
    const balance = parseFloat(document.getElementById('acc-balance').value) || 0;
    const type = document.getElementById('acc-type').value;
    const color = document.getElementById('acc-color').value;
    if (id) {
      const acc = state.accounts.find(a => a.id === id);
      if (acc) { acc.name = name; acc.balance = balance; acc.type = type; acc.color = color; }
    } else state.accounts.push({ id: uid(), name, balance, type, color });
    save(); render();
    document.getElementById('modal-account').classList.remove('open');
    toast(id ? 'Akun diperbarui' : 'Akun ditambahkan');
  });

  document.getElementById('form-category').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value.trim();
    const type = document.getElementById('cat-type').value;
    const icon = document.getElementById('cat-icon').value.trim() || '📁';
    if (id) {
      const cat = state.categories.find(c => c.id === id);
      if (cat) { cat.name = name; cat.type = type; cat.icon = icon; }
    } else state.categories.push({ id: uid(), name, type, icon });
    save(); render();
    document.getElementById('modal-category').classList.remove('open');
    toast(id ? 'Kategori diperbarui' : 'Kategori ditambahkan');
  });

  document.getElementById('form-recurring').addEventListener('submit', e => {
    e.preventDefault();
    const type = document.getElementById('rec-type').value;
    const amount = parseFloat(document.getElementById('rec-amount').value) || 0;
    const accountId = document.getElementById('rec-account').value;
    const categoryId = document.getElementById('rec-category').value;
    const freq = document.getElementById('rec-freq').value;
    const startDate = document.getElementById('rec-start').value;
    const note = document.getElementById('rec-note').value.trim();
    if (amount <= 0) { toast('Jumlah harus lebih dari 0'); return; }
    state.recurring.push({ id: uid(), type, amount, accountId, categoryId, freq, startDate, nextDate: startDate, note, active: true });
    save(); processRecurring(); render();
    document.getElementById('modal-recurring').classList.remove('open');
    toast('Transaksi berulang ditambahkan');
  });

  document.getElementById('rec-type').addEventListener('change', e => fillCategorySelects(e.target.value));

  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'keuangan-backup-' + today() + '.json'; a.click();
    URL.revokeObjectURL(url); toast('Backup diunduh');
  });
  document.getElementById('btn-backup').addEventListener('click', () => document.getElementById('btn-export').click());
  document.getElementById('btn-restore').addEventListener('click', () => document.getElementById('file-restore').click());
  document.getElementById('file-restore').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.accounts || !data.transactions) throw new Error('Format tidak valid');
        if (!confirm('Data saat ini akan diganti. Lanjutkan?')) return;
        state = data; save(); render();
        toast('Data berhasil di-restore');
        document.getElementById('modal-settings').classList.remove('open');
      } catch (err) { toast('Gagal restore: file tidak valid'); }
    };
    reader.readAsText(file); e.target.value = '';
  });

  document.getElementById('btn-import-csv').addEventListener('click', () => document.getElementById('file-csv').click());
  document.getElementById('file-csv').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const lines = ev.target.result.trim().split('\n');
        let count = 0;
        const start = lines[0].toLowerCase().includes('tanggal') || lines[0].toLowerCase().includes('date') ? 1 : 0;
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 4) continue;
          const [date, typeRaw, amountStr, accName, catName, note] = cols;
          const type = typeRaw.toLowerCase().includes('in') || typeRaw.toLowerCase().includes('masuk') ? 'income' : 'expense';
          const amount = parseFloat(amountStr.replace(/[^\d.-]/g, '')) || 0;
          if (amount <= 0 || !date) continue;
          let account = state.accounts.find(a => a.name.toLowerCase() === (accName || '').toLowerCase());
          if (!account) { account = { id: uid(), name: accName || 'Import', type: 'other', balance: 0, color: '#64748b' }; state.accounts.push(account); }
          let category = state.categories.find(c => c.name.toLowerCase() === (catName || '').toLowerCase() && c.type === type);
          if (!category) { category = { id: uid(), name: catName || 'Import', type, icon: '📥' }; state.categories.push(category); }
          state.transactions.push({ id: uid(), type, amount, accountId: account.id, categoryId: category.id, date: date.slice(0, 10), note: note || 'Import CSV', createdAt: new Date().toISOString() });
          if (type === 'income') updateAccountBalance(account.id, amount); else updateAccountBalance(account.id, -amount);
          count++;
        }
        save(); render(); toast(count + ' transaksi diimpor');
        document.getElementById('modal-settings').classList.remove('open');
      } catch (err) { console.error(err); toast('Gagal import CSV'); }
    };
    reader.readAsText(file); e.target.value = '';
  });

  // Money Manager .mmbak import
  document.getElementById('btn-import-mmbak').addEventListener('click', () => document.getElementById('file-mmbak').click());
  document.getElementById('file-mmbak').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    toast('Memproses file Money Manager...');
    try {
      const buffer = await file.arrayBuffer();
      let bytes = new Uint8Array(buffer);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
      if (isZip) {
        const header = [0x53,0x51,0x4c,0x69,0x74,0x65,0x20,0x66,0x6f,0x72,0x6d,0x61,0x74,0x20,0x33];
        let found = -1;
        for (let i = 0; i < bytes.length - 100; i++) {
          let match = true;
          for (let j = 0; j < header.length; j++) if (bytes[i+j] !== header[j]) { match = false; break; }
          if (match) { found = i; break; }
        }
        if (found >= 0) { bytes = bytes.slice(found); toast('Ditemukan database SQLite di dalam ZIP...'); }
        else throw new Error('File ZIP tidak berisi database SQLite yang dikenali');
      }
      const sqliteHeader = 'SQLite format 3';
      let isSqlite = true;
      for (let i = 0; i < sqliteHeader.length; i++) if (bytes[i] !== sqliteHeader.charCodeAt(i)) { isSqlite = false; break; }
      if (!isSqlite) throw new Error('Bukan file SQLite / .mmbak yang valid');

      if (!window.SQL) {
        toast('Memuat engine SQLite (sekali saja)...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Gagal memuat sql.js. Perlu internet untuk import pertama kali.'));
          document.head.appendChild(script);
        });
        const SQL = await initSqlJs({ locateFile: f => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/' + f });
        window.SQL = SQL;
      }

      const db = new window.SQL.Database(bytes);
      const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = tablesResult[0] ? tablesResult[0].values.map(r => r[0]) : [];
      const accountTable = tables.find(t => /^(ASSET|ACCOUNTS|account)$/i.test(t)) || null;
      const categoryTable = tables.find(t => /^(CATEGORY|CATEGORIES|category)$/i.test(t)) || null;
      const txTable = tables.find(t => /^(INOUTCOME|TRANSACTIONS|TRANSACTION|INCOME_EXPENSE|CHECKINGS)$/i.test(t)) || null;
      if (!txTable) throw new Error('Tabel transaksi tidak ditemukan. Tabel: ' + tables.join(', '));

      function queryToObjects(sql) {
        const res = db.exec(sql);
        if (!res.length) return [];
        const cols = res[0].columns;
        return res[0].values.map(row => { const obj = {}; cols.forEach((c,i) => obj[c] = row[i]); return obj; });
      }

      const accMap = {};
      if (accountTable) {
        queryToObjects('SELECT * FROM ' + accountTable).forEach(a => {
          if (a.IS_DEL == 1 || a.C_IS_DEL == 1) return;
          const name = a.NIC_NAME || a.NAME || a.ASSETNAME || a.ACCOUNTNAME || a.name || 'Akun';
          const oldId = a._id || a.ID || a.ASSETID || a.id;
          const existing = state.accounts.find(x => x.name.toLowerCase() === String(name).toLowerCase());
          if (existing) accMap[oldId] = existing.id;
          else {
            const newId = uid();
            accMap[oldId] = newId;
            state.accounts.push({ id: newId, name: String(name), type: 'other', balance: 0, color: '#14b8a6' });
          }
        });
      }
      if (state.accounts.length === 0) state.accounts.push({ id: uid(), name: 'Import MM', type: 'other', balance: 0, color: '#14b8a6' });
      const defaultAccId = state.accounts[0].id;

      const catMap = {};
      if (categoryTable) {
        queryToObjects('SELECT * FROM ' + categoryTable).forEach(c => {
          if (c.IS_DEL == 1 || c.C_IS_DEL == 1) return;
          const name = c.NAME || c.CATEGORYNAME || c.name || 'Kategori';
          let type = 'expense';
          const t = c.TYPE || c.INOUT_TYPE || c.CATE_TYPE;
          if (t == 1 || t === 'income' || String(t).toLowerCase().includes('in')) type = 'income';
          const oldId = c._id || c.ID || c.CATEGORYID || c.id;
          const existing = state.categories.find(x => x.name.toLowerCase() === String(name).toLowerCase() && x.type === type);
          if (existing) catMap[oldId] = existing.id;
          else {
            const newId = uid();
            catMap[oldId] = newId;
            state.categories.push({ id: newId, name: String(name), type, icon: type === 'income' ? '💰' : '📦' });
          }
        });
      }

      let count = 0;
      queryToObjects('SELECT * FROM ' + txTable + ' LIMIT 50000').forEach(t => {
        if (t.IS_DEL == 1 || t.C_IS_DEL == 1) return;
        let amount = Math.abs(parseFloat(t.AMOUNT || t.ZAMOUNT || t.TRANSAMOUNT || 0) || 0);
        if (amount <= 0) return;
        let type = 'expense';
        const tType = t.TYPE || t.INOUT_TYPE || t.TRANSCODE || t.TRANSACTIONTYPE;
        if (tType == 1 || tType === 'income' || String(tType).toLowerCase().includes('in')) type = 'income';
        else if (tType == 2 || tType == 7 || String(tType).toLowerCase().includes('transfer')) type = 'transfer';
        let dateStr = '';
        const dateVal = t.DATE || t.ZDATE || t.TRANSDATE || t.TIME || t.WDATE;
        if (dateVal != null) {
          if (typeof dateVal === 'number') {
            const d = dateVal > 1e12 ? new Date(dateVal) : (dateVal > 1e9 ? new Date(dateVal * 1000) : new Date((dateVal - 25569) * 86400 * 1000));
            if (!isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
          } else dateStr = String(dateVal).slice(0, 10);
        }
        if (!dateStr || dateStr.length < 8) dateStr = today();
        const oldAccId = t.ASSETID || t.ACCOUNTID || t.FROM_ACCOUNT || t.ZACCOUNT || t.account_id;
        let accountId = accMap[oldAccId] || defaultAccId;
        const oldCatId = t.CATEGORYID || t.ZCATEGORY || t.CATEGORY || t.category_id;
        let categoryId = catMap[oldCatId];
        if (!categoryId) {
          let cat = state.categories.find(c => c.type === (type === 'transfer' ? 'expense' : type));
          if (!cat) { cat = { id: uid(), name: 'Import MM', type: type === 'transfer' ? 'expense' : type, icon: '📥' }; state.categories.push(cat); }
          categoryId = cat.id;
        }
        const note = t.CONTENT || t.NOTE || t.MEMO || t.DESCRIPTION || t.ZCONTENT || '';
        state.transactions.push({
          id: uid(), type: type === 'transfer' ? 'expense' : type, amount, accountId, categoryId,
          date: dateStr, note: (note ? String(note) + ' ' : '') + '(import MM)', createdAt: new Date().toISOString()
        });
        if (type === 'income') updateAccountBalance(accountId, amount); else updateAccountBalance(accountId, -amount);
        count++;
      });

      db.close(); save(); render();
      toast('Berhasil import ' + count + ' transaksi dari Money Manager');
      document.getElementById('modal-settings').classList.remove('open');
    } catch (err) {
      console.error(err);
      toast('Gagal import .mmbak: ' + (err.message || 'format tidak dikenali'));
    }
    e.target.value = '';
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('HAPUS SEMUA DATA? Tindakan ini tidak bisa dibatalkan.')) return;
    if (!confirm('Yakin sekali lagi? Semua transaksi, akun, dan kategori akan hilang.')) return;
    localStorage.removeItem(STORAGE_KEY);
    initDefaults(); render();
    document.getElementById('modal-settings').classList.remove('open');
    toast('Data direset');
  });
});

window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.deleteRecurring = deleteRecurring;
