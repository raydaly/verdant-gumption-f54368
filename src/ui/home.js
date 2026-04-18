import { getAllContacts, saveContact } from '../storage/contacts.js';
import { addLog } from '../storage/logs.js';
import { getSettings } from '../storage/settings.js';
import { getMonthDay } from '../core/milestone-engine.js';
import { getDueContacts, getAnchorEvents, getConnectionHealth, getSnoozeMs, checkGatheringRules } from '../core/outreach-engine.js';
import { navigate } from './router.js';
import { showConnectedSheet } from './components/connected-sheet.js';
import { showBottomSheet } from './components/bottom-sheet.js';
import { showContactProfile } from './components/contact-profile.js';

let currentVersion = 'v?';

function formatDaysOverdue(daysOverdue) {
  if (daysOverdue <= 0) return 'Due soon';
  if (daysOverdue === 1) return '1 day overdue';
  return `${daysOverdue} days overdue`;
}

function formatDaysUntil(daysUntil) {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

async function showGatheringMode(db, dueItems, onDone) {
  const content = document.createElement('div');

  const listEl = document.createElement('div');

  dueItems.forEach(({ contact }) => {
    const row = document.createElement('div');
    row.className = 'gathering-row';

    const checkId = 'gather-' + contact.id;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkId;
    checkbox.dataset.contactId = contact.id;

    const lbl = document.createElement('label');
    lbl.htmlFor = checkId;
    lbl.textContent = contact.n;

    row.appendChild(checkbox);
    row.appendChild(lbl);
    listEl.appendChild(row);
  });

  content.appendChild(listEl);

  const commentLabel = document.createElement('div');
  commentLabel.style.marginTop = '1rem';
  const commentLabelText = document.createElement('label');
  commentLabelText.textContent = 'Shared note (optional)';
  commentLabelText.style.cssText = 'display:block;font-size:0.875rem;color:var(--color-text-muted);margin-bottom:0.3rem';
  const commentInput = document.createElement('textarea');
  commentInput.className = 'form-input';
  commentInput.rows = 2;
  commentInput.style.resize = 'none';
  commentInput.placeholder = 'e.g. "Ran into them at the reunion"';
  commentLabel.appendChild(commentLabelText);
  commentLabel.appendChild(commentInput);
  content.appendChild(commentLabel);

  const logBtn = document.createElement('button');
  logBtn.type = 'button';
  logBtn.className = 'trunk-btn';
  logBtn.style.marginTop = '1rem';
  logBtn.textContent = 'Log selected';
  content.appendChild(logBtn);

  const { close } = showBottomSheet({ title: 'Gathering mode', content });

  logBtn.addEventListener('click', async () => {
    const now = Date.now();
    const comment = commentInput.value.trim() || null;
    const checked = listEl.querySelectorAll('input[type="checkbox"]:checked');
    const contacts = await getAllContacts(db);

    for (const cb of checked) {
      const contactId = cb.dataset.contactId;
      await addLog(db, contactId, now, comment);
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        await saveContact(db, { ...contact, lc: now });
      }
    }

    close();
    if (onDone) onDone();
  });
}

export async function renderHome(db, version = currentVersion) {
  currentVersion = version;
  const app = document.getElementById('app');
  app.innerHTML = '<div class="view-loading"><div class="view-loading-spinner"></div><span>Checking connections...</span></div>';

  let settings, allContacts, due, events, health, activeRules;
  try {
    settings = await getSettings(db);
    allContacts = await getAllContacts(db);
    due = getDueContacts(allContacts);
    events = getAnchorEvents(allContacts, new Date(), settings.eventRadarDays || 30);
    health = getConnectionHealth(allContacts);
    activeRules = checkGatheringRules(settings.gatheringRules || [], new Date());
  } catch (err) {
    console.error('Home rendering error:', err);
    alert('Failed to load Home view: ' + err.message);
    app.innerHTML = '<div style="padding: 2rem;">Error loading home: ' + err.message + '</div>';
    return;
  }

  app.innerHTML = '';


  // Header
  const header = document.createElement('div');

  header.className = 'view-header';

  const h1 = document.createElement('h1');
  h1.innerHTML = `Home <small class="version-tag">${currentVersion}</small>`;

  const headerRight = document.createElement('div');
  headerRight.className = 'view-header-right';

  const gearBtn = document.createElement('button');
  gearBtn.className = 'gear-btn';
  gearBtn.setAttribute('aria-label', 'Settings');
  gearBtn.textContent = '⚙️';
  gearBtn.addEventListener('click', () => navigate('settings'));
  headerRight.appendChild(gearBtn);

  header.appendChild(h1);
  header.appendChild(headerRight);
  app.appendChild(header);

  const content = document.createElement('div');
  content.className = 'view-content';

  // Gathering rules banner
  if (activeRules.length > 0) {
    const banner = document.createElement('div');
    banner.className = 'gathering-banner';
    const bannerText = document.createElement('span');
    bannerText.textContent = `You're gathering — ${activeRules.map(r => r.name).join(', ')}`;
    const gatherBannerBtn = document.createElement('button');
    gatherBannerBtn.type = 'button';
    gatherBannerBtn.className = 'gathering-banner-btn';
    gatherBannerBtn.textContent = 'Log everyone';
    gatherBannerBtn.addEventListener('click', () => showGatheringMode(db, due, () => renderHome(db)));
    banner.appendChild(bannerText);
    banner.appendChild(gatherBannerBtn);
    content.appendChild(banner);
  }



  // Health summary
  if (health.total > 0) {
    const healthGrid = document.createElement('div');
    healthGrid.className = 'health-grid';

    const stats = [
      { count: health.pct + '%', label: 'On track' },
      { count: health.upToDate, label: 'Up to date' },
      { count: health.overdue, label: 'Overdue' },
    ];

    stats.forEach(({ count, label }) => {
      const card = document.createElement('div');
      card.className = 'health-card';
      const countEl = document.createElement('div');
      countEl.className = 'health-card-count';
      countEl.textContent = count;
      const labelEl = document.createElement('div');
      labelEl.className = 'health-card-label';
      labelEl.textContent = label;
      card.appendChild(countEl);
      card.appendChild(labelEl);
      healthGrid.appendChild(card);
    });

    content.appendChild(healthGrid);
  }

  // --- Phase 6: Stewardship Dashboard ---
  // Scan all contacts for &steward.* tags to show who is curating which groups.
  const stewardMap = new Map(); // groupTag -> stewardName
  allContacts.forEach(c => {
    (c.t || []).forEach(tag => {
      if (tag.startsWith('&steward.')) {
        const group = `@${tag.replace('&steward.', '')}`;
        if (!stewardMap.has(group)) stewardMap.set(group, c.n);
      }
    });
  });

  if (stewardMap.size > 0) {
    const stewardSection = document.createElement('div');
    stewardSection.className = 'home-section';
    stewardSection.style.marginBottom = '1.5rem';

    const stewardLabel = document.createElement('div');
    stewardLabel.className = 'home-section-label';
    stewardLabel.textContent = 'Greatuncles';
    stewardSection.appendChild(stewardLabel);

    const stewardGrid = document.createElement('div');
    stewardGrid.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;';

    for (const [group, name] of stewardMap.entries()) {
      const chip = document.createElement('div');
      chip.className = 'layer-badge';
      chip.style.cssText = 'padding:0.4rem 0.75rem;background:var(--color-bg-elevated);border:1px solid var(--color-border);font-size:0.85rem;';
      chip.innerHTML = `<span style="opacity:0.6;margin-right:0.3rem;">${group}</span> <strong>${name}</strong>`;
      stewardGrid.appendChild(chip);
    }

    stewardSection.appendChild(stewardGrid);
    content.appendChild(stewardSection);
  }

  // Anchor events
  if (events.length > 0) {
    const section = document.createElement('div');
    section.className = 'home-section';

    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'home-section-label';
    sectionLabel.textContent = 'Radar';
    section.appendChild(sectionLabel);

    events.forEach(({ contact, type, daysUntil }) => {
      const row = document.createElement('div');
      row.className = 'event-row';

      const emoji = document.createElement('span');
      emoji.className = 'event-emoji';
      emoji.textContent = type === 'birthday' ? '🎂' : '💍';

      const info = document.createElement('div');
      info.className = 'event-info';

      const name = document.createElement('div');
      name.className = 'event-name';
      name.textContent = contact.n;

      const date = document.createElement('div');
      date.className = 'event-date';
      const key = type === 'birthday' ? 'bd' : 'av';
      const dateVal = contact[key];
      let age = '';
      if (settings.showAge && dateVal) {
        const md = getMonthDay(dateVal);
        if (md && md.year) {
          const now = new Date();
          const currentYear = now.getFullYear();
          let eventThisYear = new Date(currentYear, md.month, md.day);
          let targetYear = (eventThisYear < now) ? currentYear + 1 : currentYear;
          const a = targetYear - md.year;
          if (a > 0) {
            const suffix = (a % 10 === 1 && a !== 11) ? 'st' : 
                          (a % 10 === 2 && a !== 12) ? 'nd' :
                          (a % 10 === 3 && a !== 13) ? 'rd' : 'th';
            age = ` · ${a}${suffix}`;
          }
        }
      }
      
      const typeLabel = type === 'birthday' ? 'Birthday' : 'Anniversary';
      date.textContent = typeLabel + age + ' · ' + formatDaysUntil(daysUntil);

      info.appendChild(name);
      info.appendChild(date);
      row.appendChild(emoji);
      row.appendChild(info);

      row.addEventListener('click', () => navigate('contact-form', { contactId: contact.id }));
      section.appendChild(row);
    });

    content.appendChild(section);
  }

  // Due contacts
  const dueSection = document.createElement('div');
  dueSection.className = 'home-section';

  const dueSectionLabel = document.createElement('div');
  dueSectionLabel.className = 'home-section-label';
  dueSectionLabel.textContent = due.length > 0 ? 'Tending your circle' : 'Circle is nourished';
  dueSection.appendChild(dueSectionLabel);

  if (due.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No one is due for a check-in. Your smart reminders will appear here when it is time to stay in touch.';
    dueSection.appendChild(empty);
  } else {
    due.forEach(({ contact, daysOverdue }) => {
      const row = document.createElement('div');
      row.className = 'due-row';

      const info = document.createElement('div');
      info.className = 'due-row-info';

      const isLegacy = (contact.t || []).includes('&legacy');
      if (isLegacy) row.classList.add('due-row--legacy');

      const name = document.createElement('div');
      name.className = 'due-row-name';
      name.textContent = contact.n;

      if (isLegacy) {
        const dove = document.createElement('span');
        dove.className = 'legacy-icon';
        dove.textContent = '🕊️';
        name.appendChild(dove);
      }
      
      // Show alert if they have an upcoming event
      const upcoming = events.find(e => e.contact.id === contact.id);
      if (upcoming) {
        const alertIcon = document.createElement('span');
        alertIcon.style.marginLeft = '8px';
        alertIcon.style.fontSize = '1.1rem';
        alertIcon.textContent = upcoming.type === 'birthday' ? '🎂' : '💍';
        alertIcon.title = `Upcoming ${upcoming.type}`;
        name.appendChild(alertIcon);
      }

      const meta = document.createElement('div');
      meta.className = 'due-row-meta';
      
      const metaText = document.createElement('span');
      metaText.textContent = formatDaysOverdue(daysOverdue);
      meta.appendChild(metaText);

      const visibleTags = (contact.t || []).filter(t => t.startsWith('@') || t.startsWith('#'));
      if (visibleTags.length > 0) {
        const spacer = document.createElement('span');
        spacer.textContent = ' · ';
        spacer.style.opacity = '0.5';
        meta.appendChild(spacer);
        
        visibleTags.forEach(tag => {
          const pill = document.createElement('span');
          pill.className = 'layer-badge';
          pill.textContent = tag;
          pill.style.marginLeft = '4px';

          // If this tag has a steward, highlight it
          if (stewardMap.has(tag)) {
            pill.style.borderColor = 'var(--color-primary)';
            pill.style.borderWidth = '2px';
            pill.title = `${stewardMap.get(tag)} curates ${tag}`;
            pill.innerHTML = `${tag} <span style="font-size:0.7rem;margin-left:2px;">🛡️</span>`;
          }
          
          meta.appendChild(pill);
        });
      }

      info.appendChild(name);
      info.appendChild(meta);

      const rowBtns = document.createElement('div');
      rowBtns.className = 'due-row-btns';

      const logBtn = document.createElement('button');
      logBtn.type = 'button';
      logBtn.className = 'due-row-log-btn';
      logBtn.textContent = 'Log';
      logBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConnectedSheet(db, contact.id, () => renderHome(db));
      });

      const snoozeBtn = document.createElement('button');
      snoozeBtn.type = 'button';
      snoozeBtn.className = 'due-row-snooze-btn';
      snoozeBtn.textContent = 'Snooze';
      snoozeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const snoozeUntil = Date.now() + getSnoozeMs(settings);
        await saveContact(db, { ...contact, su: snoozeUntil, ua: Date.now() });
        renderHome(db);
      });

      rowBtns.appendChild(logBtn);
      rowBtns.appendChild(snoozeBtn);
      row.appendChild(info);
      row.appendChild(rowBtns);
      row.addEventListener('click', () => showContactProfile(db, contact, () => renderHome(db)));
      dueSection.appendChild(row);
    });

    // Gathering mode button
    const gatherBtn = document.createElement('button');
    gatherBtn.type = 'button';
    gatherBtn.className = 'gathering-btn';
    gatherBtn.textContent = 'Gathering mode';
    gatherBtn.addEventListener('click', () => showGatheringMode(db, due, () => renderHome(db)));
    dueSection.appendChild(gatherBtn);
  }

  content.appendChild(dueSection);
  app.appendChild(content);
}
