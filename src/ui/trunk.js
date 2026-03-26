import { getAllContacts, saveContact } from '../storage/contacts.js';
import { getAllLogs, addLog } from '../storage/logs.js';
import {
  getSettings,
  getLastExportedAt,
  setLastExportedAt,
  resetDeletedSinceExport,
  setPendingImportNudge,
  getPendingImportNudge,
  getDeletedSinceExport,
} from '../storage/settings.js';
import { exportSeedling, parseSeedling, encodeInvite, encodeGroup, buildPayload, ingestContacts, decodeShareParam } from '../core/seedling.js';
import { APP_CONSTANTS } from '../core/constants.js';
import { navigate } from './router.js';
import { updateHorizonBar } from './components/horizon-bar.js';
import { sanitizeContact } from '../core/sanitizer.js';
import { renderOnboarding } from './onboarding.js';

function formatExportDate(ts) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function triggerDownload(json, filename) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

export async function renderTrunk(db) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const settings = await getSettings(db);
  const lastExport = getLastExportedAt();
  const daysSinceExport = lastExport
    ? Math.floor((Date.now() - lastExport) / 86400000)
    : null;
  const showNudge = daysSinceExport === null || daysSinceExport > (settings.exportReminderDays || 30);
  const hasPendingImport = getPendingImportNudge();

  const allContacts = await getAllContacts(db);
  const allLogs = await getAllLogs(db);

  // Header
  const header = document.createElement('div');
  header.className = 'view-header';

  const h1 = document.createElement('h1');
  h1.textContent = 'Backup';

  const gearBtn = document.createElement('button');
  gearBtn.className = 'gear-btn';
  gearBtn.setAttribute('aria-label', 'Settings');
  gearBtn.textContent = '⚙️';
  gearBtn.addEventListener('click', () => navigate('settings'));

  const headerRight = document.createElement('div');
  headerRight.className = 'view-header-right';
  headerRight.appendChild(gearBtn);

  header.appendChild(h1);
  header.appendChild(headerRight);
  app.appendChild(header);

  const content = document.createElement('div');
  content.className = 'view-content';
  let shareBtn; // Declare early for closure access

  // Share section (Pre-declare for Heritage Card scroll reference)
  const shareSection = document.createElement('div');
  shareSection.className = 'trunk-section';

  // Heritage (First Gift) Section
  const heritageCount = allContacts.filter(c => !(c.t || []).includes('&owner')).length;
  
  if (heritageCount > 0) {
    const heritageSection = document.createElement('div');
    heritageSection.className = 'trunk-section trunk-section--heritage';

    const hTitle = document.createElement('div');
    hTitle.className = 'trunk-section-title';
    hTitle.style.color = 'var(--color-action)';
    hTitle.textContent = 'Become the Source of Connection';

    const hMeta = document.createElement('div');
    hMeta.className = 'trunk-section-meta';
    hMeta.innerHTML = `
      A shared circle is a legacy in the making. You've nourished your world with <strong>${heritageCount} people</strong>. Now, you can pass on that blessing.
      <br><br>
      <em>"Become the Source: Create new groups and share them as a 'First Gift' to others, passing on the legacy of connection."</em>
    `;

    const giftBtn = document.createElement('button');
    giftBtn.className = 'trunk-btn';
    giftBtn.style.background = 'var(--color-amber)';
    giftBtn.style.color = '#121212';
    giftBtn.textContent = '🎁 Pass on the Gift';
    giftBtn.addEventListener('click', () => {
      shareSection.scrollIntoView({ behavior: 'smooth' });
    });

    heritageSection.appendChild(hTitle);
    heritageSection.appendChild(hMeta);
    heritageSection.appendChild(giftBtn);
    content.appendChild(heritageSection);
  }

  const shareTitle = document.createElement('div');
  shareTitle.className = 'trunk-section-title';
  shareTitle.textContent = 'Share';

  const shareMeta = document.createElement('div');
  shareMeta.className = 'trunk-section-meta';
  shareMeta.textContent = 'Share your circle securely with family and friends.';

  // Collect all @group tags
  const groupTags = [];
  allContacts.forEach(c => {
    (c.t || []).filter(t => t.startsWith('@')).forEach(t => {
      if (!groupTags.includes(t)) groupTags.push(t);
    });
  });
  groupTags.sort();

  const ownerRecord = allContacts.find(c => (c.t || []).includes('&owner'));
  const senderName = ownerRecord ? ownerRecord.n : 'Someone';

  const shareRow = document.createElement('div');
  shareRow.className = 'trunk-share-group';
  shareRow.style.flexDirection = 'column';
  shareRow.style.alignItems = 'stretch';
  shareRow.style.gap = '0.75rem';

  const shareModeSelect = document.createElement('select');
  shareModeSelect.className = 'trunk-share-select';
  shareModeSelect.style.width = '100%';
  
  const modeOpt0 = document.createElement('option');
  modeOpt0.value = '';
  modeOpt0.textContent = '1. What would you like to share?';
  shareModeSelect.appendChild(modeOpt0);

  const modeOpt1 = document.createElement('option');
  modeOpt1.value = 'group';
  modeOpt1.textContent = 'Share a Group (@tag)';
  shareModeSelect.appendChild(modeOpt1);

  const modeOpt2 = document.createElement('option');
  modeOpt2.value = 'person';
  modeOpt2.textContent = 'Share a Single Person';
  shareModeSelect.appendChild(modeOpt2);

  const groupSelect = document.createElement('select');
  groupSelect.className = 'trunk-share-select';
  groupSelect.style.width = '100%';
  groupSelect.style.display = 'none';
  
  const groupOpt0 = document.createElement('option');
  groupOpt0.value = '';
  groupOpt0.textContent = 'Select a group…';
  groupSelect.appendChild(groupOpt0);
  
  groupTags.forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    groupSelect.appendChild(opt);
  });

  const personSearch = document.createElement('input');
  personSearch.type = 'text';
  personSearch.className = 'trunk-share-select';
  personSearch.placeholder = 'Search by name…';
  personSearch.style.width = '100%';
  personSearch.style.display = 'none';
  personSearch.setAttribute('list', 'share-people-list');

  const personList = document.createElement('datalist');
  personList.id = 'share-people-list';
  const nonOwners = allContacts.filter(c => !(c.t || []).includes('&owner'));
  nonOwners.sort((a, b) => (a.n || '').localeCompare(b.n || ''));
  nonOwners.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.n;
    personList.appendChild(opt);
  });

  const sizeWarning = document.createElement('div');
  sizeWarning.className = 'trunk-section-meta';
  sizeWarning.style.color = '#B45309'; // Amber
  sizeWarning.style.backgroundColor = '#FFFBEB';
  sizeWarning.style.padding = '0.5rem';
  sizeWarning.style.borderRadius = 'var(--radius-s)';
  sizeWarning.style.marginTop = '0.5rem';
  sizeWarning.style.display = 'none';
  sizeWarning.style.fontSize = '0.85rem';

  const recipientContainer = document.createElement('div');
  recipientContainer.style.display = 'none';
  recipientContainer.style.flexDirection = 'column';
  
  const recipientTitle = document.createElement('div');
  recipientTitle.textContent = '2. Who is this for?';
  recipientTitle.style.marginBottom = '0.5rem';
  recipientTitle.style.fontSize = '0.9rem';
  recipientTitle.style.opacity = '0.8';

  const recipientChips = document.createElement('div');
  recipientChips.style.display = 'flex';
  recipientChips.style.flexWrap = 'wrap';
  recipientChips.style.gap = '0.5rem';
  recipientChips.style.marginBottom = '0.5rem';

  const recipientInput = document.createElement('input');
  recipientInput.type = 'text';
  recipientInput.className = 'trunk-share-select';
  recipientInput.placeholder = 'Type a name...';
  recipientInput.style.width = '100%';
  recipientInput.style.display = 'none';
  recipientInput.setAttribute('list', 'share-recipients-list');

  const datalist = document.createElement('datalist');
  datalist.id = 'share-recipients-list';
  nonOwners.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.n;
    datalist.appendChild(opt);
  });
  
  recipientContainer.appendChild(recipientTitle);
  recipientContainer.appendChild(recipientChips);
  recipientContainer.appendChild(recipientInput);
  recipientContainer.appendChild(datalist);
  recipientContainer.appendChild(sizeWarning);

  // Helper to get active selection
  const getShareValue = () => {
    const mode = shareModeSelect.value;
    if (mode === 'group' && groupSelect.value) return 'group:' + groupSelect.value;
    if (mode === 'person' && personSearch.value) {
      const p = nonOwners.find(c => (c.n || '').toLowerCase() === personSearch.value.toLowerCase());
      if (p) return 'contact:' + p.id;
    }
    return null;
  };

  let currentPayload = null;
  let currentEncoded = null;
  let viewMode = 'code'; // 'code' or 'json'

  const updateCodeGen = () => {
    const val = getShareValue();
    if (!val) {
      if (typeof codeArea !== 'undefined') codeArea.value = '';
      if (typeof copyCodeBtn !== 'undefined') copyCodeBtn.disabled = true;
      if (typeof toggleViewBtn !== 'undefined') toggleViewBtn.disabled = true;
      if (shareBtn) shareBtn.disabled = true;
      return;
    }

    let payload, encoded;
    const recipientName = recipientInput.value.trim() || null;

    if (val.startsWith('group:')) {
      const tag = val.slice(6);
      const groupContacts = allContacts.filter(c =>
        !(c.t || []).includes('&owner') && (c.t || []).includes(tag)
      );
      if (groupContacts.length === 0) return;
      payload = buildPayload('group', { groupTag: tag, contacts: groupContacts }, senderName, recipientName);
      encoded = encodeGroup(groupContacts, tag, senderName, recipientName);
    } else if (val.startsWith('contact:')) {
      const contactId = val.slice(8);
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) return;
      payload = buildPayload('contact', { contact }, senderName, recipientName);
      encoded = encodeInvite(contact, senderName, recipientName);
    }

    currentPayload = payload;
    currentEncoded = encoded;
    if (typeof codeArea !== 'undefined') {
      codeArea.value = viewMode === 'code' ? encoded : JSON.stringify(payload, null, 2);
    }
    if (typeof copyCodeBtn !== 'undefined') copyCodeBtn.disabled = false;
    if (typeof toggleViewBtn !== 'undefined') toggleViewBtn.disabled = false;
    if (shareBtn) shareBtn.disabled = false;
  };

  shareModeSelect.addEventListener('change', () => {
    const mode = shareModeSelect.value;
    groupSelect.style.display = mode === 'group' ? 'block' : 'none';
    personSearch.style.display = mode === 'person' ? 'block' : 'none';
    groupSelect.value = '';
    personSearch.value = '';
    updateRecipientUI();
  });

  const updateRecipientUI = () => {
    const val = getShareValue();
    recipientChips.innerHTML = '';
    recipientInput.value = '';
    recipientInput.style.display = 'none';
    sizeWarning.style.display = 'none';
    
    if (!val) {
      recipientContainer.style.display = 'none';
      return;
    }
    
    recipientContainer.style.display = 'flex';
    let suggestedMembers = [];

    if (val.startsWith('group:')) {
      const tag = val.slice(6);
      suggestedMembers = allContacts.filter(c => !(c.t || []).includes('&owner') && (c.t || []).includes(tag));
      
      if (suggestedMembers.length > 40) {
        sizeWarning.style.display = 'block';
        sizeWarning.innerHTML = `<strong>⚠️ This group is large (${suggestedMembers.length} people).</strong> Links may break in some email apps. Consider sharing smaller topic groups or using Export JSON.`;
      }
    }

    const createChip = (label, isInputTrigger = false) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'layer-badge'; // Reuse existing style
      btn.style.cursor = 'pointer';
      btn.style.border = '1px solid var(--color-border)';
      btn.style.background = 'var(--color-bg)';
      btn.style.color = 'var(--color-text)';
      btn.textContent = label;
      
      btn.onclick = () => {
        // Deselect others visually
        Array.from(recipientChips.children).forEach(child => {
          child.style.background = 'var(--color-bg)';
          child.style.color = 'var(--color-text)';
        });
        btn.style.background = 'var(--color-primary)';
        btn.style.color = 'var(--color-white)';
        
        if (isInputTrigger) {
          recipientInput.style.display = 'block';
          recipientInput.focus();
          recipientInput.value = '';
        } else {
          recipientInput.style.display = 'none';
          recipientInput.value = label;
        }
        
        if (typeof updateCodeGen === 'function') updateCodeGen();
      };
      return btn;
    };

    suggestedMembers.forEach(m => {
      recipientChips.appendChild(createChip(m.n));
    });

    const otherBtn = createChip('Someone else...', true);
    recipientChips.appendChild(otherBtn);
    
    // Trigger update immediately to clear state
    updateCodeGen();
  };

  groupSelect.addEventListener('change', updateRecipientUI);
  personSearch.addEventListener('input', updateRecipientUI);
  recipientInput.addEventListener('input', updateCodeGen);

  const shareActionRow = document.createElement('div');
  shareActionRow.style.display = 'block'; // Block or flex width 100%
  shareActionRow.style.marginTop = '0.5rem';

  shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'trunk-btn trunk-btn--primary';
  shareBtn.style.marginBottom = '0';
  shareBtn.style.width = '100%';
  shareBtn.textContent = 'Share Link';
  shareBtn.disabled = true; // Disabled by default
  shareActionRow.appendChild(shareBtn);

  shareBtn.addEventListener('click', async () => {
    const val = getShareValue();
    if (!val) return;
    
    const recipientName = recipientInput.value.trim() || null;
    let recipientEmail = null;
    if (recipientName) {
      const rec = allContacts.find(c => (c.n || '').toLowerCase() === recipientName.toLowerCase());
      if (rec && rec.em) recipientEmail = rec.em;
    }

    let encoded, subject, body;
    let groupEmails = [];

    if (val.startsWith('group:')) {
      const tag = val.slice(6);
      const groupContacts = allContacts.filter(c =>
        !(c.t || []).includes('&owner') && (c.t || []).includes(tag)
      );
      if (groupContacts.length === 0) return;
      encoded = encodeGroup(groupContacts, tag, senderName, recipientName);
      const base = window.location.origin + window.location.pathname;
      const url = `${base}?invite=${encodeURIComponent(encoded)}`;
      subject = `Sharing Greatuncle Circle: ${tag}`;
      body = `I'm using Greatuncle to stay connected with the people who matter most. It's a private, local-first app for staying in touch. When you click, you'll get instant access to the address book and a shared birthday/milestone calendar for our (${tag}) group. No login, no cloud, just connection.\n\nIf you have any concerns let me know. Obviously I use it and would not have shared it with you unless I thought it was safe and private.\n\n${url}`;
      
      // Collect emails for fallback mailto
      groupEmails = groupContacts.map(c => c.em).filter(Boolean);
      
    } else if (val.startsWith('contact:')) {
      const contactId = val.slice(8);
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) return;
      encoded = encodeInvite(contact, senderName, recipientName);
      const base = window.location.origin + window.location.pathname;
      const url = `${base}?invite=${encodeURIComponent(encoded)}`;
      subject = `Greatuncle Contact: ${contact.n}`;
      body = `I'm using Greatuncle to stay connected with the people who matter most. It's a private, local-first app for staying in touch. I'd like to share ${contact.n}'s contact info with you. When you click, you'll get instant access to their details and milestone info. No login, no cloud, just connection.\n\nIf you have any concerns let me know. Obviously I use it and would not have shared it with you unless I thought it was safe and private.\n\n${url}`;
    } else {
      return;
    }

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: subject,
          text: body
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled
        console.log('Web share failed, falling back to mailto:', err);
      }
    }

    // Fallback: mailto
    const toField = recipientEmail ? recipientEmail : groupEmails.join(',');
    window.location.href = `mailto:${toField}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  shareRow.appendChild(shareModeSelect);
  shareRow.appendChild(groupSelect);
  shareRow.appendChild(personSearch);
  shareRow.appendChild(personList);
  shareRow.appendChild(recipientContainer);
  if (ownerRecord) {
    shareSection.appendChild(shareTitle);
    shareSection.appendChild(shareMeta);
    shareSection.appendChild(shareRow);
    shareSection.appendChild(shareActionRow);

    // New: Secret Code Generator (Glass Box)
    const codeDivider = document.createElement('div');
    codeDivider.className = 'trunk-section-meta';
    codeDivider.style.margin = '1.5rem 0 0.5rem 0';
    codeDivider.style.textAlign = 'center';
    codeDivider.textContent = '— OR —';
    shareSection.appendChild(codeDivider);

    const codeArea = document.createElement('textarea');
    codeArea.className = 'trunk-readable-area';
    codeArea.placeholder = 'Select a contact above to generate a connection code…';
    codeArea.rows = 4;
    codeArea.readOnly = true;
    shareSection.appendChild(codeArea);

    const codeActionRow = document.createElement('div');
    codeActionRow.style.display = 'flex';
    codeActionRow.style.flexDirection = 'column'; // Stack buttons for better stability
    codeActionRow.style.gap = '8px';
    codeActionRow.style.marginTop = '0.5rem';

    const copyCodeBtn = document.createElement('button');
    copyCodeBtn.className = 'trunk-btn trunk-btn--secondary';
    copyCodeBtn.textContent = 'Copy Code';
    copyCodeBtn.disabled = true;

    const toggleViewBtn = document.createElement('button');
    toggleViewBtn.className = 'trunk-btn trunk-btn--secondary';
    toggleViewBtn.textContent = 'View JSON';
    toggleViewBtn.disabled = true;

    codeActionRow.appendChild(copyCodeBtn);
    codeActionRow.appendChild(toggleViewBtn);
    shareSection.appendChild(codeActionRow);

    toggleViewBtn.addEventListener('click', () => {
      viewMode = viewMode === 'code' ? 'json' : 'code';
      toggleViewBtn.textContent = viewMode === 'code' ? 'View JSON' : 'View Code';
      updateCodeGen();
    });

    copyCodeBtn.addEventListener('click', async () => {
      if (!currentEncoded) return;
      await navigator.clipboard.writeText(currentEncoded);
      const oldText = copyCodeBtn.textContent;
      copyCodeBtn.textContent = 'Copied!';
      setTimeout(() => { copyCodeBtn.textContent = oldText; }, 2000);
    });
  } else {
    // Simpler share placeholder for guests
    shareSection.appendChild(shareTitle);
    const nudge = document.createElement('div');
    nudge.className = 'trunk-section-meta';
    nudge.textContent = 'Claim your circle by saving a backup to unlock sharing with others.';
    shareSection.appendChild(nudge);
  }
  // Storage Persistence Status
  const storageSection = document.createElement('div');
  storageSection.className = 'trunk-section';

  const storageTitle = document.createElement('div');
  storageTitle.className = 'trunk-section-title';
  storageTitle.textContent = ownerRecord ? 'Circle Safety (Local Status)' : 'Local Safety';
  storageSection.appendChild(storageTitle);

  const storageMeta = document.createElement('div');
  storageMeta.className = 'trunk-section-meta';
  storageMeta.textContent = 'Checking protection level...';
  storageSection.appendChild(storageMeta);

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(isPersisted => {
      if (isPersisted) {
        storageMeta.innerHTML = '<span class="layer-badge" style="background:#4CAF50;color:#FFF;">' + (ownerRecord ? 'Protected from auto-deletion' : 'Safe in your browser') + '</span>';
      } else {
        storageMeta.textContent = ownerRecord 
          ? 'Your data may be cleared by the browser if space runs low.' 
          : 'This browser may clear your contacts if its memory gets full.';
        const persistBtn = document.createElement('button');
        persistBtn.className = 'trunk-btn trunk-btn--secondary';
        persistBtn.style.marginTop = '0.5rem';
        persistBtn.textContent = ownerRecord ? 'Enable Persistent Storage' : 'Keep this circle safe';
        
        persistBtn.addEventListener('click', async () => {
          try {
            const granted = await navigator.storage.persist();
            if (granted) {
              storageMeta.innerHTML = '<span class="layer-badge" style="background:#4CAF50;color:#FFF;">Protected from auto-deletion</span>';
              persistBtn.remove();
            } else {
              persistBtn.textContent = 'Browser denied permission';
              persistBtn.disabled = true;
            }
          } catch (e) {
            console.error('Persist failed', e);
          }
        });
        
        storageSection.appendChild(persistBtn);
      }
    });
  } else {
    storageMeta.textContent = 'Persistent storage is not supported in this browser.';
  }

  // Export nudge
  if (showNudge) {
    const nudge = document.createElement('div');
    nudge.className = 'trunk-nudge';
    nudge.textContent = lastExport
      ? `Your circle was last rooted ${daysSinceExport} days ago. Consider a fresh seedling.`
      : 'You have not rooted your circle yet. Keep a seedling backup for safety.';
    content.appendChild(nudge);
  }

  // Import nudge
  if (hasPendingImport) {
    const importNudge = document.createElement('div');
    importNudge.className = 'trunk-nudge';
    importNudge.textContent = 'New contacts were recently imported.';
    content.appendChild(importNudge);
  }

  // Export section
  const exportSection = document.createElement('div');
  exportSection.className = 'trunk-section';

  const exportTitle = document.createElement('div');
  exportTitle.className = 'trunk-section-title';
  exportTitle.textContent = ownerRecord ? 'Root your Circle (Seedling)' : 'Save your Backup';

  const exportMeta = document.createElement('div');
  exportMeta.className = 'trunk-section-meta';
  exportMeta.textContent = lastExport
    ? 'Last backed up: ' + formatExportDate(lastExport)
    : (ownerRecord ? 'You have not rooted your circle yet. Keep a seedling backup for safety.' : 'Save your backup to claim this circle and unlock smart reminders to stay in touch.');

  const exportActionRow = document.createElement('div');
  exportActionRow.style.display = 'flex';
  exportActionRow.style.flexDirection = 'column';
  exportActionRow.style.gap = '0.75rem';
  exportActionRow.style.marginTop = '0.75rem';

  // Helper to trigger claim workflow if guest just saved their data
  const checkAndClaim = () => {
    if (ownerRecord) return;
    setTimeout(() => {
      const tabBar = document.getElementById('tab-bar');
      if (tabBar) tabBar.setAttribute('hidden', '');
      document.querySelectorAll('.bottom-sheet-backdrop').forEach(el => el.remove());
      
      renderOnboarding(db, () => {
        window.location.hash = 'home';
        window.location.reload();
      });
    }, 1000); // Small delay to let the backup action finish visually
  };

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'trunk-btn trunk-btn--primary';
  exportBtn.style.width = '100%';
  exportBtn.textContent = 'Download Backup File';
  exportBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const logs = await getAllLogs(db);
    const json = exportSeedling(contacts, logs);
    const filename = `greatuncle-${new Date().toISOString().slice(0, 10)}.json`;

    triggerDownload(json, filename);
    setLastExportedAt(Date.now());
    resetDeletedSinceExport();
    exportMeta.textContent = 'Last backed up: ' + formatExportDate(Date.now());
    updateHorizonBar(db);
    checkAndClaim();
  });

  // Share backup button (Web Share API with file) - For Everyone (Email to self promise)
  const shareBackupBtn = document.createElement('button');
  shareBackupBtn.type = 'button';
  shareBackupBtn.className = 'trunk-btn trunk-btn--secondary';
  shareBackupBtn.style.width = '100%';
  shareBackupBtn.textContent = ownerRecord ? 'Share backup…' : 'Email or Save to Self…';
  shareBackupBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const logs = await getAllLogs(db);
    const json = exportSeedling(contacts, logs);
    const filename = `greatuncle-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Greatuncle Backup' });
      } else if (navigator.share) {
        await navigator.share({ title: 'Greatuncle Backup', text: json });
      } else {
        // Fallback for browsers without Web Share API
        const mailtoLink = `mailto:?subject=${encodeURIComponent('Greatuncle Backup')}&body=${encodeURIComponent(json)}`;
        window.location.href = mailtoLink;
      }
      setLastExportedAt(Date.now());
      resetDeletedSinceExport();
      exportMeta.textContent = 'Last backed up: ' + formatExportDate(Date.now());
      checkAndClaim();
    } catch (err) {
      if (err.name !== 'AbortError') {
        shareBackupBtn.textContent = 'Sharing not supported';
        setTimeout(() => { shareBackupBtn.textContent = ownerRecord ? 'Share backup…' : 'Email or Save to Self…'; }, 3000);
      }
    }
  });

  // Copy Backup Text Button (Replaces the hidden toggle)
  const copyBackupBtn = document.createElement('button');
  copyBackupBtn.type = 'button';
  copyBackupBtn.className = 'trunk-btn trunk-btn--secondary';
  copyBackupBtn.style.width = '100%';
  copyBackupBtn.textContent = 'Copy Backup Text (Notion, Notes)';
  copyBackupBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const logs = await getAllLogs(db);
    const json = exportSeedling(contacts, logs);
    
    try {
      await navigator.clipboard.writeText(json);
      const oldText = copyBackupBtn.textContent;
      copyBackupBtn.textContent = 'Copied to Clipboard!';
      setLastExportedAt(Date.now());
      resetDeletedSinceExport();
      exportMeta.textContent = 'Last backed up: ' + formatExportDate(Date.now());
      checkAndClaim();
      setTimeout(() => { copyBackupBtn.textContent = oldText; }, 2000);
    } catch (err) {
      console.error('Clipboard failed', err);
      copyBackupBtn.textContent = 'Copy failed';
    }
  });

  exportSection.appendChild(exportTitle);
  exportSection.appendChild(exportMeta);
  exportActionRow.appendChild(exportBtn);
  exportActionRow.appendChild(shareBackupBtn);
  exportActionRow.appendChild(copyBackupBtn);
  exportSection.appendChild(exportActionRow);

  // Print button
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'trunk-btn trunk-btn--secondary';
  printBtn.textContent = 'Print my Circle';
  printBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const nonOwners = contacts
      .filter(c => !(c.t || []).includes('&owner'))
      .sort((a, b) => (a.n || '').toLowerCase().localeCompare((b.n || '').toLowerCase()));

    const printEl = document.createElement('div');
    printEl.className = 'print-contact-list';

    const title = document.createElement('h1');
    title.textContent = 'My Circle';
    printEl.appendChild(title);

    nonOwners.forEach(c => {
      const row = document.createElement('div');
      row.className = 'print-contact-row';

      const name = document.createElement('div');
      name.className = 'print-contact-name';
      name.textContent = c.n;

      const details = document.createElement('div');
      details.className = 'print-contact-details';
      
      const visibleTags = (c.t || []).filter(t => t.startsWith('@') || t.startsWith('#'));
      const parts = [c.ph, c.em, c.ad].filter(Boolean);
      
      let detailsText = parts.join(' · ');
      if (visibleTags.length > 0) {
        if (detailsText) detailsText += ' · ';
        detailsText += visibleTags.join(', ');
      }
      
      details.textContent = detailsText;

      row.appendChild(name);
      if (detailsText) row.appendChild(details);
      printEl.appendChild(row);
    });

    document.body.appendChild(printEl);
    window.print();
    document.body.removeChild(printEl);
  });
  exportSection.appendChild(printBtn);

  // Import section
  const importSection = document.createElement('div');
  importSection.className = 'trunk-section';

  const importTitle = document.createElement('div');
  importTitle.className = 'trunk-section-title';
  importTitle.textContent = 'Nourish your Circle (Import)';

  const importMeta = document.createElement('div');
  importMeta.className = 'trunk-section-meta';
  importMeta.textContent = 'Import a previously exported Seedling JSON file.';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';

  const importLabel = document.createElement('label');
  importLabel.className = 'trunk-import-label';
  importLabel.textContent = 'Choose Seedling file to import';
  importLabel.appendChild(fileInput);

  const importStatus = document.createElement('div');
  importStatus.className = 'trunk-section-meta';

  async function processImport(importContacts, importLogs) {
    let contactCount = 0;
    let logCount = 0;
    for (const contact of importContacts) {
      const safe = sanitizeContact(contact);
      if (safe) {
        await saveContact(db, safe);
        contactCount++;
      }
    }
    for (const log of importLogs) {
      await addLog(db, log.contactId, log.timestamp, log.comment);
      logCount++;
    }
    setPendingImportNudge(false);
    importStatus.textContent = `Imported ${contactCount} contacts and ${logCount} interactions.`;
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const { contacts: importContacts, logs: importLogs } = parseSeedling(e.target.result);
        const existingContacts = await getAllContacts(db);
        const existingIds = new Set(existingContacts.map(c => c.id));
        const conflicts = importContacts.filter(c => existingIds.has(c.id));

        if (conflicts.length > 0) {
          importStatus.innerHTML = '';
          const conflictMsg = document.createElement('div');
          conflictMsg.className = 'trunk-conflict';
          conflictMsg.textContent = `${conflicts.length} contact(s) already exist in your data.`;

          const conflictBtns = document.createElement('div');
          conflictBtns.className = 'trunk-conflict-btns';

          const skipBtn = document.createElement('button');
          skipBtn.type = 'button';
          skipBtn.className = 'trunk-btn trunk-btn--secondary';
          skipBtn.textContent = 'Skip existing';

          const overwriteBtn = document.createElement('button');
          overwriteBtn.type = 'button';
          overwriteBtn.className = 'trunk-btn';
          overwriteBtn.textContent = 'Overwrite existing';

          skipBtn.addEventListener('click', async () => {
            conflictMsg.remove();
            conflictBtns.remove();
            await processImport(importContacts.filter(c => !existingIds.has(c.id)), importLogs);
          });

          overwriteBtn.addEventListener('click', async () => {
            conflictMsg.remove();
            conflictBtns.remove();
            await processImport(importContacts, importLogs);
          });

          conflictBtns.appendChild(skipBtn);
          conflictBtns.appendChild(overwriteBtn);
          importStatus.appendChild(conflictMsg);
          importStatus.appendChild(conflictBtns);
        } else {
          await processImport(importContacts, importLogs);
        }

        fileInput.value = '';
      } catch {
        importStatus.textContent = 'Import failed — not a valid Seedling file.';
      }
    };
    reader.readAsText(file);
  });

  importSection.appendChild(importTitle);
  importSection.appendChild(importMeta);
  importSection.appendChild(importLabel);

  // New: Paste Area (Nourish by Code)
  const pasteDivider = document.createElement('div');
  pasteDivider.className = 'trunk-section-meta';
  pasteDivider.style.margin = '1rem 0 0.5rem 0';
  pasteDivider.style.textAlign = 'center';
  pasteDivider.textContent = '— OR —';
  importSection.appendChild(pasteDivider);

  const pasteArea = document.createElement('textarea');
  pasteArea.className = 'trunk-readable-area';
  pasteArea.placeholder = 'Paste Connection Code or raw JSON here…';
  pasteArea.rows = 4;
  importSection.appendChild(pasteArea);
  
  const convertorLink = document.createElement('div');
  convertorLink.className = 'trunk-section-meta';
  convertorLink.style.marginTop = '0.4rem';
  convertorLink.style.fontSize = '0.75rem';
  convertorLink.style.opacity = '0.7';
  convertorLink.innerHTML = `💡 Need to transform a CSV or VCard? Use the <a href="/tools/contact_convertor.html" target="_blank" style="color:var(--color-primary);text-decoration:underline;">Contact Convertor</a>.`;
  importSection.appendChild(convertorLink);

  const auditBox = document.createElement('div');
  auditBox.className = 'trunk-section-meta';
  auditBox.style.marginTop = '0.5rem';
  auditBox.style.padding = '0.75rem';
  auditBox.style.background = 'var(--color-bg-elevated)';
  auditBox.style.border = '1px solid var(--color-border)';
  auditBox.style.borderRadius = 'var(--radius-m)';
  auditBox.style.display = 'none'; // Hidden until valid input
  importSection.appendChild(auditBox);

  const nourishBtn = document.createElement('button');
  nourishBtn.className = 'trunk-btn trunk-btn--primary';
  nourishBtn.style.marginTop = '1rem';
  nourishBtn.style.width = '100%';
  nourishBtn.style.display = 'none'; // Hidden until valid input
  nourishBtn.textContent = 'Nourish your Circle with these People';
  importSection.appendChild(nourishBtn);

  let pendingImportRecords = [];

  const updateAuditPreview = async (val) => {
    let cleanVal = val.trim();
    if (!cleanVal) {
      auditBox.style.display = 'none';
      nourishBtn.style.display = 'none';
      return;
    }

    // Smart Link Extractor: pull out the code from the URL if a full link is pasted
    if (cleanVal.includes('invite=')) {
      const parts = cleanVal.split('?');
      const query = parts[parts.length - 1];
      const params = new URLSearchParams(query);
      const invite = params.get('invite');
      if (invite) cleanVal = invite;
    } else if (cleanVal.includes('importGroup=')) {
      const parts = cleanVal.split('?');
      const query = parts[parts.length - 1];
      const params = new URLSearchParams(query);
      const grp = params.get('importGroup');
      if (grp) cleanVal = grp;
    }

    try {
      let payload;
      // Is it Base64?
      if (cleanVal.length > 50 && !cleanVal.startsWith('{') && !cleanVal.startsWith('[')) {
        payload = decodeShareParam(cleanVal);
      } else {
        payload = JSON.parse(cleanVal);
      }
      
      const existingContacts = await getAllContacts(db);
      const { contacts } = ingestContacts(payload, existingContacts);
      pendingImportRecords = contacts;

      if (contacts.length > 0) {
        auditBox.style.display = 'block';
        nourishBtn.style.display = 'block';
        const names = contacts.map(c => c.n).join(', ');
        auditBox.innerHTML = `
          <div style="color: var(--color-success); font-weight: 500; margin-bottom: 0.25rem;">✅ Sanctity Check Passed</div>
          <div style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 500;">Safe to import <strong>${contacts.length}</strong> people: ${names}</div>
        `;
      } else {
        auditBox.style.display = 'block';
        nourishBtn.style.display = 'none';
        auditBox.innerHTML = '<div style="color: var(--color-text-muted); font-weight: 500;">No new contacts found or everyone is already in your circle.</div>';
      }
    } catch (err) {
      console.error('Nourish Sanctity Check failed:', err);
      auditBox.style.display = 'block';
      nourishBtn.style.display = 'none';
      let msg = 'Wait, that code or JSON doesn\'t look quite right.';
      if (err instanceof SyntaxError) {
        msg = 'Invalid JSON: ' + err.message;
      } else if (err.message && err.message.includes('atob')) {
        msg = 'That doesn\'t seem to be a valid connection code (Base64 error).';
      }
      auditBox.innerHTML = `<div style="color: var(--color-error-text);">${msg}</div>`;
    }
  };

  pasteArea.addEventListener('input', (e) => updateAuditPreview(e.target.value));

  nourishBtn.addEventListener('click', async () => {
    if (pendingImportRecords.length === 0) return;
    for (const record of pendingImportRecords) {
      await saveContact(db, record);
    }
    setPendingImportNudge(true);
    // Navigation to share-review is handled by the presence of &share contacts
    window.location.hash = 'people';
    window.location.reload(); // Force a refresh to catch the new imports
  });

  importSection.appendChild(importStatus);
  // (We'll append this after shareSection)




  // Diagnostics
  const diagSection = document.createElement('div');
  diagSection.className = 'trunk-section';

  const diagHeader = document.createElement('div');
  diagHeader.className = 'trunk-section-title diag-toggle-row';

  const diagTitleText = document.createElement('span');
  diagTitleText.textContent = 'Diagnostics';

  const diagToggleBtn = document.createElement('button');
  diagToggleBtn.type = 'button';
  diagToggleBtn.className = 'diag-toggle-btn';
  diagToggleBtn.textContent = 'Show details';

  diagHeader.appendChild(diagTitleText);
  diagHeader.appendChild(diagToggleBtn);

  const diagBasic = document.createElement('div');
  diagBasic.className = 'trunk-diagnostics';
  diagBasic.innerHTML =
    `Architect: ${ownerRecord ? ownerRecord.n : '<b>Not Claimed (Gallery Mode)</b>'}<br>` +
    `Contacts: ${allContacts.length}<br>` +
    `Interactions logged: ${allLogs.length}`;

  const diagDetail = document.createElement('div');
  diagDetail.className = 'trunk-diagnostics diag-detail';
  diagDetail.hidden = true;

  const dirtyCount = allContacts.filter(c => (c.t || []).includes('&dirty')).length;
  const deletedIds = getDeletedSinceExport();
  const totalNonOwners = allContacts.filter(c => !(c.t || []).includes('&owner')).length;
  diagDetail.innerHTML =
    `Claim status: ${ownerRecord ? 'Active' : 'Awaiting claim'}<br>` +
    `Non-owner contacts: ${totalNonOwners}<br>` +
    `Modified since last export: ${dirtyCount}<br>` +
    `Deleted since last export: ${deletedIds.length}<br>` +
    `Cache name: ${APP_CONSTANTS.CACHE_NAME}`;

  let detailVisible = false;
  diagToggleBtn.addEventListener('click', () => {
    detailVisible = !detailVisible;
    diagDetail.hidden = !detailVisible;
    diagToggleBtn.textContent = detailVisible ? 'Hide details' : 'Show details';
  });

  diagSection.appendChild(diagHeader);
  diagSection.appendChild(diagBasic);
  diagSection.appendChild(diagDetail);
  
  // Final Assembly
  content.appendChild(exportSection);
  content.appendChild(shareSection);
  content.appendChild(storageSection);
  content.appendChild(importSection);
  content.appendChild(diagSection);
  
  app.appendChild(content);
}
