import { getOwner, saveContact, clearAllContacts, deleteContact, getAllContacts } from '../storage/contacts.js';
import { getSettings, saveSettings } from '../storage/settings.js';
import { clearAllLogs, deleteLogsForContact } from '../storage/logs.js';
import { goBack, navigate } from './router.js';
import { showConfirmDialog } from './components/confirm-dialog.js';

const LEVEL_TAGS = ['&level5', '&level15', '&level50', '&level150'];

export function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

let activeTab = 'settings'; 

export async function renderSettings(db) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const owner = await getOwner(db);
  const settings = await getSettings(db);
  const allContacts = await getAllContacts(db);

  const formView = document.createElement('div');
  formView.className = 'form-view';

  // --- Header ---
  const formHeader = document.createElement('div');
  formHeader.className = 'form-header';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'form-cancel-btn';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => goBack());

  const h1 = document.createElement('h1');
  h1.textContent = 'Settings';
  let devModeTaps = 0;
  h1.addEventListener('click', () => {
    devModeTaps++;
    if (devModeTaps >= 5) {
      devModeTaps = 0;
      const isEnabled = localStorage.getItem('developerMode') === '1';
      localStorage.setItem('developerMode', isEnabled ? '0' : '1');
      alert(isEnabled ? 'Developer Mode Disabled' : 'Developer Mode Enabled');
      renderSettings(db);
    }
  });

  const spacer = document.createElement('span');
  spacer.style.width = '4rem';

  formHeader.appendChild(backBtn);
  formHeader.appendChild(h1);
  formHeader.appendChild(spacer);
  formView.appendChild(formHeader);

  // --- Tab Switcher ---
  const tabs = document.createElement('div');
  tabs.className = 'settings-tabs';

  const settingsTab = document.createElement('button');
  settingsTab.className = `settings-tab-btn ${activeTab === 'settings' ? 'settings-tab-btn--active' : ''}`;
  settingsTab.textContent = 'Controls';
  settingsTab.onclick = () => { activeTab = 'settings'; renderSettings(db); };

  const visionTab = document.createElement('button');
  visionTab.className = `settings-tab-btn ${activeTab === 'vision' ? 'settings-tab-btn--active' : ''}`;
  visionTab.textContent = 'Vision';
  visionTab.onclick = () => { activeTab = 'vision'; renderSettings(db); };

  tabs.appendChild(settingsTab);
  tabs.appendChild(visionTab);
  formView.appendChild(tabs);

  // --- Body ---
  const formBody = document.createElement('div');
  formBody.className = 'form-body';

  if (activeTab === 'settings') {
    renderSettingsTab(db, formBody, owner, settings, allContacts);
  } else {
    renderVisionTab(db, formBody, allContacts);
  }

  formView.appendChild(formBody);
  app.appendChild(formView);
}

/**
 * Tab 1: Controls (The original settings form)
 */
async function renderSettingsTab(db, container, owner, settings, allContacts) {
  // --- My Profile ---
  const profileSection = document.createElement('div');
  profileSection.className = 'settings-section';
  const profileTitle = document.createElement('div');
  profileTitle.className = 'settings-section-title';
  profileTitle.textContent = 'My Profile';
  profileSection.appendChild(profileTitle);

  const nameField = makeField('Name', 'text', owner?.n);
  const phoneField = makeField('Phone', 'tel', owner?.ph);
  const emailField = makeField('Email', 'email', owner?.em);
  const tagsField = makeField('Tags (@group #topic)', 'text', owner?.t?.filter(t => !t.startsWith('&')).join(' '));
  tagsField.getInput().placeholder = 'e.g. @family #inner';

  const birthdayField = makeField('Birthday', 'date', owner?.bd);
  const anniversaryField = makeField('Anniversary', 'date', owner?.av);

  const saveProfileBtn = document.createElement('button');
  saveProfileBtn.className = 'trunk-btn';
  saveProfileBtn.textContent = 'Save profile';
  saveProfileBtn.onclick = async () => {
    if (!owner) return;

    const emailNode = emailField.getInput();
    if (emailNode.value && !emailNode.checkValidity()) {
      emailNode.reportValidity();
      return;
    }

    let safeName = nameField.getInput().value.trim() || owner.name;
    if (safeName) safeName = safeName.replace(/</g, '').substring(0, 100).trim();

    let safePhone = phoneField.getInput().value.trim() || null;
    if (safePhone) safePhone = safePhone.replace(/</g, '').substring(0, 50).trim();

    let safeEmail = emailField.getInput().value.trim() || null;
    if (safeEmail) safeEmail = safeEmail.replace(/</g, '').substring(0, 100).trim();

    const safeUserTags = tagsField.getInput().value.trim().split(/\s+/).filter(Boolean)
      .map(t => t.replace(/</g, '').substring(0, 50).trim())
      .filter(t => t && (t.startsWith('@') || t.startsWith('#')));

    const updated = {
      ...owner,
      n: safeName,
      ph: safePhone,
      em: safeEmail,
      bd: birthdayField.getInput().value || null,
      av: anniversaryField.getInput().value || null,
      t: [
        ...(owner.t || []).filter(t => t.startsWith('&')),
        ...safeUserTags
      ],
      ua: Date.now(),
    };
    await saveContact(db, updated);
    saveProfileBtn.textContent = 'Saved ✓';
    setTimeout(() => { saveProfileBtn.textContent = 'Save profile'; }, 2000);
  };

  profileSection.appendChild(nameField);
  profileSection.appendChild(phoneField);
  profileSection.appendChild(emailField);
  profileSection.appendChild(birthdayField);
  profileSection.appendChild(anniversaryField);
  profileSection.appendChild(tagsField);
  profileSection.appendChild(saveProfileBtn);
  container.appendChild(profileSection);

  // --- Appearance ---
  const appearanceSection = document.createElement('div');
  appearanceSection.className = 'settings-section';
  const appearanceTitle = document.createElement('div');
  appearanceTitle.className = 'settings-section-title';
  appearanceTitle.textContent = 'Appearance';
  appearanceSection.appendChild(appearanceTitle);

  const themeRow = document.createElement('div');
  themeRow.className = 'settings-row';
  const themeLabel = document.createElement('span');
  themeLabel.textContent = 'Theme';
  const themeSelect = document.createElement('select');
  themeSelect.className = 'form-input';
  themeSelect.style.width = 'auto';
  ['system', 'light', 'dark'].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    opt.selected = settings.theme === t;
    themeSelect.appendChild(opt);
  });
  themeSelect.addEventListener('change', async () => {
    const newTheme = themeSelect.value;
    await saveSettings(db, { theme: newTheme });
    applyTheme(newTheme);
  });
  themeRow.appendChild(themeLabel);
  themeRow.appendChild(themeSelect);
  appearanceSection.appendChild(themeRow);
  container.appendChild(appearanceSection);

  // --- Advanced ---
  const advancedSection = document.createElement('div');
  advancedSection.className = 'settings-section';
  const advancedTitle = document.createElement('div');
  advancedTitle.className = 'settings-section-title';
  advancedTitle.textContent = 'Advanced';
  advancedSection.appendChild(advancedTitle);

  const legacyRow = makeToggleRow('Track date of passing', settings.trackLegacy, (val) => saveSettings(db, { trackLegacy: val }));
  advancedSection.appendChild(legacyRow);

  const betaRow = makeToggleRow('Beta 2 (Enable Editing)', settings.betaMode, (val) => {
    saveSettings(db, { betaMode: val });
    showConfirmDialog({
      title: 'Beta mode changed',
      message: 'You may need to refresh the page to see all editing options unlocked.',
      confirmPhrase: 'RELOAD',
    }).then(ok => {
      if (ok) window.location.reload();
    });
  });
  advancedSection.appendChild(betaRow);
  container.appendChild(advancedSection);

  // --- Locale & Dates ---
  const localeSection = document.createElement('div');
  localeSection.className = 'settings-section';
  const localeTitle = document.createElement('div');
  localeTitle.className = 'settings-section-title';
  localeTitle.textContent = 'Locale & Dates';
  localeSection.appendChild(localeTitle);

  const formatRow = document.createElement('div');
  formatRow.className = 'settings-row';
  const formatLabel = document.createElement('span');
  formatLabel.textContent = 'Primary format';
  const formatSelect = document.createElement('select');
  formatSelect.className = 'form-input';
  formatSelect.style.width = 'auto';
  [
    { val: 'default', lbl: 'Browser default' },
    { val: 'mdy', lbl: 'Month/Day (USA)' },
    { val: 'dmy', lbl: 'Day/Month (Intl)' },
    { val: 'ymd', lbl: 'Year-Month-Day' }
  ].forEach(fmt => {
    const opt = document.createElement('option');
    opt.value = fmt.val;
    opt.textContent = fmt.lbl;
    opt.selected = settings.dateFormat === fmt.val;
    formatSelect.appendChild(opt);
  });
  formatSelect.addEventListener('change', async () => saveSettings(db, { dateFormat: formatSelect.value }));
  formatRow.appendChild(formatLabel);
  formatRow.appendChild(formatSelect);
  localeSection.appendChild(formatRow);

  const ageRow = makeToggleRow('Show age in milestones', settings.showAge, (val) => saveSettings(db, { showAge: val }));
  localeSection.appendChild(ageRow);
  container.appendChild(localeSection);

  // --- Developer Mode ---
  if (localStorage.getItem('developerMode') === '1') {
    const devSection = document.createElement('div');
    devSection.className = 'settings-section dev-mode-section';
    const devTitle = document.createElement('div');
    devTitle.className = 'settings-section-title';
    devTitle.textContent = 'Developer Mode';
    devSection.appendChild(devTitle);

    const bustBtn = document.createElement('button');
    bustBtn.className = 'trunk-btn trunk-btn--secondary';
    bustBtn.textContent = 'Bust Cache & Force Update';
    bustBtn.onclick = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) await reg.unregister();
      }
      window.location.reload(true);
    };
    devSection.appendChild(bustBtn);
    container.appendChild(devSection);
  }

  // --- Danger Zone ---
  const dangerSection = document.createElement('div');
  dangerSection.className = 'settings-section';
  const dangerTitle = document.createElement('div');
  dangerTitle.className = 'settings-section-title';
  dangerTitle.style.color = 'var(--color-amber)';
  dangerTitle.textContent = 'Danger Zone';
  dangerSection.appendChild(dangerTitle);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'trunk-btn trunk-btn--secondary';
  resetBtn.style.opacity = '0.7';
  resetBtn.textContent = 'Hard Reset App (Bust Cache)';
  resetBtn.onclick = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) await reg.unregister();
    }
    window.location.reload(true);
  };
  dangerSection.appendChild(resetBtn);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'trunk-btn trunk-btn--secondary';
  clearBtn.style.color = 'var(--color-amber)';
  clearBtn.textContent = 'Delete all contacts/history';
  clearBtn.onclick = async () => {
    const confirmed = await showConfirmDialog({
      title: 'Delete Everything?',
      message: 'This will wipe all contacts and history. This cannot be undone.',
      confirmPhrase: 'DELETE EVERYTHING'
    });
    if (confirmed) {
      await clearAllContacts(db);
      await clearAllLogs(db);
      window.location.reload();
    }
  };
  dangerSection.appendChild(clearBtn);
  container.appendChild(dangerSection);
}

/**
 * Tab 2: Vision (The Dunbar Bars and Magic Mike spirit)
 */
function renderVisionTab(db, container, allContacts) {
  const nonOwners = allContacts.filter(c => !(c.t || []).includes('&owner'));
  const totalLimit = 150;

  const intro = document.createElement('div');
  intro.className = 'vision-text';
  intro.innerHTML = `
    <p>A quick overview of your stewardship distribution by frequency.</p>
  `;
  container.appendChild(intro);

  // Dunbar Charts
  const chartsContainer = document.createElement('div');
  chartsContainer.className = 'dunbar-charts';

  const layers = [
    { tag: null,        label: 'Awaiting Stewardship', limit: null, desc: 'Not assigned a frequency' },
    { tag: '&level5',   label: 'Weekly',             limit: 5,   desc: 'Keep them close' },
    { tag: '&level15',  label: 'Monthly',            limit: 10,  desc: 'Regular roots' },
    { tag: '&level50',  label: 'Quarterly',          limit: 35,  desc: 'Steady connection' },
    { tag: '&level150', label: 'Annually',           limit: 100, desc: 'Yearly hello' },
  ];

  layers.forEach(layer => {
    let count;
    if (layer.tag === null) {
      // Unassigned: has no level tag
      count = nonOwners.filter(c => !LEVEL_TAGS.some(t => (c.t || []).includes(t))).length;
    } else {
      count = nonOwners.filter(c => (c.t || []).includes(layer.tag)).length;
    }
    
    const limit = layer.limit || nonOwners.length || 1;
    const percent = Math.min(100, (count / limit) * 100);
    const isOver = layer.limit && count > layer.limit;

    const item = document.createElement('div');
    item.className = 'chart-item';
    item.innerHTML = `
      <div class="chart-header">
        <span class="chart-label" style="font-weight: 700; text-transform: uppercase;">${layer.label}</span>
        <span class="chart-count">${count}${layer.limit ? ' / ' + layer.limit : ''}</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill ${isOver ? 'chart-bar-fill--warning' : ''}" style="width: ${percent}%; background: ${layer.tag === null ? 'var(--color-bg-accent)' : ''}"></div>
      </div>
      <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">${layer.desc}</div>
    `;
    chartsContainer.appendChild(item);
  });

  // Total Capacity Bar
  const totalCount = nonOwners.length;
  const totalPercent = Math.min(100, (totalCount / totalLimit) * 100);
  const totalOver = totalCount > totalLimit;

  const totalItem = document.createElement('div');
  totalItem.className = 'chart-item';
  totalItem.style.marginTop = '1rem';
  totalItem.style.paddingTop = '1rem';
  totalItem.style.borderTop = '1px solid var(--color-bg-accent)';
  totalItem.innerHTML = `
    <div class="chart-header">
      <span class="chart-label" style="font-weight: 800; color: var(--color-action);">TOTAL CIRCLE</span>
      <span class="chart-count">${totalCount} / ${totalLimit}</span>
    </div>
    <div class="chart-bar-bg" style="height: 12px;">
      <div class="chart-bar-fill ${totalOver ? 'chart-bar-fill--warning' : ''}" style="width: ${totalPercent}%; background: var(--color-action);"></div>
    </div>
    <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem; font-style: italic;">Research suggests 150 is the natural limit for stable, meaningful relationships.</div>
  `;
  chartsContainer.appendChild(totalItem);
  
  container.appendChild(chartsContainer);

  // Tag Directory
  const tagCounts = {};
  allContacts.forEach(contact => {
    (contact.t || []).forEach(tag => {
      if (!tag.startsWith('&')) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });

  const validTags = Object.keys(tagCounts).sort();

  if (validTags.length > 0) {
    const dirContainer = document.createElement('div');
    dirContainer.className = 'settings-section';
    dirContainer.style.marginTop = '2rem';
    dirContainer.style.background = 'transparent';
    dirContainer.style.border = 'none';

    const dirTitle = document.createElement('div');
    dirTitle.className = 'settings-section-title';
    dirTitle.textContent = 'Tag Directory';
    dirContainer.appendChild(dirTitle);

    const tagList = document.createElement('div');
    tagList.style.display = 'flex';
    tagList.style.flexWrap = 'wrap';
    tagList.style.gap = '0.5rem';

    validTags.forEach(tag => {
      const pill = document.createElement('div');
      pill.className = 'pill-btn';
      pill.style.display = 'inline-flex';
      pill.style.alignItems = 'center';
      pill.style.background = 'var(--color-bg-card)';
      pill.style.border = '1px solid var(--color-bg-accent)';
      
      const countPill = document.createElement('span');
      countPill.textContent = tagCounts[tag];
      countPill.style.background = 'var(--color-action)';
      countPill.style.color = 'white';
      countPill.style.padding = '0.1rem 0.4rem';
      countPill.style.borderRadius = '20px';
      countPill.style.fontSize = '0.7rem';
      countPill.style.marginLeft = '0.4rem';

      pill.textContent = tag;
      pill.appendChild(countPill);
      tagList.appendChild(pill);
    });

    dirContainer.appendChild(tagList);
    container.appendChild(dirContainer);
  }

  const spirit = document.createElement('div');
  spirit.className = 'vision-text';
  spirit.innerHTML = `
    <p>We believe in <strong>stability over signal</strong>. While social media thrives on "high-energy" spikes, resilient connection is the slow, organic work of consistent maintenance.</p>
  `;
  container.appendChild(spirit);

  const quote = document.createElement('div');
  quote.className = 'vision-quote';
  quote.innerHTML = `Stay rooted. Stay connected.<br>Dedicated to Great Uncle Mike.`;
  container.appendChild(quote);
}

// Helpers
function makeField(labelText, inputType, value) {
  const field = document.createElement('div');
  field.className = 'form-field';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const input = document.createElement('input');
  input.type = inputType;
  input.className = 'form-input';
  input.value = value || '';
  field.appendChild(lbl);
  field.appendChild(input);
  field.getInput = () => input;
  return field;
}

function makeToggleRow(label, checked, onToggle) {
  const row = document.createElement('div');
  row.className = 'settings-row';
  const lbl = document.createElement('span');
  lbl.className = 'settings-row-label';
  lbl.textContent = label;

  const toggle = document.createElement('div');
  toggle.className = 'settings-toggle';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked === true;
  checkbox.addEventListener('change', () => onToggle(checkbox.checked));
  toggle.appendChild(checkbox);

  row.appendChild(lbl);
  row.appendChild(toggle);
  return row;
}
