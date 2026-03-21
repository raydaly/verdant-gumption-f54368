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
import { exportSeedling, parseSeedling, encodeInvite, encodeGroup } from '../core/seedling.js';
import { APP_CONSTANTS } from '../core/constants.js';
import { navigate } from './router.js';
import { updateHorizonBar } from './components/horizon-bar.js';

function formatExportDate(ts) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function triggerDownload(json, filename) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  h1.textContent = 'Trunk';

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

  // Storage Persistence Status
  const storageSection = document.createElement('div');
  storageSection.className = 'trunk-section';

  const storageTitle = document.createElement('div');
  storageTitle.className = 'trunk-section-title';
  storageTitle.textContent = 'Data Safety (Storage Status)';
  storageSection.appendChild(storageTitle);

  const storageMeta = document.createElement('div');
  storageMeta.className = 'trunk-section-meta';
  storageMeta.textContent = 'Checking protection level...';
  storageSection.appendChild(storageMeta);

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(isPersisted => {
      if (isPersisted) {
        storageMeta.innerHTML = '<span class="layer-badge" style="background:#4CAF50;color:#FFF;">Protected from auto-deletion</span>';
      } else {
        storageMeta.textContent = 'Your data may be cleared by the browser if space runs low.';
        const persistBtn = document.createElement('button');
        persistBtn.className = 'trunk-btn trunk-btn--secondary';
        persistBtn.style.marginTop = '0.5rem';
        persistBtn.textContent = 'Enable Persistent Storage';
        
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

  content.appendChild(storageSection);

  // Export nudge
  if (showNudge) {
    const nudge = document.createElement('div');
    nudge.className = 'trunk-nudge';
    nudge.textContent = lastExport
      ? `Last backup was ${daysSinceExport} days ago. Consider exporting soon.`
      : 'You have not exported yet. Keep a backup of your data.';
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
  exportTitle.textContent = 'Export (Seedling)';

  const exportMeta = document.createElement('div');
  exportMeta.className = 'trunk-section-meta';
  exportMeta.textContent = 'Last exported: ' + formatExportDate(lastExport);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'trunk-btn';
  exportBtn.textContent = 'Export all contacts & logs';
  exportBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const logs = await getAllLogs(db);
    const json = exportSeedling(contacts, logs);
    const filename = `greatuncle-${new Date().toISOString().slice(0, 10)}.json`;

    triggerDownload(json, filename);
    setLastExportedAt(Date.now());
    resetDeletedSinceExport();
    exportMeta.textContent = 'Last exported: ' + formatExportDate(Date.now());
    updateHorizonBar(db);
  });

  exportSection.appendChild(exportTitle);
  exportSection.appendChild(exportMeta);
  exportSection.appendChild(exportBtn);

  // Share backup button (Web Share API with file)
  if (navigator.share) {
    const shareBackupBtn = document.createElement('button');
    shareBackupBtn.type = 'button';
    shareBackupBtn.className = 'trunk-btn trunk-btn--secondary';
    shareBackupBtn.textContent = 'Share backup…';
    shareBackupBtn.addEventListener('click', async () => {
      const contacts = await getAllContacts(db);
      const logs = await getAllLogs(db);
      const json = exportSeedling(contacts, logs);
      const filename = `greatuncle-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([json], filename, { type: 'application/json' });

      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Greatuncle Backup' });
        } else {
          await navigator.share({ title: 'Greatuncle Backup', text: json });
        }
        setLastExportedAt(Date.now());
        resetDeletedSinceExport();
        exportMeta.textContent = 'Last exported: ' + formatExportDate(Date.now());
      } catch (err) {
        if (err.name !== 'AbortError') {
          shareBackupBtn.textContent = 'Sharing not supported';
          setTimeout(() => { shareBackupBtn.textContent = 'Share backup…'; }, 3000);
        }
      }
    });
    exportSection.appendChild(shareBackupBtn);
  }

  // Print button
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'trunk-btn trunk-btn--secondary';
  printBtn.textContent = 'Print contact list';
  printBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const nonOwners = contacts
      .filter(c => !(c.tags || []).includes('&owner'))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    const printEl = document.createElement('div');
    printEl.className = 'print-contact-list';

    const title = document.createElement('h1');
    title.textContent = 'My Contacts';
    printEl.appendChild(title);

    nonOwners.forEach(c => {
      const row = document.createElement('div');
      row.className = 'print-contact-row';

      const name = document.createElement('div');
      name.className = 'print-contact-name';
      name.textContent = c.name;

      const details = document.createElement('div');
      details.className = 'print-contact-details';
      
      const visibleTags = (c.tags || []).filter(t => t.startsWith('@') || t.startsWith('#'));
      const parts = [c.phone, c.email, c.address].filter(Boolean);
      
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

  // Human-readable toggle
  const readableToggleRow = document.createElement('div');
  readableToggleRow.className = 'trunk-readable-row';

  const readableToggle = document.createElement('button');
  readableToggle.type = 'button';
  readableToggle.className = 'trunk-readable-toggle';
  readableToggle.textContent = 'View as human-readable JSON';

  const readableArea = document.createElement('textarea');
  readableArea.className = 'trunk-readable-area';
  readableArea.readOnly = true;
  readableArea.hidden = true;
  readableArea.spellcheck = false;

  let readableVisible = false;
  readableToggle.addEventListener('click', async () => {
    readableVisible = !readableVisible;
    readableArea.hidden = !readableVisible;
    readableToggle.textContent = readableVisible
      ? 'Hide JSON'
      : 'View as human-readable JSON';
    if (readableVisible && !readableArea.value) {
      const contacts = await getAllContacts(db);
      const logs = await getAllLogs(db);
      readableArea.value = exportSeedling(contacts, logs);
    }
  });

  readableToggleRow.appendChild(readableToggle);
  exportSection.appendChild(readableToggleRow);
  exportSection.appendChild(readableArea);

  content.appendChild(exportSection);

  // Import section
  const importSection = document.createElement('div');
  importSection.className = 'trunk-section';

  const importTitle = document.createElement('div');
  importTitle.className = 'trunk-section-title';
  importTitle.textContent = 'Import (Seedling)';

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
      await saveContact(db, contact);
      contactCount++;
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
  importSection.appendChild(importStatus);
  content.appendChild(importSection);

  // Share section
  const shareSection = document.createElement('div');
  shareSection.className = 'trunk-section';

  const shareTitle = document.createElement('div');
  shareTitle.className = 'trunk-section-title';
  shareTitle.textContent = 'Share';

  const shareMeta = document.createElement('div');
  shareMeta.className = 'trunk-section-meta';
  shareMeta.textContent = 'Share a contact or group via email.';

  // Collect all @group tags
  const groupTags = [];
  allContacts.forEach(c => {
    (c.tags || []).filter(t => t.startsWith('@')).forEach(t => {
      if (!groupTags.includes(t)) groupTags.push(t);
    });
  });
  groupTags.sort();

  const shareRow = document.createElement('div');
  shareRow.className = 'trunk-share-group';

  const shareSelect = document.createElement('select');
  shareSelect.className = 'trunk-share-select';

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Select a group or contact…';
  shareSelect.appendChild(defaultOpt);

  groupTags.forEach(tag => {
    const opt = document.createElement('option');
    opt.value = 'group:' + tag;
    opt.textContent = tag + ' (group)';
    shareSelect.appendChild(opt);
  });

  const nonOwners = allContacts.filter(c => !(c.tags || []).includes('&owner'));
  nonOwners.sort((a, b) => a.name.localeCompare(b.name));
  nonOwners.forEach(c => {
    const opt = document.createElement('option');
    opt.value = 'contact:' + c.id;
    opt.textContent = c.name;
    shareSelect.appendChild(opt);
  });

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'trunk-btn';
  shareBtn.style.marginBottom = '0';
  shareBtn.style.flex = '0 0 auto';
  shareBtn.style.width = 'auto';
  shareBtn.style.padding = '0.75rem 1rem';
  shareBtn.textContent = 'Share';

  shareBtn.addEventListener('click', async () => {
    const val = shareSelect.value;
    if (!val) return;

    let encoded, subject, body;
    let groupEmails = [];

    if (val.startsWith('group:')) {
      const tag = val.slice(6);
      const groupContacts = allContacts.filter(c =>
        !(c.tags || []).includes('&owner') && (c.tags || []).includes(tag)
      );
      if (groupContacts.length === 0) return;
      encoded = encodeGroup(groupContacts, tag);
      const base = window.location.origin + window.location.pathname;
      const url = `${base}?importGroup=${encodeURIComponent(encoded)}`;
      subject = `Greatuncle group: ${tag}`;
      body = `Here are my ${tag} contacts from Greatuncle:\n\n${url}`;
      
      // Collect emails for fallback mailto
      groupEmails = groupContacts.map(c => c.email).filter(Boolean);
      
    } else if (val.startsWith('contact:')) {
      const contactId = val.slice(8);
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) return;
      encoded = encodeInvite(contact);
      const base = window.location.origin + window.location.pathname;
      const url = `${base}?invite=${encodeURIComponent(encoded)}`;
      subject = `Contact: ${contact.name}`;
      body = `I'd like to share ${contact.name}'s contact info from Greatuncle:\n\n${url}`;
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
    const toField = groupEmails.join(',');
    window.location.href = `mailto:${toField}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  shareRow.appendChild(shareSelect);
  shareSection.appendChild(shareTitle);
  shareSection.appendChild(shareMeta);
  shareSection.appendChild(shareRow);
  shareSection.appendChild(shareBtn);
  content.appendChild(shareSection);

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
    `Contacts: ${allContacts.length}<br>` +
    `Interactions logged: ${allLogs.length}`;

  const diagDetail = document.createElement('div');
  diagDetail.className = 'trunk-diagnostics diag-detail';
  diagDetail.hidden = true;

  const dirtyCount = allContacts.filter(c => (c.tags || []).includes('&dirty')).length;
  const deletedIds = getDeletedSinceExport();
  const nonOwnerCount = allContacts.filter(c => !(c.tags || []).includes('&owner')).length;
  diagDetail.innerHTML =
    `Non-owner contacts: ${nonOwnerCount}<br>` +
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
  content.appendChild(diagSection);

  app.appendChild(content);
}
