import { getAllLogs } from '../storage/logs.js';
import { getAllContacts } from '../storage/contacts.js';
import { navigate } from './router.js';

function formatDate(isoString) {
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dayStr = d.toDateString();
  if (dayStr === today.toDateString()) return 'Today';
  if (dayStr === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getDateKey(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function startOfDay(daysAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

function buildTimeline(logs, nameMap, container) {
  container.innerHTML = '';
  if (logs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.marginTop = '2rem';
    empty.innerHTML = `
      <div style="font-size: 2.5rem; margin-bottom: 1rem;">📓</div>
      <p><strong>Your connection story starts here.</strong></p>
      <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 0.5rem;">
        Log your first interaction from the <b>Home</b> or <b>People</b> tab <br>to see your history grow.
      </p>
    `;
    container.appendChild(empty);
    return;
  }

  const groups = new Map();
  logs.forEach(log => {
    const key = getDateKey(log.timestamp);
    if (!groups.has(key)) groups.set(key, { label: formatDate(log.timestamp), entries: [] });
    groups.get(key).entries.push(log);
  });

  for (const [, group] of groups) {
    const dayGroup = document.createElement('div');
    dayGroup.className = 'log-day-group';

    const heading = document.createElement('div');
    heading.className = 'log-day-heading';
    heading.textContent = group.label;
    dayGroup.appendChild(heading);

    group.entries.forEach(log => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';

      const name = document.createElement('div');
      name.className = 'log-entry-name';
      name.textContent = nameMap[log.contactId] || 'Unknown';

      const meta = document.createElement('div');
      meta.className = 'log-entry-meta';

      const time = document.createElement('span');
      time.textContent = formatTime(log.timestamp);
      meta.appendChild(time);

      if (log.comment) {
        const comment = document.createElement('span');
        comment.className = 'log-entry-comment';
        comment.textContent = log.comment;
        meta.appendChild(comment);
      }

      entry.appendChild(name);
      entry.appendChild(meta);
      dayGroup.appendChild(entry);
    });

    container.appendChild(dayGroup);
  }
}

export async function renderJournal(db, params = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="view-loading"><div class="view-loading-spinner"></div><span>Opening journal...</span></div>';

  const [logs, contacts] = await Promise.all([getAllLogs(db), getAllContacts(db)]);

  const nameMap = {};
  contacts.forEach(c => { nameMap[c.id] = c.n; });

  app.innerHTML = '';
  // Header
  const header = document.createElement('div');
  header.className = 'view-header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Journal'; // Corrected line
  header.appendChild(h1);
  
  const headerRight = document.createElement('div');
  headerRight.className = 'view-header-right';
  const gearBtn = document.createElement('button');
  gearBtn.className = 'gear-btn';
  gearBtn.setAttribute('aria-label', 'Settings');
  gearBtn.textContent = '⚙️';
  gearBtn.addEventListener('click', () => navigate('settings'));
  headerRight.appendChild(gearBtn);
  header.appendChild(headerRight);

  app.appendChild(header);

  const content = document.createElement('div');
  content.className = 'view-content';

  // Search
  const searchRow = document.createElement('div');
  searchRow.className = 'journal-search-row';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search by name or note…';
  searchInput.setAttribute('aria-label', 'Search journal');
  
  if (params.search) {
    searchInput.value = params.search;
  }
  
  searchRow.appendChild(searchInput);
  content.appendChild(searchRow);

  // Stats
  const week = startOfDay(7);
  const month = startOfDay(30);
  const logsThisWeek = logs.filter(l => l.timestamp >= week).length;
  const logsThisMonth = logs.filter(l => l.timestamp >= month).length;

  // Most contacted
  const countMap = {};
  logs.forEach(l => { countMap[l.contactId] = (countMap[l.contactId] || 0) + 1; });
  let mostContactedName = '—';
  let maxCount = 0;
  for (const [id, count] of Object.entries(countMap)) {
    if (count > maxCount) { maxCount = count; mostContactedName = nameMap[id] || '—'; }
  }

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const stats = [
    { value: logs.length, label: 'Total interactions' },
    { value: logsThisWeek, label: 'This week' },
    { value: logsThisMonth, label: 'This month' },
    { value: mostContactedName, label: 'Most contacted' },
  ];

  stats.forEach(({ value, label }) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const val = document.createElement('div');
    val.className = 'stat-card-value';
    val.textContent = value;
    const lbl = document.createElement('div');
    lbl.className = 'stat-card-label';
    lbl.textContent = label;
    card.appendChild(val);
    card.appendChild(lbl);
    statsGrid.appendChild(card);
  });

  content.appendChild(statsGrid);

  // Timeline container
  const timeline = document.createElement('div');
  
  const getFilteredLogs = (query) => {
    if (!query) return logs;
    return logs.filter(log => {
      const contactName = (nameMap[log.contactId] || '').toLowerCase();
      const comment = (log.comment || '').toLowerCase();
      return contactName.includes(query) || comment.includes(query);
    });
  };

  const initialLogs = getFilteredLogs(searchInput.value.trim().toLowerCase());
  buildTimeline(initialLogs, nameMap, timeline);
  content.appendChild(timeline);

  // Live search
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = getFilteredLogs(query);
    buildTimeline(filtered, nameMap, timeline);
  });

  app.appendChild(content);
}
