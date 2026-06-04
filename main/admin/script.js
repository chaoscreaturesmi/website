/* ============================================================
   CHAOS CREATURES — ADMINISTRATIVE PORTAL CONTROLLER
   Husbandry calculations, database management, and Google Sheets sync
   ============================================================ */

// Local Database Cache (loaded from initial_data.json or LocalStorage)
let db = {
  Dashboard: [],
  Animals: [],
  "Health Notes": [],
  Feedings: [],
  Weight: [],
  Pairings: [],
  Eggs: [],
  Hatchlings: [],
  Rats: [],
  Expenses: [],
  "Dropdown Helper": [],
  "Morph Lists": []
};

// Application State
let currentUser = null;
let currentView = 'dashboard';
let currentBreedingTab = 'pairings';
let currentProfileAnimal = null;
let profileWeightChart = null;
let expensesChart = null;

// Settings configuration
let settings = {
  syncSource: 'local', // 'local' | 'google-read' | 'google-write'
  sheetId: '1D90PWhngCl7uTmpDQBG8epAvr52pql9Ix2mXc4qbEY8',
  scriptUrl: ''
};

// Predefined security passwords (saved to localStorage on change)
let userPasswords = {
  "Admin": "chaoscreatures",
  "Handler A": "handlerA123",
  "Handler B": "handlerB123"
};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  loadStoredSettings();
  loadStoredPasswords();
  
  if (settings.syncSource === 'mariadb') {
    await checkAuth();
    if (currentUser) {
      await initDatabase();
    }
  } else {
    await initDatabase();
    checkAuth();
  }
  
  // Set default dates in forms to today
  const todayStr = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.value = todayStr;
  });
});

function loadStoredSettings() {
  const savedSettings = localStorage.getItem('chaos_settings');
  if (savedSettings) {
    try {
      settings = JSON.parse(savedSettings);
    } catch (e) {
      console.error("Error loading settings", e);
    }
  }
}

function loadStoredPasswords() {
  const savedPasswords = localStorage.getItem('chaos_passwords');
  if (savedPasswords) {
    try {
      userPasswords = JSON.parse(savedPasswords);
    } catch (e) {
      console.error("Error loading passwords", e);
    }
  }
}

function saveSettings() {
  const sourceEl = document.getElementById('setting-data-source');
  const sheetIdEl = document.getElementById('setting-sheet-id');
  const scriptUrlEl = document.getElementById('setting-api-url');
  
  if (sourceEl) settings.syncSource = sourceEl.value;
  if (sheetIdEl) settings.sheetId = sheetIdEl.value.trim();
  if (scriptUrlEl) settings.scriptUrl = scriptUrlEl.value.trim();
  
  localStorage.setItem('chaos_settings', JSON.stringify(settings));
  initDatabase(); // Re-initialize database with new settings
}

// Initialize database based on selected storage source
async function initDatabase() {
  updateSyncStatus('offline', 'Connecting...');
  
  if (settings.syncSource === 'mariadb') {
    updateSyncStatus('offline', 'Connecting to MariaDB...');
    try {
      const res = await fetch('../api/data.php');
      if (res.status === 401) {
        sessionStorage.removeItem('chaos_logged_user');
        currentUser = null;
        checkAuth();
        updateSyncStatus('offline', 'Please Login');
        return;
      }
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      db = await res.json();
      updateSyncStatus('synced', 'Live MariaDB Sync');
    } catch (e) {
      console.error("Error fetching MariaDB data:", e);
      const cachedDb = localStorage.getItem('chaos_db_sandbox');
      if (cachedDb) {
        db = JSON.parse(cachedDb);
        updateSyncStatus('offline', 'Offline Cache Loaded');
      } else {
        await resetSandboxToInitial();
        updateSyncStatus('error', 'Database Error - Safe Mode');
      }
    }
  } else if (settings.syncSource === 'local') {
    // Load local database sandbox
    const localDb = localStorage.getItem('chaos_db_sandbox');
    if (localDb) {
      try {
        db = JSON.parse(localDb);
        updateSyncStatus('synced', 'Sandbox Local Mode');
      } catch (e) {
        console.error("Error parsing sandbox DB, resetting to defaults", e);
        await resetSandboxToInitial();
      }
    } else {
      await resetSandboxToInitial();
    }
  } else {
    // Google Sheets live sync mode
    await fetchLiveGoogleSheetsData();
  }
  
  // Update view rendering
  if (currentUser) {
    refreshCurrentView();
  }
}

// Fetch all sheets from Google Spreadsheet
async function fetchLiveGoogleSheetsData() {
  const sheetId = settings.sheetId;
  if (!sheetId) {
    updateSyncStatus('error', 'Missing Spreadsheet ID');
    return;
  }
  
  updateSyncStatus('offline', 'Syncing Sheets...');
  
  // Sheet names to sync
  const sheets = [
    'Animals', 'Health Notes', 'Feedings', 'Weight', 
    'Pairings', 'Eggs', 'Hatchlings', 'Rats', 'Expenses', 
    'Dropdown Helper', 'Morph Lists'
  ];
  
  let syncSuccess = true;
  let tempDb = {};
  
  for (const sheetName of sheets) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const csvText = await res.text();
      tempDb[sheetName] = parseGoogleCSV(csvText, sheetName);
    } catch (e) {
      console.error(`Error syncing sheet ${sheetName}:`, e);
      syncSuccess = false;
      break;
    }
  }
  
  if (syncSuccess) {
    db = { ...db, ...tempDb };
    // Keep local cache up to date in case they go offline
    localStorage.setItem('chaos_db_cache_google', JSON.stringify(db));
    updateSyncStatus('synced', settings.syncSource === 'google-write' ? 'Live Read/Write Sync' : 'Live Read-Only Sync');
  } else {
    // Graceful fallback to cached Google data or local sandbox
    console.warn("Sync failed. Falling back to cached data.");
    const cachedDb = localStorage.getItem('chaos_db_cache_google') || localStorage.getItem('chaos_db_sandbox');
    if (cachedDb) {
      db = JSON.parse(cachedDb);
      updateSyncStatus('offline', 'Offline Cache Loaded');
    } else {
      await resetSandboxToInitial();
      updateSyncStatus('error', 'Sync Failed - Default Loaded');
    }
  }
}

// RFC 4180 Compliant CSV Parser
function parseGoogleCSV(text, sheetName) {
  let p = '', c = '', r = [];
  let q = false;
  let row = [''];
  for (let i = 0; i < text.length; i++) {
    c = text[i];
    let next = text[i + 1];
    if (c === '"') {
      if (q && next === '"') { row[row.length - 1] += '"'; i++; } // Escaped quote
      else { q = !q; }
    } else if (c === ',' && !q) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !q) {
      if (c === '\r' && next === '\n') { i++; }
      r.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    r.push(row);
  }
  
  if (r.length === 0) return [];
  
  // Health Notes title is in Row 1, headers are in Row 2
  let headerRowIdx = 0;
  if (sheetName === 'Health Notes' && r.length > 1 && r[0].length === 1) {
    headerRowIdx = 1;
  }
  
  const headers = r[headerRowIdx].map(h => h.trim());
  const numCols = headers.length;
  const records = [];
  
  for (let rIdx = headerRowIdx + 1; rIdx < r.length; rIdx++) {
    const cells = r[rIdx];
    // Filter empty rows
    if (cells.length === 0 || cells.every(cell => cell === "")) continue;
    
    const record = {};
    for (let cIdx = 0; cIdx < numCols; cIdx++) {
      const h = headers[cIdx];
      let val = cells[cIdx] !== undefined ? cells[cIdx] : null;
      if (val === "") val = null;
      record[h] = val;
    }
    
    // Validate record based on primary keys
    let isValid = false;
    if (sheetName === 'Animals' && record['Animal ID']) isValid = true;
    else if (sheetName === 'Health Notes' && record['Animal ID'] && record['Event Type']) isValid = true;
    else if (sheetName === 'Feedings' && record['Animal ID'] && record['Date']) isValid = true;
    else if (sheetName === 'Weight' && record['Animal ID'] && record['Date']) isValid = true;
    else if (sheetName === 'Pairings' && record['Pairing ID'] && (record['Male ID'] || record['Female ID'])) isValid = true;
    else if (sheetName === 'Eggs' && record['Clutch ID']) isValid = true;
    else if (sheetName === 'Hatchlings' && record['Baby ID']) isValid = true;
    else if (sheetName === 'Rats' && (record['Rat ID'] || record['Name'])) isValid = true;
    else if (sheetName === 'Expenses' && record['Date'] && record['Cost'] !== null) {
      record['Cost'] = parseFloat(record['Cost']);
      isValid = true;
    }
    else if (['Dropdown Helper', 'Morph Lists'].includes(sheetName)) {
      if (Object.values(record).some(val => val !== null && val !== "")) isValid = true;
    }
    
    if (isValid) {
      records.push(record);
    }
  }
  
  return records;
}

// Reset sandbox database to the initial_data.json file
async function resetSandboxToInitial() {
  try {
    const res = await fetch('initial_data.json');
    if (!res.ok) throw new Error("Could not load initial_data.json");
    db = await res.json();
    localStorage.setItem('chaos_db_sandbox', JSON.stringify(db));
    if (settings.syncSource === 'local') {
      updateSyncStatus('synced', 'Sandbox Local Mode');
    }
  } catch (e) {
    console.error("Error resetting sandbox", e);
    updateSyncStatus('error', 'Error Loading Defaults');
  }
}

// Save local sandbox records
function saveSandbox() {
  if (settings.syncSource === 'local') {
    localStorage.setItem('chaos_db_sandbox', JSON.stringify(db));
  }
}

// ============================================================
// SECURITY & AUTHENTICATION
// ============================================================
async function checkAuth() {
  if (settings.syncSource === 'mariadb') {
    try {
      const res = await fetch('../api/auth.php?action=check');
      const auth = await res.json();
      if (auth.status === 'success' && auth.authenticated) {
        currentUser = auth.username;
        sessionStorage.setItem('chaos_logged_user', currentUser);
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        
        document.getElementById('user-name-display').innerText = currentUser;
        document.getElementById('avatar-letter').innerText = currentUser.charAt(0).toUpperCase();
        document.getElementById('user-role-display').innerText = auth.role || 'Breeding Handler';
        
        refreshCurrentView();
      } else {
        currentUser = null;
        sessionStorage.removeItem('chaos_logged_user');
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
      }
    } catch (e) {
      console.error("Auth check failed:", e);
    }
  } else {
    const loggedUser = sessionStorage.getItem('chaos_logged_user');
    if (loggedUser) {
      currentUser = loggedUser;
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('app-container').style.display = 'flex';
      
      document.getElementById('user-name-display').innerText = currentUser;
      document.getElementById('avatar-letter').innerText = currentUser.charAt(0).toUpperCase();
      document.getElementById('user-role-display').innerText = currentUser === 'Admin' ? 'System Owner' : 'Breeding Handler';
      
      refreshCurrentView();
    } else {
      currentUser = null;
      document.getElementById('login-container').style.display = 'flex';
      document.getElementById('app-container').style.display = 'none';
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const loginError = document.getElementById('login-error');
  
  if (settings.syncSource === 'mariadb') {
    try {
      const res = await fetch('../api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: pass })
      });
      const data = await res.json();
      if (data.status === 'success') {
        loginError.style.display = 'none';
        sessionStorage.setItem('chaos_logged_user', username);
        document.getElementById('password').value = '';
        await initDatabase();
        await checkAuth();
      } else {
        loginError.style.display = 'block';
        loginError.innerText = data.message || "Invalid security password.";
      }
    } catch (err) {
      console.error("Login failed:", err);
      loginError.style.display = 'block';
      loginError.innerText = "Network error connecting to API server.";
    }
  } else {
    if (userPasswords[username] === pass) {
      loginError.style.display = 'none';
      sessionStorage.setItem('chaos_logged_user', username);
      document.getElementById('password').value = '';
      checkAuth();
    } else {
      loginError.style.display = 'block';
      loginError.innerText = "Invalid security password for " + username;
    }
  }
}

async function handleLogout() {
  if (settings.syncSource === 'mariadb') {
    try {
      await fetch('../api/auth.php?action=logout');
    } catch (e) {
      console.error("Logout request failed:", e);
    }
  }
  sessionStorage.removeItem('chaos_logged_user');
  checkAuth();
}

// ============================================================
// SYNC ACTIONS & WRITE BACK
// ============================================================
function updateSyncStatus(status, text) {
  const dot = document.getElementById('sync-dot');
  const txt = document.getElementById('sync-text');
  if (!dot || !txt) return;
  
  dot.className = 'status-dot';
  dot.classList.add(status);
  txt.innerText = text;
}

// Save a new record (writes to Sheet if google-write, otherwise saves to sandbox)
async function saveRecord(sheetName, recordData) {
  if (settings.syncSource === 'mariadb') {
    updateSyncStatus('offline', 'Saving to MariaDB...');
    try {
      const res = await fetch('../api/data.php?action=append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: sheetName,
          rowData: recordData
        })
      });
      if (res.status === 401) {
        alert("Session Expired: Please log in again.");
        handleLogout();
        return;
      }
      const data = await res.json();
      if (data.status === 'success') {
        updateSyncStatus('synced', 'Live MariaDB Sync');
        db[sheetName].unshift(recordData);
        refreshCurrentView();
      } else {
        alert("Database Error: " + data.message);
        updateSyncStatus('error', 'Save Failed');
      }
    } catch (e) {
      console.error("MariaDB write error:", e);
      updateSyncStatus('error', 'Connection Fail');
      alert("Error saving record to database. Verify network connection.");
    }
    return;
  }

  // Update local DB cache first for instant feedback
  db[sheetName].unshift(recordData);
  saveSandbox();
  
  // Write back to Google Sheets if enabled
  if (settings.syncSource === 'google-write') {
    if (!settings.scriptUrl) {
      alert("Settings: Google write enabled but Apps Script API URL is missing!");
      return;
    }
    
    updateSyncStatus('offline', 'Uploading event...');
    
    try {
      const res = await fetch(settings.scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Apps Script requires no-cors if not returning CORS headers, but our snippet does
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sheetName: sheetName,
          rowData: recordData
        })
      });
      
      // Since Google Apps Script Web App redirects, with no-cors we can't read response.
      // But if we use CORS we can. We'll wait 2 seconds and re-sync to fetch new sheet state.
      setTimeout(async () => {
        await fetchLiveGoogleSheetsData();
        refreshCurrentView();
      }, 2000);
      
      updateSyncStatus('synced', 'Live Read/Write Sync');
    } catch (e) {
      console.error("Error writing to Google Sheets:", e);
      updateSyncStatus('error', 'Upload failed - Saved locally');
    }
  } else {
    refreshCurrentView();
  }
}

// ============================================================
// HUSBANDRY CALCULATIONS (SPREADSHEET FORMULAS)
// ============================================================
function getActiveBreedersCount() {
  return db.Animals.filter(a => a.Status === 'Breeder').length;
}

function getClutchesInIncubatorCount() {
  const today = new Date().toISOString().split('T')[0];
  return db.Eggs.filter(e => {
    return e['Incubation Start'] && e['Expected Hatch'] && 
           e['Incubation Start'] <= today && e['Expected Hatch'] >= today;
  }).length;
}

function getFeedRefusalsCount() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  return db.Feedings.filter(f => {
    if (!f.Date || !f['Accepted?']) return false;
    const fDate = new Date(f.Date);
    return fDate >= thirtyDaysAgo && fDate <= today && f['Accepted?'].toLowerCase() === 'no';
  }).length;
}

function getYTDExpenses() {
  const total = db.Expenses.reduce((sum, item) => sum + (parseFloat(item.Cost) || 0), 0);
  return total.toFixed(2);
}

// Calculates dynamic feeding status alert
function calculateFeedingAlert(animal) {
  const animalId = animal['Animal ID'];
  const hatchDateStr = animal['Hatch Date'];
  
  // Find animal's feedings, sorted by date desc
  const animalFeedings = db.Feedings.filter(f => {
    if (!f['Animal ID'] || !f.Date) return false;
    const fId = f['Animal ID'].split(' - ')[0].trim();
    return fId === animalId && f['Accepted?'].toLowerCase() === 'yes';
  });
  
  let lastFedDateStr = null;
  if (animalFeedings.length > 0) {
    animalFeedings.sort((a,b) => new Date(b.Date) - new Date(a.Date));
    lastFedDateStr = animalFeedings[0].Date;
  }
  
  if (!hatchDateStr || !lastFedDateStr) {
    return { alert: 'Hungry', lastFed: lastFedDateStr || 'Never' };
  }
  
  // Calculate age in months
  const hatch = new Date(hatchDateStr);
  const lastFed = new Date(lastFedDateStr);
  const today = new Date();
  
  const ageMonths = (today.getFullYear() - hatch.getFullYear()) * 12 + today.getMonth() - hatch.getMonth();
  
  // Interval in days matching spreadsheet: LET(age, DATEDIF(I2, TODAY(), "m"), interval, IFS(age <= 3, 7, age <= 12, 10, age <= 24, 14, TRUE, 21)...)
  let interval = 21;
  if (ageMonths <= 3) interval = 7;
  else if (ageMonths <= 12) interval = 10;
  else if (ageMonths <= 24) interval = 14;
  
  // Days since last fed
  const diffTime = Math.abs(today - lastFed);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const alert = diffDays > interval ? 'Hungry' : 'OK';
  return { alert, lastFed: lastFedDateStr };
}

// Get the current weight for an animal (latest weight log)
function getAnimalCurrentWeight(animalId) {
  const logs = db.Weight.filter(w => {
    if (!w['Animal ID']) return false;
    const wId = w['Animal ID'].split(' - ')[0].trim();
    return wId === animalId;
  });
  
  if (logs.length === 0) return 'No Wt';
  
  logs.sort((a,b) => new Date(b.Date) - new Date(a.Date));
  return logs[0]['Weight (g)'] + 'g';
}

// ============================================================
// ROUTING & VIEW CONTROLLER
// ============================================================
function switchView(viewName) {
  currentView = viewName;
  
  // Remove active from links
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active to link
  const activeLink = document.getElementById(`nav-${viewName}`);
  if (activeLink) activeLink.classList.add('active');
  
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.style.display = 'none';
  });
  
  // Show active section
  document.getElementById(`view-${viewName}`).style.display = 'block';
  
  // Update header text
  const viewTitles = {
    dashboard: { title: "Executive Dashboard", subtitle: "Chaos Creatures facility key performance indicators and logs." },
    animals: { title: "Animal Collection", subtitle: "Track lineage, status, weights, and feeding schedules." },
    breeding: { title: "Pairings & Incubator", subtitle: "Manage active breeder locking history, egg clutches, and hatches." },
    rats: { title: "Feeder Colony", subtitle: "Manage your rat breeding groups, litters, and colony status." },
    expenses: { title: "Financial Hub", subtitle: "Oversee operational business expenditures and YTD spending." },
    settings: { title: "Portal Configurations", subtitle: "Configure Google Sheets synchronization parameters." }
  };
  
  document.getElementById('view-title').innerText = viewTitles[viewName].title;
  document.getElementById('view-subtitle').innerText = viewTitles[viewName].subtitle;
  
  refreshCurrentView();
}

function refreshCurrentView() {
  if (currentView === 'dashboard') renderDashboard();
  else if (currentView === 'animals') renderAnimalsTable();
  else if (currentView === 'breeding') renderBreeding();
  else if (currentView === 'rats') renderRatsTable();
  else if (currentView === 'expenses') renderExpenses();
  else if (currentView === 'settings') renderSettings();
}

// ============================================================
// RENDER: DASHBOARD VIEW
// ============================================================
function renderDashboard() {
  // Set KPIs
  document.getElementById('kpi-breeders').innerText = getActiveBreedersCount();
  document.getElementById('kpi-animals').innerText = db.Animals.length;
  document.getElementById('kpi-clutches').innerText = getClutchesInIncubatorCount();
  document.getElementById('kpi-refusals').innerText = getFeedRefusalsCount();
  document.getElementById('kpi-expenses').innerText = `$${getYTDExpenses()}`;
  
  // Populate Activity log (combine feedings, weights, health events and sort by date)
  const activities = [];
  
  // Add Feedings
  db.Feedings.forEach(f => {
    if (!f.Date) return;
    const isRefusal = f['Accepted?'].toLowerCase() === 'no';
    activities.push({
      date: new Date(f.Date),
      type: isRefusal ? 'refusal' : 'feed',
      emoji: isRefusal ? '❌' : '🍽️',
      text: `<strong>${f['Animal ID']}</strong> was offered a ${f.Size || ''} ${f['Food Item'] || 'Item'} (${isRefusal ? 'Refused' : 'Accepted'})`,
      notes: f.Notes ? ` - ${f.Notes}` : ''
    });
  });
  
  // Add Weights
  db.Weight.forEach(w => {
    if (!w.Date) return;
    activities.push({
      date: new Date(w.Date),
      type: 'weight',
      emoji: '⚖️',
      text: `Recorded weight for <strong>${w['Animal ID']}</strong>: ${w['Weight (g)']}g`,
      notes: w.Notes ? ` - ${w.Notes}` : ''
    });
  });
  
  // Add Health Notes
  db['Health Notes'].forEach(h => {
    if (!h.Date) return;
    activities.push({
      date: new Date(h.Date),
      type: 'health',
      emoji: '🩺',
      text: `<strong>${h['Animal ID']}</strong> had a health log event: <strong>${h['Event Type']}</strong>`,
      notes: h['Details / Notes'] ? ` - ${h['Details / Notes']}` : ''
    });
  });
  
  // Sort activities by date desc, show top 10
  activities.sort((a, b) => b.date - a.date);
  
  const container = document.getElementById('dashboard-activities');
  container.innerHTML = '';
  
  if (activities.length === 0) {
    container.innerHTML = '<div class="activity-item">No husbandry events logged yet.</div>';
    return;
  }
  
  activities.slice(0, 10).forEach(act => {
    const actDateStr = act.date.toISOString().split('T')[0];
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-badge ${act.type}">${act.emoji}</div>
      <div class="activity-details">
        <div>${act.text} <span style="font-size:0.8rem; color:var(--text-tertiary);">${act.notes}</span></div>
        <div class="activity-time">${actDateStr} • logged by handler</div>
      </div>
    `;
    container.appendChild(item);
  });
}

// ============================================================
// RENDER: ANIMALS VIEW
// ============================================================
function renderAnimalsTable() {
  const tbody = document.getElementById('animals-table-body');
  tbody.innerHTML = '';
  
  const search = document.getElementById('animal-search').value.toLowerCase();
  const speciesFilter = document.getElementById('filter-species').value;
  const statusFilter = document.getElementById('filter-status').value;
  const alertFilter = document.getElementById('filter-alert').value;
  
  // Filter animals
  const filtered = db.Animals.filter(a => {
    const alertData = calculateFeedingAlert(a);
    const matchesSearch = a['Animal ID'].toLowerCase().includes(search) || 
                          (a.Name && a.Name.toLowerCase().includes(search)) || 
                          (a['Gene 1'] && a['Gene 1'].toLowerCase().includes(search)) ||
                          (a['Gene 2'] && a['Gene 2'].toLowerCase().includes(search));
    const matchesSpecies = !speciesFilter || a.Species === speciesFilter;
    const matchesStatus = !statusFilter || a.Status === statusFilter;
    const matchesAlert = !alertFilter || alertData.alert === alertFilter;
    
    return matchesSearch && matchesSpecies && matchesStatus && matchesAlert;
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-secondary);">No animals found in collection matching filters.</td></tr>';
    return;
  }
  
  filtered.forEach(a => {
    const weight = getAnimalCurrentWeight(a['Animal ID']);
    const alertData = calculateFeedingAlert(a);
    
    // Combine morph/genes
    let genes = [a['Gene 1'], a['Gene 2'], a['Gene 3']].filter(g => g).join(' ') || 'Normal';
    if (a['Hets / Poss Hets']) genes += ` (${a['Hets / Poss Hets']})`;
    
    const tr = document.createElement('tr');
    tr.onclick = () => openAnimalProfile(a);
    tr.innerHTML = `
      <td><strong>${a['Animal ID']}</strong></td>
      <td>${a.Name || '—'}</td>
      <td>${a.Species}</td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;" title="${genes}">${genes}</td>
      <td><span class="badge ${a.Sex ? a.Sex.toLowerCase() : 'unknown'}">${a.Sex || 'Unknown'}</span></td>
      <td>${weight}</td>
      <td>${a['Rack/Tub'] || '—'}</td>
      <td>${alertData.lastFed}</td>
      <td><span class="badge ${alertData.alert.toLowerCase()}">${alertData.alert}</span></td>
      <td onclick="event.stopPropagation()"><canvas class="sparkline-canvas" id="spark-${a['Animal ID']}"></canvas></td>
    `;
    tbody.appendChild(tr);
    
    // Draw mini sparkline in row
    drawSparkline(`spark-${a['Animal ID']}`, a['Animal ID']);
  });
}

function drawSparkline(canvasId, animalId) {
  setTimeout(() => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Get animal weights
    const weights = db.Weight.filter(w => {
      if (!w['Animal ID']) return false;
      const wId = w['Animal ID'].split(' - ')[0].trim();
      return wId === animalId;
    }).sort((a,b) => new Date(a.Date) - new Date(b.Date));
    
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    if (weights.length < 2) {
      ctx.fillStyle = '#505c72';
      ctx.font = '9px Inter';
      ctx.fillText(weights.length === 1 ? weights[0]['Weight (g)'] + 'g' : 'No Data', 8, 15);
      return;
    }
    
    // Draw simple line
    const vals = weights.map(w => parseFloat(w['Weight (g)']));
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const range = maxVal - minVal || 10;
    
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    for (let i = 0; i < vals.length; i++) {
      const x = (i / (vals.length - 1)) * (canvas.width - 4) + 2;
      const y = canvas.height - ((vals[i] - minVal) / range) * (canvas.height - 6) - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, 100);
}

// ============================================================
// RENDER: BREEDING & PAIRINGS VIEW
// ============================================================
function switchBreedingTab(tabName) {
  currentBreedingTab = tabName;
  document.querySelectorAll('#view-breeding .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');
  
  document.querySelectorAll('.breeding-tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById(`breeding-${tabName}-tab`).style.display = 'block';
  
  renderBreeding();
}

function renderBreeding() {
  if (currentBreedingTab === 'pairings') renderPairings();
  else if (currentBreedingTab === 'clutches') renderClutches();
  else if (currentBreedingTab === 'hatchlings') renderHatchlings();
}

function renderPairings() {
  const tbody = document.getElementById('pairings-table-body');
  tbody.innerHTML = '';
  
  const search = document.getElementById('breeding-search').value.toLowerCase();
  
  const filtered = db.Pairings.filter(p => {
    return !search || 
           (p['Male ID'] && p['Male ID'].toLowerCase().includes(search)) || 
           (p['Female ID'] && p['Female ID'].toLowerCase().includes(search)) ||
           (p.Species && p.Species.toLowerCase().includes(search));
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-secondary);">No pairings registered.</td></tr>';
    return;
  }
  
  filtered.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>P-${p['Pairing ID']}</strong></td>
      <td>${p['Male ID']}</td>
      <td>${p['Female ID']}</td>
      <td>${p.Species}</td>
      <td>${p['Start Date'] || '—'}</td>
      <td>${p['Locks Seen'] || '—'}</td>
      <td>${p.Ovulation || '—'}</td>
      <td>${p['Lay Date'] || '—'}</td>
      <td style="font-size:0.8rem; color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis;">${p.Notes || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderClutches() {
  const tbody = document.getElementById('clutches-table-body');
  tbody.innerHTML = '';
  
  if (db.Eggs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-secondary);">No incubator clutches recorded.</td></tr>';
    return;
  }
  
  db.Eggs.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${e['Clutch ID']}</strong></td>
      <td>P-${e['Pairing ID'] || '—'}</td>
      <td>${e['Sire (Father)'] || '—'}</td>
      <td>${e['Dam (Mother)'] || '—'}</td>
      <td><span style="font-weight:600; color:var(--accent-light);">${e.Eggs || 0}</span></td>
      <td><span style="font-weight:600; color:var(--danger);">${e.Slugs || 0}</span></td>
      <td>${e['Incubation Start'] || '—'}</td>
      <td>${e['Expected Hatch'] || '—'}</td>
      <td>${e['Hatch Date'] || '—'}</td>
      <td style="font-size:0.8rem; color:var(--text-secondary);">${e.Notes || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHatchlings() {
  const tbody = document.getElementById('hatchlings-table-body');
  tbody.innerHTML = '';
  
  if (db.Hatchlings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-secondary);">No hatchlings cataloged.</td></tr>';
    return;
  }
  
  db.Hatchlings.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${h['Baby ID']}</strong></td>
      <td>${h['Clutch ID'] || '—'}</td>
      <td>${h['Egg #']}</td>
      <td>${h['Actual Morph'] || 'Un-shed / Normal'}</td>
      <td><span class="badge ${h.Sex ? h.Sex.toLowerCase() : 'unknown'}">${h.Sex || 'Unknown'}</span></td>
      <td>${h['Hatch Date'] || '—'}</td>
      <td>${h['First Meal'] || '—'}</td>
      <td>${h.Status || '—'}</td>
      <td>${h.Price ? `$${h.Price}` : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// RENDER: FEEDER COLONY (RATS) VIEW
// ============================================================
function renderRatsTable() {
  const tbody = document.getElementById('rats-table-body');
  tbody.innerHTML = '';
  
  const search = document.getElementById('rat-search').value.toLowerCase();
  
  const filtered = db.Rats.filter(r => {
    return !search || 
           (r.Name && r.Name.toLowerCase().includes(search)) || 
           (r['Rat ID'] && r['Rat ID'].toString().toLowerCase().includes(search)) ||
           (r.Colony && r.Colony.toLowerCase().includes(search));
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-secondary);">No breeder rodents registered.</td></tr>';
    return;
  }
  
  filtered.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>R-${r['Rat ID']}</strong></td>
      <td>${r.Name || '—'}</td>
      <td>${r.Colony}</td>
      <td><span class="badge ${r.Sex ? r.Sex.toLowerCase() : 'unknown'}">${r.Sex}</span></td>
      <td>${r['Breeding Status']}</td>
      <td><span style="font-weight:600;">${r['Litters Produced'] || 0}</span></td>
      <td style="font-size:0.8rem; color:var(--text-secondary);">${r.Notes || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// RENDER: EXPENSES VIEW
// ============================================================
function renderExpenses() {
  const tbody = document.getElementById('expenses-table-body');
  tbody.innerHTML = '';
  
  const catFilter = document.getElementById('filter-expense-cat').value;
  
  const filtered = db.Expenses.filter(e => {
    return !catFilter || e.Category === catFilter;
  });
  
  // Sort by date desc
  filtered.sort((a,b) => new Date(b.Date) - new Date(a.Date));
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-secondary);">No expense reports recorded.</td></tr>';
    return;
  }
  
  filtered.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.Date}</td>
      <td><span class="badge" style="background:rgba(255,255,255,0.05);">${e.Category}</span></td>
      <td><strong>${e.Item}</strong></td>
      <td><span style="color:#f87171; font-weight:600;">-$${parseFloat(e.Cost).toFixed(2)}</span></td>
      <td>${e.Vendor || '—'}</td>
      <td style="font-size:0.8rem; color:var(--text-secondary);">${e.Notes || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
  
  // Draw expense breakdown chart
  renderExpensesChart();
}

function renderExpensesChart() {
  // Aggregate expenses by category
  const categories = ['Rodents', 'Substrate', 'Enrichment/Care', 'Electricity', 'Racks', 'Vet', 'Shipping'];
  const totals = categories.map(cat => {
    return db.Expenses.filter(e => e.Category === cat)
                      .reduce((sum, item) => sum + (parseFloat(item.Cost) || 0), 0);
  });
  
  // Update Legend Panel
  const legend = document.getElementById('expenses-chart-legend');
  legend.innerHTML = '';
  
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#ef4444', '#10b981'];
  
  categories.forEach((cat, idx) => {
    const val = totals[idx];
    if (val > 0) {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.fontSize = '0.85rem';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:10px; height:10px; background:${colors[idx]}; border-radius:50%; display:inline-block;"></span>
          <span style="color:var(--text-secondary);">${cat}</span>
        </div>
        <span style="font-weight:600;">$${val.toFixed(2)}</span>
      `;
      legend.appendChild(item);
    }
  });
  
  // Render Chart.js Donut
  setTimeout(() => {
    const canvas = document.getElementById('expenses-chart');
    if (!canvas) return;
    
    if (expensesChart) {
      expensesChart.destroy();
    }
    
    // Filter categories with values for chart
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];
    
    categories.forEach((cat, idx) => {
      if (totals[idx] > 0) {
        chartLabels.push(cat);
        chartData.push(totals[idx]);
        chartColors.push(colors[idx]);
      }
    });
    
    if (chartData.length === 0) {
      // draw text on canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0, canvas.width, canvas.height);
      ctx.fillStyle = '#505c72';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No expenses reported', canvas.width/2, canvas.height/2);
      return;
    }
    
    expensesChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 1,
          borderColor: '#111520'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        cutout: '70%'
      }
    });
  }, 100);
}

// ============================================================
// RENDER: SETTINGS VIEW
// ============================================================
function renderSettings() {
  document.getElementById('setting-data-source').value = settings.syncSource;
  document.getElementById('setting-sheet-id').value = settings.sheetId;
  document.getElementById('setting-api-url').value = settings.scriptUrl;
  
  toggleSettingsSyncPanel();
}

function toggleSettingsSyncPanel() {
  const src = document.getElementById('setting-data-source').value;
  const fields = document.getElementById('settings-google-fields');
  const writeFields = document.querySelectorAll('.write-api-field');
  
  if (src === 'local') {
    fields.style.display = 'none';
    writeFields.forEach(f => f.style.display = 'none');
  } else if (src === 'google-read') {
    fields.style.display = 'block';
    writeFields.forEach(f => f.style.display = 'none');
  } else if (src === 'google-write') {
    fields.style.display = 'block';
    writeFields.forEach(f => f.style.display = 'block');
  }
}

// ============================================================
// ANIMAL DETAILED PROFILE MODAL
// ============================================================
function openAnimalProfile(animal) {
  currentProfileAnimal = animal;
  const animalId = animal['Animal ID'];
  
  // Set Profile Sidebar Info
  document.getElementById('profile-title-id').innerText = `Animal Profile — ${animalId}`;
  document.getElementById('profile-name').innerText = animal.Name || 'No Name';
  document.getElementById('profile-species').innerText = animal.Species;
  document.getElementById('profile-status').innerText = animal.Status || 'None';
  document.getElementById('profile-sex').innerText = animal.Sex || 'Unknown';
  document.getElementById('profile-hatch').innerText = animal['Hatch Date'] || 'Unknown';
  document.getElementById('profile-rack').innerText = animal['Rack/Tub'] || '—';
  
  // Species Avatar emoji
  let emoji = '🐍';
  if (animal.Species.includes('Gecko')) emoji = '🦎';
  document.getElementById('profile-avatar-emoji').innerText = emoji;
  
  // Populate Weight logs table
  renderProfileWeightLogs(animalId);
  
  // Populate Feed logs table
  renderProfileFeedLogs(animalId);
  
  // Populate Health logs table
  renderProfileHealthLogs(animalId);
  
  // Setup QR tab
  const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSceiNNE-GG_Ys-Us0sb110WnUodEh_WiJOZjrCZFaM574-pxQ/viewform?usp=pp_url&entry.31510263=${animalId}`;
  document.getElementById('qr-label-display').innerText = `${animalId} - ${animal.Name || ''}`;
  document.getElementById('qr-code-img').src = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(formUrl)}`;
  
  // Set active tab to Growth
  switchProfileTab('growth');
  
  // Render Chart
  renderProfileGrowthChart(animalId);
  
  openModal('modal-animal-profile');
}

function switchProfileTab(tabName) {
  document.querySelectorAll('#modal-animal-profile .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');
  
  document.querySelectorAll('#modal-animal-profile .profile-tab-content').forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById(`profile-${tabName}-tab`).style.display = 'block';
}

function renderProfileWeightLogs(animalId) {
  const tbody = document.getElementById('profile-weight-table-body');
  tbody.innerHTML = '';
  
  const logs = db.Weight.filter(w => {
    if (!w['Animal ID']) return false;
    const wId = w['Animal ID'].split(' - ')[0].trim();
    return wId === animalId;
  }).sort((a,b) => new Date(b.Date) - new Date(a.Date));
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:12px; color:var(--text-secondary);">No weights logged.</td></tr>';
    return;
  }
  
  logs.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${w.Date}</td>
      <td><strong>${w['Weight (g)']}g</strong></td>
      <td style="color:var(--text-secondary); font-size:0.8rem;">${w.Notes || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProfileFeedLogs(animalId) {
  const tbody = document.getElementById('profile-feedings-table-body');
  tbody.innerHTML = '';
  
  const logs = db.Feedings.filter(f => {
    if (!f['Animal ID']) return false;
    const fId = f['Animal ID'].split(' - ')[0].trim();
    return fId === animalId;
  }).sort((a,b) => new Date(b.Date) - new Date(a.Date));
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--text-secondary);">No feedings logged.</td></tr>';
    return;
  }
  
  logs.forEach(f => {
    const tr = document.createElement('tr');
    const isRefusal = f['Accepted?'].toLowerCase() === 'no';
    tr.innerHTML = `
      <td>${f.Date}</td>
      <td>${f['Food Item']}</td>
      <td>${f.Size || '—'}</td>
      <td><span class="badge ${isRefusal ? 'hungry' : 'ok'}">${f['Accepted?']}</span></td>
      <td style="color:var(--text-secondary); font-size:0.8rem;">${f.Notes || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProfileHealthLogs(animalId) {
  const tbody = document.getElementById('profile-events-table-body');
  tbody.innerHTML = '';
  
  const logs = db['Health Notes'].filter(h => {
    if (!h['Animal ID']) return false;
    const hId = h['Animal ID'].split(' - ')[0].trim();
    return hId === animalId;
  }).sort((a,b) => new Date(b.Date) - new Date(a.Date));
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--text-secondary);">No health events reported.</td></tr>';
    return;
  }
  
  logs.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${h.Date || '—'}</td>
      <td><span class="badge" style="background:rgba(245, 158, 11, 0.08); color:var(--warning);">${h['Event Type']}</span></td>
      <td style="color:var(--text-secondary); font-size:0.8rem;">${h['Details / Notes'] || '—'}</td>
      <td>${h['Handled by'] || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProfileGrowthChart(animalId) {
  const canvas = document.getElementById('growth-chart');
  if (!canvas) return;
  
  if (profileWeightChart) {
    profileWeightChart.destroy();
  }
  
  const logs = db.Weight.filter(w => {
    if (!w['Animal ID']) return false;
    const wId = w['Animal ID'].split(' - ')[0].trim();
    return wId === animalId;
  }).sort((a,b) => new Date(a.Date) - new Date(b.Date));
  
  const chartLabels = logs.map(w => w.Date);
  const chartData = logs.map(w => parseFloat(w['Weight (g)']));
  
  profileWeightChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Weight (grams)',
        data: chartData,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 2,
        tension: 0.1,
        fill: true,
        pointBackgroundColor: '#22c55e',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#8894a8', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#8894a8', font: { size: 10 } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ============================================================
// FORM DIALOG MODALS OPEN/CLOSE
// ============================================================
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function closeModalOnOverlay(e, modalId) {
  if (e.target.id === modalId) {
    closeModal(modalId);
  }
}

// Select helpers for logging forms
function populateAnimalSelector(selectId, preselectId = null) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '';
  
  // Add placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.innerText = 'Select Enclosure Enhabitant...';
  select.appendChild(placeholder);
  
  db.Animals.forEach(a => {
    const opt = document.createElement('option');
    const label = `${a['Animal ID']} - ${a.Name || ''}`;
    opt.value = label;
    opt.innerText = label;
    if (preselectId && a['Animal ID'] === preselectId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function openFeedingModal() {
  populateAnimalSelector('feed-animal-id');
  openModal('modal-feeding');
}

function openFeedingModalFromProfile() {
  if (!currentProfileAnimal) return;
  closeModal('modal-animal-profile');
  populateAnimalSelector('feed-animal-id', currentProfileAnimal['Animal ID']);
  openModal('modal-feeding');
}

function openWeightModal() {
  populateAnimalSelector('weight-animal-id');
  openModal('modal-weight');
}

function openWeightModalFromProfile() {
  if (!currentProfileAnimal) return;
  closeModal('modal-animal-profile');
  populateAnimalSelector('weight-animal-id', currentProfileAnimal['Animal ID']);
  openModal('modal-weight');
}

function openHealthModal() {
  populateAnimalSelector('health-animal-id');
  openModal('modal-health');
}

function openHealthModalFromProfile() {
  if (!currentProfileAnimal) return;
  closeModal('modal-animal-profile');
  populateAnimalSelector('health-animal-id', currentProfileAnimal['Animal ID']);
  openModal('modal-health');
}

function openAddAnimalModal() {
  populateMorphSuggestions();
  openModal('modal-add-animal');
}

function populateMorphSuggestions() {
  const species = document.getElementById('new-animal-species').value;
  const listColMap = {
    'Ball Python': 'Ball Python',
    'Red Blood Python': 'Red Blood Python',
    'Leopard Gecko': 'Leopard Gecko',
    'Crested Gecko': 'Crested Gecko',
    'Rat Snake': 'Rat Snake'
  };
  
  const headerName = listColMap[species] || 'Ball Python';
  
  // Extract morphs for selected species from Morph Lists sheet
  const morphs = db['Morph Lists'].map(row => row[headerName]).filter(m => m && m.trim() !== "");
  
  const selectors = ['new-animal-gene1', 'new-animal-gene2', 'new-animal-gene3'];
  selectors.forEach(selectId => {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">None / Normal</option>';
    morphs.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.innerText = m;
      select.appendChild(opt);
    });
  });
}

function openAddPairingModal() {
  // Populate species selector from Animals Species list
  const select = document.getElementById('pair-species');
  select.innerHTML = '';
  
  const species = [...new Set(db.Animals.map(a => a.Species))];
  species.forEach(sp => {
    const opt = document.createElement('option');
    opt.value = sp;
    opt.innerText = sp;
    select.appendChild(opt);
  });
  
  populateBreedingAnimalSelectors();
  openModal('modal-add-pairing');
}

function populateBreedingAnimalSelectors() {
  const species = document.getElementById('pair-species').value;
  const maleSelect = document.getElementById('pair-male');
  const femaleSelect = document.getElementById('pair-female');
  
  maleSelect.innerHTML = '<option value="">Select Sire...</option>';
  femaleSelect.innerHTML = '<option value="">Select Dam...</option>';
  
  const males = db.Animals.filter(a => a.Species === species && a.Sex === 'Male');
  const females = db.Animals.filter(a => a.Species === species && a.Sex === 'Female');
  
  males.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m['Animal ID'];
    opt.innerText = `${m['Animal ID']} - ${m.Name || ''}`;
    maleSelect.appendChild(opt);
  });
  
  females.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f['Animal ID'];
    opt.innerText = `${f['Animal ID']} - ${f.Name || ''}`;
    femaleSelect.appendChild(opt);
  });
}

function openAddClutchModal() {
  const select = document.getElementById('clutch-pairing');
  select.innerHTML = '<option value="">Select Pairing Lineage...</option>';
  
  db.Pairings.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p['Pairing ID'];
    opt.innerText = `Pairing #${p['Pairing ID']} - Sire: ${p['Male ID']} x Dam: ${p['Female ID']} (${p.Species})`;
    select.appendChild(opt);
  });
  
  openModal('modal-add-clutch');
}

function autofillClutchParentInfo() {
  // We don't strictly require autofilling because the pairing ID references them, 
  // but we can generate Clutch ID dynamically
  const pairingId = document.getElementById('clutch-pairing').value;
  if (!pairingId) return;
  
  const count = db.Eggs.length + 1;
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  document.getElementById('clutch-id').value = `C-${yearSuffix}-${count.toString().padStart(2, '0')}`;
}

function calculateExpectedHatchDate() {
  const startStr = document.getElementById('clutch-incubate').value;
  if (!startStr) return;
  
  const startDate = new Date(startStr);
  // Default incubation duration 60 days
  startDate.setDate(startDate.getDate() + 60);
  
  document.getElementById('clutch-expected').value = startDate.toISOString().split('T')[0];
}

function openAddRatModal() {
  const ratId = db.Rats.reduce((max, r) => Math.max(max, parseInt(r['Rat ID']) || 0), 0) + 1;
  document.getElementById('rat-id').value = ratId;
  openModal('modal-add-rat');
}

function openAddExpenseModal() {
  openModal('modal-expense');
}

// ============================================================
// FORM SUBMISSION EVENT HANDLERS
// ============================================================
async function submitFeedingForm(e) {
  e.preventDefault();
  const animalVal = document.getElementById('feed-animal-id').value;
  const date = document.getElementById('feed-date').value;
  const accepted = document.getElementById('feed-accepted').value;
  const food = document.getElementById('feed-food').value;
  const size = document.getElementById('feed-size').value;
  const notes = document.getElementById('feed-notes').value;
  
  const record = {
    Date: date,
    "Animal ID": animalVal,
    "Food Item": food,
    Size: size || null,
    "Accepted?": accepted,
    Notes: notes || null
  };
  
  await saveRecord('Feedings', record);
  closeModal('modal-feeding');
  document.getElementById('form-feeding').reset();
}

async function submitWeightForm(e) {
  e.preventDefault();
  const animalVal = document.getElementById('weight-animal-id').value;
  const date = document.getElementById('weight-date').value;
  const weight = parseFloat(document.getElementById('weight-grams').value);
  const notes = document.getElementById('weight-notes').value;
  
  const record = {
    Date: date,
    "Animal ID": animalVal,
    "Weight (g)": weight,
    Notes: notes || null
  };
  
  await saveRecord('Weight', record);
  closeModal('modal-weight');
  document.getElementById('form-weight').reset();
}

async function submitHealthForm(e) {
  e.preventDefault();
  const animalVal = document.getElementById('health-animal-id').value;
  const date = document.getElementById('health-date').value;
  const eventType = document.getElementById('health-event').value;
  const details = document.getElementById('health-notes').value;
  const photo = document.getElementById('health-photo').value;
  
  const record = {
    Date: date,
    "Animal ID": animalVal,
    "Event Type": eventType,
    "Details / Notes": details,
    "Photo Link (optional)": photo || null,
    "Handled by": currentUser
  };
  
  await saveRecord('Health Notes', record);
  closeModal('modal-health');
  document.getElementById('form-health').reset();
}

async function submitAddAnimalForm(e) {
  e.preventDefault();
  const id = document.getElementById('new-animal-id').value.toUpperCase().trim();
  const name = document.getElementById('new-animal-name').value.trim();
  const species = document.getElementById('new-animal-species').value;
  const sex = document.getElementById('new-animal-sex').value;
  const gene1 = document.getElementById('new-animal-gene1').value;
  const gene2 = document.getElementById('new-animal-gene2').value;
  const gene3 = document.getElementById('new-animal-gene3').value;
  const hets = document.getElementById('new-animal-hets').value.trim();
  const hatch = document.getElementById('new-animal-hatch').value;
  const rack = document.getElementById('new-animal-rack').value.trim();
  const status = document.getElementById('new-animal-status').value;
  const notes = document.getElementById('new-animal-notes').value.trim();
  
  // Validate duplicate animal ID
  if (db.Animals.some(a => a['Animal ID'] === id)) {
    alert(`Enclosure ID alert: An animal with ID ${id} already exists!`);
    return;
  }
  
  const record = {
    "Animal ID": id,
    Name: name || null,
    Species: species,
    "Gene 1": gene1 || null,
    "Gene 2": gene2 || null,
    "Gene 3": gene3 || null,
    "Hets / Poss Hets": hets || null,
    Sex: sex,
    "Hatch Date": hatch,
    Weight: "No Wt", // Handled by dynamic calculation later
    Status: status,
    "Rack/Tub": rack || null,
    "Last Fed": "Never",
    Notes: notes || null,
    "Feeding Alert": "Hungry",
    "Growth Trend": "No Data"
  };
  
  await saveRecord('Animals', record);
  closeModal('modal-add-animal');
  document.getElementById('form-add-animal').reset();
}

async function submitAddPairingForm(e) {
  e.preventDefault();
  const species = document.getElementById('pair-species').value;
  const male = document.getElementById('pair-male').value;
  const female = document.getElementById('pair-female').value;
  const date = document.getElementById('pair-date').value;
  const locks = document.getElementById('pair-locks').value;
  const ovulation = document.getElementById('pair-ovulation').value;
  const lay = document.getElementById('pair-lay').value;
  const notes = document.getElementById('pair-notes').value;
  
  const pairingId = db.Pairings.length + 1;
  
  const record = {
    "Pairing ID": pairingId.toString(),
    "Male ID": male,
    "Female ID": female,
    Species: species,
    "Start Date": date,
    "Locks Seen": locks || null,
    Ovulation: ovulation || null,
    "Lay Date": lay || null,
    Notes: notes || null
  };
  
  await saveRecord('Pairings', record);
  closeModal('modal-add-pairing');
  document.getElementById('form-add-pairing').reset();
}

async function submitAddClutchForm(e) {
  e.preventDefault();
  const pairingId = document.getElementById('clutch-pairing').value;
  const clutchId = document.getElementById('clutch-id').value.trim();
  const eggs = parseInt(document.getElementById('clutch-eggs').value);
  const slugs = parseInt(document.getElementById('clutch-slugs').value);
  const incubate = document.getElementById('clutch-incubate').value;
  const expected = document.getElementById('clutch-expected').value;
  const actual = document.getElementById('clutch-actual').value;
  const notes = document.getElementById('clutch-notes').value;
  
  // Find pairing detail to get Sire/Dam
  const pairing = db.Pairings.find(p => p['Pairing ID'] === pairingId) || {};
  
  const record = {
    "Clutch ID": clutchId,
    "Pairing ID": pairingId,
    "Sire (Father)": pairing['Male ID'] || 'Unknown',
    "Dam (Mother)": pairing['Female ID'] || 'Unknown',
    Eggs: eggs,
    Slugs: slugs,
    "Incubation Start": incubate,
    "Expected Hatch": expected,
    "Hatch Date": actual || null,
    Notes: notes || null
  };
  
  await saveRecord('Eggs', record);
  closeModal('modal-add-clutch');
  document.getElementById('form-add-clutch').reset();
}

async function submitAddRatForm(e) {
  e.preventDefault();
  const name = document.getElementById('rat-name').value.trim();
  const id = parseInt(document.getElementById('rat-id').value);
  const colony = document.getElementById('rat-colony').value.trim();
  const sex = document.getElementById('rat-sex').value;
  const birth = document.getElementById('rat-birth').value;
  const status = document.getElementById('rat-status').value;
  const notes = document.getElementById('rat-notes').value;
  
  const record = {
    Name: name || null,
    "Rat ID": id,
    Colony: colony,
    Sex: sex,
    "Birth Date": birth || null,
    "Breeding Status": status,
    "Litters Produced": 0,
    Notes: notes || null
  };
  
  await saveRecord('Rats', record);
  closeModal('modal-add-rat');
  document.getElementById('form-add-rat').reset();
}

async function submitExpenseForm(e) {
  e.preventDefault();
  const date = document.getElementById('expense-date').value;
  const cat = document.getElementById('expense-category').value;
  const item = document.getElementById('expense-item').value.trim();
  const cost = parseFloat(document.getElementById('expense-cost').value);
  const vendor = document.getElementById('expense-vendor').value.trim();
  const notes = document.getElementById('expense-notes').value;
  
  const record = {
    Date: date,
    Category: cat,
    Item: item,
    Cost: cost,
    Vendor: vendor,
    Notes: notes || null
  };
  
  await saveRecord('Expenses', record);
  closeModal('modal-expense');
  document.getElementById('form-expense').reset();
}

// ============================================================
// SYSTEM PORTABILITY & IMPORT / EXPORT
// ============================================================
function exportDatabaseJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `chaos_creatures_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function triggerImportJSON() {
  document.getElementById('import-json-file').click();
}

function importDatabaseJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      // Validate schema
      if (imported.Animals && Array.isArray(imported.Animals)) {
        db = imported;
        saveSandbox();
        alert("Facility database imported successfully!");
        refreshCurrentView();
      } else {
        alert("Import Error: Invalid database JSON schema.");
      }
    } catch (err) {
      alert("Import Error: Could not parse JSON file.");
    }
  };
  reader.readAsText(file);
}

// ============================================================
// PWA SERVICE WORKER REGISTRATION
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered for Husbandry App', reg))
      .catch(err => console.warn('Service Worker registration failed', err));
  });
}

// ============================================================
// HTML5 QR ENCLOSURE SCANNING ENGINE
// ============================================================
let scannerStream = null;
let scannerActive = false;

function openQRScanner() {
  openModal('modal-qr-scanner');
  startQRScanner();
}

async function startQRScanner() {
  const video = document.getElementById('scanner-video');
  const canvas = document.getElementById('scanner-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  scannerActive = true;

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // Utilize rear camera
    });
    video.srcObject = scannerStream;
    video.setAttribute('playsinline', true); // Critical for mobile iOS safari
    video.play();

    // Frame Capture Loop
    requestAnimationFrame(function scanFrame() {
      if (!scannerActive) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert'
        });
        
        if (code) {
          handleScannedQR(code.data);
          return;
        }
      }
      requestAnimationFrame(scanFrame);
    });
  } catch (e) {
    console.error("Camera access failed:", e);
    alert("Camera Access Error: Please verify webcam/phone camera permissions.");
    closeQRScanner();
  }
}

function closeQRScanner() {
  scannerActive = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }
  closeModal('modal-qr-scanner');
}

function handleScannedQR(qrText) {
  let animalId = null;
  
  // Extract ID from full URL parameters or literal match
  try {
    const url = new URL(qrText);
    for (const [key, value] of url.searchParams) {
      if (key.includes('entry') || key.toLowerCase().includes('id')) {
        animalId = value;
        break;
      }
    }
    if (!animalId) {
      const match = qrText.match(/[A-Z]{1,3}\d{3}/i);
      if (match) animalId = match[0];
    }
  } catch (e) {
    const match = qrText.match(/[A-Z]{1,3}\d{3}/i);
    if (match) animalId = match[0];
  }
  
  if (animalId) {
    animalId = animalId.trim().toUpperCase();
    const animal = db.Animals.find(a => a['Animal ID'] === animalId);
    closeQRScanner();
    if (animal) {
      openAnimalProfile(animal);
    } else {
      alert(`Scanned Enclosure Tag ID "${animalId}" was not found in the database inventory.`);
    }
  } else {
    alert("Scanned QR is not a valid Chaos Creatures QR label.");
    closeQRScanner();
  }
}

// ============================================================
// THERMAL LABEL PRINTING FUNCTION
// ============================================================
function printAnimalLabel() {
  if (!currentProfileAnimal) return;
  const a = currentProfileAnimal;
  
  const printDiv = document.createElement('div');
  printDiv.id = 'print-label-area';
  printDiv.className = 'print-only-layout';
  
  const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSceiNNE-GG_Ys-Us0sb110WnUodEh_WiJOZjrCZFaM574-pxQ/viewform?usp=pp_url&entry.31510263=${a['Animal ID']}`;
  const qrSrc = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(formUrl)}`;
  const genesStr = [a['Gene 1'], a['Gene 2'], a['Gene 3']].filter(g => g).join(' ') || 'Normal';
  
  printDiv.innerHTML = `
    <div class="print-label-card">
      <div class="print-label-header">CHAOS CREATURES HUSBANDRY</div>
      <div class="print-label-body">
        <img class="print-label-qr" src="${qrSrc}" />
        <div class="print-label-info">
          <div class="print-label-id">${a['Animal ID']}</div>
          <div class="print-label-name">${a.Name || 'No Name'}</div>
          <div class="print-label-species">${a.Species}</div>
          <div class="print-label-genes">${genesStr} ${a['Hets / Poss Hets'] ? '(' + a['Hets / Poss Hets'] + ')' : ''}</div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(printDiv);
  window.print();
  printDiv.remove();
}
