// ============================================
// Order Portal - Main Application Logic
// ============================================

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let tickets = [];
let currentFilter = 'all';
let authMode = 'signin';
const trackingDebounce = {};
const notesDebounce = {};

// Toggle visibility of SolidWorks tier picker when SolidWorks checkbox changes
function toggleSolidWorksTier(checkbox) {
  const tierBox = document.getElementById('solidworks-tier');
  if (checkbox.checked) {
    tierBox.style.display = 'block';
  } else {
    tierBox.style.display = 'none';
    // Uncheck any selected tier
    document.querySelectorAll('.sw-tier-radio').forEach(r => r.checked = false);
  }
}

// ============================================
// THEME (light / dark mode)
// ============================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('orders-theme', theme); } catch (e) {}
  const label = theme === 'dark' ? 'Light' : 'Dark';
  const elAppLabel = document.getElementById('theme-label-app');
  const elLoginLabel = document.getElementById('theme-label-login');
  if (elAppLabel) elAppLabel.textContent = label;
  if (elLoginLabel) elLoginLabel.textContent = label;
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

(function initTheme() {
  let saved = 'light';
  try { saved = localStorage.getItem('orders-theme') || 'light'; } catch (e) {}
  applyTheme(saved);
})();

// ============================================
// CARRIER DETECTION (no API needed)
// ============================================
// Detects carrier from tracking number format and builds a tracking URL.
// Used by the "Track" button on each item — opens the carrier's official tracking page.

function detectCarrier(tn) {
  if (!tn) return null;
  const clean = tn.replace(/\s/g, '').toUpperCase();

  // UPS: 1Z + 16 chars
  if (/^1Z[0-9A-Z]{16}$/.test(clean)) return 'UPS';

  // FedEx: 12, 15, or 20 digits (most common formats)
  if (/^\d{12}$/.test(clean) || /^\d{15}$/.test(clean) || /^\d{20}$/.test(clean)) return 'FedEx';

  // USPS: 20-22 digits or specific letter prefixes
  if (/^(94|93|92|94|95)\d{20}$/.test(clean)) return 'USPS';
  if (/^\d{26}$/.test(clean)) return 'USPS';
  if (/^[A-Z]{2}\d{9}US$/.test(clean)) return 'USPS';
  if (/^420\d{27,31}$/.test(clean)) return 'USPS';

  // DHL: 10-11 digit, or specific patterns
  if (/^\d{10,11}$/.test(clean)) return 'DHL';
  if (/^[A-Z]{3}\d{7}$/.test(clean)) return 'DHL';

  // OnTrac: starts with C, 15 digits
  if (/^C\d{14}$/.test(clean)) return 'OnTrac';

  return null;
}

function trackingUrl(tn, carrier) {
  if (!tn) return null;
  const clean = encodeURIComponent(tn.trim());
  const c = carrier || detectCarrier(tn);
  switch (c) {
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${clean}`;
    case 'FedEx':
      return `https://www.fedex.com/fedextrack/?trknbr=${clean}`;
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${clean}`;
    case 'DHL':
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${clean}`;
    case 'OnTrac':
      return `https://www.ontrac.com/tracking?number=${clean}`;
    default:
      // Generic Google search fallback
      return `https://www.google.com/search?q=track+package+${clean}`;
  }
}

// ============================================
// AUTH
// ============================================

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    showLogin();
  }
}

function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  if (authMode === 'signup') {
    document.getElementById('auth-submit').textContent = 'Create account';
    document.getElementById('toggle-text').textContent = 'Already have an account?';
    document.getElementById('toggle-link').textContent = 'Sign in';
  } else {
    document.getElementById('auth-submit').textContent = 'Sign in';
    document.getElementById('toggle-text').textContent = 'New to the team?';
    document.getElementById('toggle-link').textContent = 'Create account';
  }
  hideMessages();
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('auth-success').style.display = 'none';
}

function showSuccess(msg) {
  const el = document.getElementById('auth-success');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('auth-error').style.display = 'none';
}

function hideMessages() {
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-success').style.display = 'none';
}

async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) { showError('Please enter both email and password.'); return; }
  if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }

  const btn = document.getElementById('auth-submit');
  btn.disabled = true;
  btn.textContent = authMode === 'signin' ? 'Signing in...' : 'Creating account...';

  try {
    if (authMode === 'signup') {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user && !data.session) {
        showSuccess('Account created! Check your email to confirm, then sign in.');
        authMode = 'signin';
        toggleAuthMode();
        toggleAuthMode();
      } else {
        currentUser = data.user;
        showApp();
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      showApp();
    }
  } catch (err) {
    showError(err.message || 'Something went wrong. Try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'signin' ? 'Sign in' : 'Create account';
  }
}

async function signInWithMicrosoft() {
  hideMessages();
  try {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email openid profile',
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (err) {
    showError('Microsoft sign-in failed: ' + (err.message || 'Unknown error'));
  }
}

async function signOut() {
  await db.auth.signOut();
  currentUser = null;
  tickets = [];
  showLogin();
}

function showLogin() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
}

async function showApp() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';
  const displayEmail = currentUser.email || currentUser.user_metadata?.email || 'Signed in';
  document.getElementById('user-email').textContent = displayEmail;
  await loadTickets();
}

// ============================================
// TICKETS
// ============================================

async function loadTickets() {
  const { data, error } = await db
    .from('tickets')
    .select('*, items(*)')
    .order('created_at', { ascending: false });

  if (error) { console.error('Failed to load tickets:', error); return; }
  tickets = data || [];
  renderBoard();
}

async function submitRequest() {
  const ticketNum = document.getElementById('f-ticket').value.trim();
  const link = document.getElementById('f-link').value.trim();
  const approved = document.getElementById('f-approved').checked;
  const itemsChecked = Array.from(document.querySelectorAll('.item-cb:checked')).map(cb => cb.value);

  if (!ticketNum) { alert('Please enter a ticket number.'); return; }
  if (itemsChecked.length === 0) { alert('Please select at least one item.'); return; }

  // Validate SolidWorks tier if SolidWorks is selected
  let solidWorksTier = null;
  if (itemsChecked.includes('SolidWorks')) {
    const selectedTier = document.querySelector('.sw-tier-radio:checked');
    if (!selectedTier) {
      alert('Please select a SolidWorks tier (Standard or Premium).');
      return;
    }
    solidWorksTier = selectedTier.value;
  }

  const { data: ticket, error: ticketError } = await db
    .from('tickets')
    .insert({
      ticket_number: ticketNum,
      autotask_link: link || null,
      approved: approved,
      created_by: currentUser.id
    })
    .select()
    .single();

  if (ticketError) { alert('Could not create ticket: ' + ticketError.message); return; }

  // Build items, applying tier to SolidWorks name
  const items = itemsChecked.map(name => {
    const finalName = (name === 'SolidWorks' && solidWorksTier)
      ? `SolidWorks (${solidWorksTier})`
      : name;
    return {
      ticket_id: ticket.id,
      name: finalName,
      acquired: false,
      tracking_number: null
    };
  });

  const { error: itemsError } = await db.from('items').insert(items);
  if (itemsError) { alert('Could not add items: ' + itemsError.message); return; }

  // Reset form
  document.getElementById('f-ticket').value = '';
  document.getElementById('f-link').value = '';
  document.getElementById('f-approved').checked = false;
  document.querySelectorAll('.item-cb').forEach(cb => cb.checked = false);
  document.querySelectorAll('.sw-tier-radio').forEach(r => r.checked = false);
  document.getElementById('solidworks-tier').style.display = 'none';

  await loadTickets();
  switchTab('board');
}

async function toggleApproval(ticketId) {
  const t = tickets.find(x => x.id === ticketId);
  const newVal = !t.approved;
  t.approved = newVal;
  renderBoard();
  await db.from('tickets').update({ approved: newVal }).eq('id', ticketId);
}

async function toggleAcquired(itemId) {
  let item;
  for (const t of tickets) {
    item = t.items.find(i => i.id === itemId);
    if (item) break;
  }
  if (!item) return;
  const newVal = !item.acquired;
  item.acquired = newVal;
  renderBoard();
  await db.from('items').update({ acquired: newVal }).eq('id', itemId);
}

async function updateTracking(itemId, value) {
  for (const t of tickets) {
    const item = t.items.find(i => i.id === itemId);
    if (item) { item.tracking_number = value; break; }
  }
  clearTimeout(trackingDebounce[itemId]);
  trackingDebounce[itemId] = setTimeout(async () => {
    await db.from('items').update({ tracking_number: value }).eq('id', itemId);
    renderBoard(); // re-render so the "Track" button updates
  }, 500);
}

async function editLink(ticketId) {
  const t = tickets.find(x => x.id === ticketId);
  const newLink = prompt('Autotask ticket URL:', t.autotask_link || '');
  if (newLink === null) return;
  t.autotask_link = newLink.trim() || null;
  renderBoard();
  await db.from('tickets').update({ autotask_link: t.autotask_link }).eq('id', ticketId);
}

async function addItemToTicket(ticketId) {
  const t = tickets.find(x => x.id === ticketId);
  const standardItems = ['Laptop', 'Tech Package', 'SolidWorks', 'AutoCAD', 'Civil3D', 'Bluebeam'];

  const input = prompt(
    'What item to add?\n\n' +
    'Common items: ' + standardItems.join(', ') + '\n' +
    '(Or type anything custom, e.g. "Laptop Charger", "Mouse", "Docking Station")'
  );

  if (!input) return;
  let finalName = input.trim();
  if (!finalName) return;

  // Prevent obvious duplicates (case-insensitive, ignores tier suffix)
  const existingBase = t.items.map(i => i.name.toLowerCase().trim());
  if (existingBase.includes(finalName.toLowerCase())) {
    alert('"' + finalName + '" is already on this ticket.');
    return;
  }

  // Special case: SolidWorks needs a tier
  if (finalName.toLowerCase() === 'solidworks') {
    const tier = prompt('SolidWorks tier — type "Standard" or "Premium":');
    if (!tier) return;
    const cleanTier = tier.trim();
    if (!['Standard', 'Premium'].includes(cleanTier)) {
      alert('Invalid tier — must be Standard or Premium.');
      return;
    }
    finalName = `SolidWorks (${cleanTier})`;
  }

  const { data, error } = await db
    .from('items')
    .insert({ ticket_id: ticketId, name: finalName, acquired: false })
    .select()
    .single();
  if (error) { alert(error.message); return; }
  t.items.push(data);
  renderBoard();
}

// Notes auto-save with debounce
async function updateNotes(ticketId, value) {
  const t = tickets.find(x => x.id === ticketId);
  if (t) t.notes = value;
  clearTimeout(notesDebounce[ticketId]);
  notesDebounce[ticketId] = setTimeout(async () => {
    const { error } = await db.from('tickets').update({ notes: value }).eq('id', ticketId);
    if (error) {
      console.error('Failed to save notes:', error);
      alert('Notes failed to save: ' + error.message + '\n\nMake sure you ran database-notes-update.sql in Supabase.');
    }
  }, 500);
}

function toggleNotes(ticketId) {
  const el = document.getElementById('notes-body-' + ticketId);
  const icon = document.getElementById('notes-icon-' + ticketId);
  if (el.style.display === 'none' || !el.style.display) {
    el.style.display = 'block';
    if (icon) icon.classList.add('open');
  } else {
    el.style.display = 'none';
    if (icon) icon.classList.remove('open');
  }
}

async function removeItem(itemId) {
  if (!confirm('Remove this item?')) return;
  await db.from('items').delete().eq('id', itemId);
  for (const t of tickets) { t.items = t.items.filter(i => i.id !== itemId); }
  for (const t of tickets) {
    if (t.items.length === 0) {
      if (confirm('Ticket ' + t.ticket_number + ' has no items left. Delete the ticket?')) {
        await deleteTicket(t.id, true);
        return;
      }
    }
  }
  renderBoard();
}

async function deleteTicket(ticketId, skipConfirm) {
  if (!skipConfirm && !confirm('Delete this entire ticket?')) return;
  await db.from('items').delete().eq('ticket_id', ticketId);
  await db.from('tickets').delete().eq('id', ticketId);
  tickets = tickets.filter(t => t.id !== ticketId);
  renderBoard();
}

// ============================================
// RENDERING
// ============================================

function switchTab(tab) {
  document.getElementById('tab-form').classList.toggle('active', tab === 'form');
  document.getElementById('tab-board').classList.toggle('active', tab === 'board');
  document.getElementById('form-panel').classList.toggle('active', tab === 'form');
  document.getElementById('board-panel').classList.toggle('active', tab === 'board');
}

function setFilter(filter, evt) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (evt) evt.target.classList.add('active');
  renderBoard();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function ticketStatus(t) {
  const total = (t.items || []).length;
  const done = (t.items || []).filter(i => i.acquired).length;
  if (total > 0 && done === total) return 'complete';
  return 'progress';
}

function renderBoard() {
  const tilesEl = document.getElementById('tiles');
  const emptyEl = document.getElementById('empty-state');
  const searchTerm = document.getElementById('search').value.toLowerCase().trim();

  const filtered = tickets.filter(t => {
    if (searchTerm && !t.ticket_number.toLowerCase().includes(searchTerm)) return false;
    if (currentFilter === 'pending' && t.approved) return false;
    if (currentFilter === 'progress' && (!t.approved || ticketStatus(t) === 'complete')) return false;
    if (currentFilter === 'complete' && ticketStatus(t) !== 'complete') return false;
    return true;
  });

  document.getElementById('tile-count').textContent = tickets.length;

  if (filtered.length === 0) {
    emptyEl.style.display = 'block';
    emptyEl.querySelector('p').textContent = tickets.length === 0
      ? 'No requests yet. Submit one from the New request tab.'
      : 'No requests match your filters.';
    tilesEl.innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';

  tilesEl.innerHTML = filtered.map(t => {
    const total = t.items.length;
    const done = t.items.filter(i => i.acquired).length;
    const isComplete = total > 0 && done === total;
    const statusClass = isComplete ? 'complete' : 'progress';
    const statusLabel = isComplete ? 'Complete' : (done + '/' + total);
    const created = new Date(t.created_at).toLocaleDateString();

    const linkRow = t.autotask_link
      ? `<a href="${escapeHtml(t.autotask_link)}" target="_blank" rel="noopener" class="tile-link">↗ Open in Autotask</a>`
      : `<span class="tile-link" style="color: var(--text-faint);">No link</span>`;

    const approvalClass = t.approved ? 'approved' : 'pending';
    const approvalLabel = t.approved ? '✓ Approved' : '⏱ Awaiting approval';

    const sortedItems = [...t.items].sort((a, b) => {
      // Physical (trackable) items first, software items last
      const softwareItems = ['solidworks', 'autocad', 'civil3d', 'bluebeam'];
      const aSoftware = softwareItems.some(sw => a.name.toLowerCase().startsWith(sw));
      const bSoftware = softwareItems.some(sw => b.name.toLowerCase().startsWith(sw));
      if (!aSoftware && bSoftware) return -1;
      if (aSoftware && !bSoftware) return 1;
      return 0;
    });

    const notesValue = t.notes || '';
    const hasNotes = notesValue.trim().length > 0;

    return `
      <div class="tile">
        <div class="tile-header">
          <div style="flex:1; min-width:0;">
            <div class="tile-title">${escapeHtml(t.ticket_number)}</div>
            <div style="display:flex; align-items:center; gap:8px;">
              ${linkRow}
              <button class="btn-text" style="padding:0; font-size:11px;" onclick="editLink('${t.id}')">edit</button>
            </div>
            <div class="tile-meta">Created ${created}</div>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>

        <div class="approval-banner ${approvalClass}" onclick="toggleApproval('${t.id}')">
          <input type="checkbox" ${t.approved ? 'checked' : ''} onclick="event.stopPropagation(); toggleApproval('${t.id}')">
          <span>${approvalLabel}</span>
        </div>

        ${sortedItems.map(item => {
          // Software items don't get a tracking field — everything else (physical/shipped) does
          const softwareItems = ['solidworks', 'autocad', 'civil3d', 'bluebeam'];
          const itemLower = item.name.toLowerCase();
          const isSoftware = softwareItems.some(sw => itemLower.startsWith(sw));
          const hasTracking = !isSoftware;
          const tn = item.tracking_number;
          const detectedCarrier = tn ? detectCarrier(tn) : null;
          const url = tn ? trackingUrl(tn, detectedCarrier) : null;

          return `
            <div class="item-row">
              <div class="item-row-main">
                <span class="item-name ${item.acquired ? 'done' : ''}">${escapeHtml(item.name)}</span>
                <label><input type="checkbox" ${item.acquired ? 'checked' : ''} onchange="toggleAcquired('${item.id}')"> Acquired</label>
                <button class="btn-text" style="padding:2px 4px; font-size:14px;" onclick="removeItem('${item.id}')" aria-label="Remove">×</button>
              </div>
              ${hasTracking && item.acquired ? `
                <div class="tracking-row">
                  <span style="font-size:11px; color:var(--text-muted);">📦</span>
                  <input type="text" placeholder="Tracking number" value="${escapeHtml(tn || '')}" oninput="updateTracking('${item.id}', this.value)">
                  ${tn ? `
                    <a href="${url}" target="_blank" rel="noopener" class="track-btn" title="Open carrier tracking page">
                      ↗ Track${detectedCarrier ? ' on ' + detectedCarrier : ''}
                    </a>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}

        <div class="notes-section">
          <div class="notes-header" onclick="toggleNotes('${t.id}')">
            <span class="notes-toggle-icon ${hasNotes ? 'open' : ''}" id="notes-icon-${t.id}">▶</span>
            <span>Notes${hasNotes ? ' (' + notesValue.split('\\n').length + ' line' + (notesValue.split('\\n').length !== 1 ? 's' : '') + ')' : ''}</span>
          </div>
          <div id="notes-body-${t.id}" style="display: ${hasNotes ? 'block' : 'none'};">
            <textarea class="notes-textarea" placeholder="Add notes, serial numbers, vendor info..." oninput="updateNotes('${t.id}', this.value)">${escapeHtml(notesValue)}</textarea>
          </div>
        </div>

        <div class="tile-actions">
          <button onclick="addItemToTicket('${t.id}')">+ Add item</button>
          <button class="delete btn-danger" onclick="deleteTicket('${t.id}')" aria-label="Delete ticket">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// INIT
// ============================================

document.getElementById('auth-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAuth();
});
document.getElementById('auth-email').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAuth();
});

db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    showLogin();
  } else if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    showApp();
  }
});

checkAuth();
