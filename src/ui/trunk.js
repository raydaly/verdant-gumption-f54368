import { getAllContacts, saveContact, clearAllContacts, saveContactsBatch } from '../storage/contacts.js';
import { getAllLogs, addLog, clearAllLogs, saveLogsBatch } from '../storage/logs.js';
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
import { parseAnyInput, IMPORT_TYPE, compressPayload } from '../core/parser.js';
import { APP_CONSTANTS } from '../core/constants.js';
import { navigate } from './router.js';
import { updateHorizonBar } from './components/horizon-bar.js';
import { sanitizeContact } from '../core/sanitizer.js';
import { renderOnboarding } from './onboarding.js';

function formatExportDate(ts) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWrappedLink(code) {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `🌿 Greatuncle Update 🌿\nRooted: ${dateStr} · ${timeStr}\n${code}\n🌱 End of Update 🌱`;
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
  
  // Forward-declare UI elements for logic visibility
  let shareBtn, codeArea, copyCodeBtn, toggleViewBtn, codePreviewContainer;
  let viewMode = 'code'; // 'code' or 'json'
  let currentPayload = null;
  let currentEncoded = null;

  // --- THE BRIDGE (Sharing) ---
  const shareSection = document.createElement('div');
  shareSection.className = 'trunk-section';

  const shareTitle = document.createElement('div');
  shareTitle.className = 'trunk-section-title';
  shareTitle.textContent = '🎁 The Bridge: Pass on the Gift';
  shareSection.appendChild(shareTitle);

  const shareMeta = document.createElement('div');
  shareMeta.className = 'trunk-section-meta';
  const heritageCount = allContacts.filter(c => !(c.t || []).includes('&owner')).length;
  shareMeta.innerHTML = `
    Become the Source: You've nourished your world with <strong>${heritageCount} people</strong>. 
    Create a connection code to pass on the legacy of belonging. For your privacy, private notes and interaction history are NEVER sent through the bridge.
  `;
  shareSection.appendChild(shareMeta);

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
  modeOpt0.textContent = '1. Pick what to share...';
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

  const updateCodeGen = async () => {
    const val = getShareValue();
    if (!val) {
      if (codeArea) codeArea.value = '';
      if (copyCodeBtn) copyCodeBtn.disabled = true;
      if (toggleViewBtn) toggleViewBtn.disabled = true;
      if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.className = 'trunk-btn trunk-btn--secondary';
      }
      if (codePreviewContainer) codePreviewContainer.style.display = 'none';
      return;
    }

    if (codePreviewContainer) codePreviewContainer.style.display = 'block';

    let payload, encoded;
    const recipientName = recipientInput.value.trim() || null;

    if (val.startsWith('group:')) {
      const tag = val.slice(6);
      const groupContacts = allContacts.filter(c =>
        !(c.t || []).includes('&owner') && (c.t || []).includes(tag)
      );
      if (groupContacts.length === 0) return;
      payload = buildPayload('group', { groupTag: tag, contacts: groupContacts }, senderName, recipientName);
      encoded = await encodeGroup(groupContacts, tag, senderName, recipientName);
    } else if (val.startsWith('contact:')) {
      const contactId = val.slice(8);
      const contact = allContacts.find(c => c.id === contactId);
      if (!contact) return;
      payload = buildPayload('contact', { contact }, senderName, recipientName);
      encoded = await encodeInvite(contact, senderName, recipientName);
    }

    currentPayload = payload;
    currentEncoded = encoded;

    if (codeArea) {
      codeArea.value = viewMode === 'code' ? encoded : JSON.stringify(payload, null, 2);
    }
    if (copyCodeBtn) copyCodeBtn.disabled = false;
    if (toggleViewBtn) toggleViewBtn.disabled = false;
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.className = 'trunk-btn trunk-btn--primary';
    }
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
        sizeWarning.innerHTML = `<strong>⚠️ This group is large (${suggestedMembers.length} people).</strong> Links may break in some email apps. Consider sharing smaller topic groups.`;
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

  shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'trunk-btn trunk-btn--secondary';
  shareBtn.style.marginTop = '0.5rem';
  shareBtn.style.width = '100%';
  shareBtn.textContent = 'Share Link';
  shareBtn.disabled = true;

  shareBtn.addEventListener('click', async () => {
    const getLatestLinkData = async () => {
      const val = getShareValue();
      if (!val) return null;
      
      const recipientName = recipientInput.value.trim() || null;
      let recipientEmail = null;
      if (recipientName) {
        const rec = allContacts.find(c => (c.n || '').toLowerCase() === recipientName.toLowerCase());
        if (rec && rec.em) recipientEmail = rec.em;
      }

      let encoded, shareUrl, subject, body, groupEmails = [];
      const appRoot = (window.location.origin.startsWith('http') ? window.location.origin : 'https://greatuncle.app') + '/';

      if (val.startsWith('group:')) {
        const tag = val.slice(6);
        const groupContacts = allContacts.filter(c => !(c.t || []).includes('&owner') && (c.t || []).includes(tag));
        if (groupContacts.length === 0) return null;
        encoded = await encodeGroup(groupContacts, tag, senderName, recipientName);
        shareUrl = `${appRoot}#invite=${encodeURIComponent(encoded)}`;
        subject = `Sharing Greatuncle Circle: ${tag}`;
        body = `I'm using Greatuncle to stay connected with the people who matter most. When you click, you'll get instant access to the address book and shared birthday calendar for our (${tag}) group. No login, no cloud, just connection.\n\n${formatWrappedLink(shareUrl)}`;
        groupEmails = groupContacts.map(c => c.em).filter(Boolean);
      } else if (val.startsWith('contact:')) {
        const contactId = val.slice(8);
        const contact = allContacts.find(c => c.id === contactId);
        if (!contact) return null;
        encoded = await encodeInvite(contact, senderName, recipientName);
        shareUrl = `${appRoot}#invite=${encodeURIComponent(encoded)}`;
        subject = `Greatuncle Contact: ${contact.n}`;
        body = `I'd like to share ${contact.n}'s contact info with you on Greatuncle. When you click, you'll get instant access to their details and milestones.\n\n${formatWrappedLink(shareUrl)}`;
      }

      return { shareUrl, subject, body, recipientEmail, groupEmails };
    };

    // Handle Share Options
    const menu = document.createElement('div');
    menu.className = 'share-options-menu';
    menu.style.cssText = 'display:flex; gap:0.5rem; margin-top:0.75rem; flex-wrap:wrap;';

    const systemBtn = document.createElement('button');
    systemBtn.className = 'trunk-btn trunk-btn--secondary';
    systemBtn.style.flex = '1';
    systemBtn.textContent = 'Share via App';
    systemBtn.onclick = async () => {
      const data = await getLatestLinkData();
      if (!data) return;
      try {
        await navigator.share({ title: data.subject, text: data.body + '\n\n' + data.shareUrl });
      } catch (err) {
        if (err.name !== 'AbortError') alert('System share failed. Try Email or Copy Link.');
      }
    };

    const emailBtn = document.createElement('button');
    emailBtn.className = 'trunk-btn trunk-btn--secondary';
    emailBtn.style.flex = '1';
    emailBtn.textContent = 'Email';
    emailBtn.onclick = async () => {
      const data = await getLatestLinkData();
      if (!data) return;
      const toField = data.recipientEmail ? data.recipientEmail : data.groupEmails.join(',');
      const mailtoUrl = `mailto:${toField}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body + '\n\n' + data.shareUrl)}`;
      if (mailtoUrl.length > 2000) {
        alert('This update is too large for a direct email link. Please use "Copy Link" and paste it into your email instead.');
      } else {
        window.location.href = mailtoUrl;
      }
    };

    const copyBtn = document.createElement('button');
    copyBtn.className = 'trunk-btn trunk-btn--secondary';
    copyBtn.style.flex = '1';
    copyBtn.textContent = 'Copy Link';
    copyBtn.onclick = async () => {
      const data = await getLatestLinkData();
      if (!data) return;
      await navigator.clipboard.writeText(data.shareUrl);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
    };

    if (navigator.share) menu.appendChild(systemBtn);
    menu.appendChild(emailBtn);
    menu.appendChild(copyBtn);

    // Replace the specific "Share" button click area with this menu or append it
    shareSection.appendChild(menu);
    // Hide the generate button to avoid clutter once generated
    shareBtn.style.display = 'none';
  });

  shareRow.appendChild(shareModeSelect);
  shareRow.appendChild(groupSelect);
  shareRow.appendChild(personSearch);
  shareRow.appendChild(personList);
  shareRow.appendChild(recipientContainer);

  if (ownerRecord) {
    shareSection.appendChild(shareRow);
    shareSection.appendChild(shareBtn);

    codePreviewContainer = document.createElement('div');
    codePreviewContainer.style.display = 'none'; // Hidden until selection
    codePreviewContainer.style.marginTop = '1rem';
    
    codeArea = document.createElement('textarea');
    codeArea.className = 'trunk-readable-area';
    codeArea.placeholder = 'Connection Code...';
    codeArea.rows = 4;
    codeArea.readOnly = true;
    codePreviewContainer.appendChild(codeArea);

    const codeActionRow = document.createElement('div');
    codeActionRow.style.display = 'flex';
    codeActionRow.style.gap = '8px';
    codeActionRow.style.marginTop = '0.5rem';

    copyCodeBtn = document.createElement('button');
    copyCodeBtn.className = 'trunk-btn trunk-btn--secondary';
    copyCodeBtn.style.flex = '1';
    copyCodeBtn.textContent = 'Copy Code';
    copyCodeBtn.disabled = true;

    toggleViewBtn = document.createElement('button');
    toggleViewBtn.className = 'trunk-btn trunk-btn--secondary';
    toggleViewBtn.style.flex = '1';
    toggleViewBtn.textContent = 'View JSON';
    toggleViewBtn.disabled = true;

    codeActionRow.appendChild(copyCodeBtn);
    codeActionRow.appendChild(toggleViewBtn);
    codePreviewContainer.appendChild(codeActionRow);
    shareSection.appendChild(codePreviewContainer);

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
    const nudge = document.createElement('div');
    nudge.className = 'trunk-section-meta';
    nudge.textContent = 'Claim your circle by saving a backup to unlock sharing with others.';
    shareSection.appendChild(nudge);
  }

  // --- GREATUNCLE PUBLISHING DESK (Phase 5) ---
  // Only visible if the owner is stewarding at least one group.
  const stewardedGroups = [];
  if (ownerRecord) {
    (ownerRecord.t || []).forEach(tag => {
      if (tag.startsWith('&steward.')) {
        stewardedGroups.push(tag);
      }
    });
  }

  if (stewardedGroups.length > 0) {
    const publishSection = document.createElement('div');
    publishSection.className = 'trunk-section';

    const publishTitle = document.createElement('div');
    publishTitle.className = 'trunk-section-title';
    publishTitle.textContent = 'Greatuncle Publishing Desk';
    publishSection.appendChild(publishTitle);

    const publishMeta = document.createElement('div');
    publishMeta.className = 'trunk-section-meta';
    publishMeta.textContent = 'You are the Greatuncle for the following groups. Publish a fresh update to route future corrections back to you.';
    publishSection.appendChild(publishMeta);

    stewardedGroups.sort().forEach(stewardTag => {
      const groupName = stewardTag.replace('&steward.', '');
      const groupTag = `@${groupName}`;
      const groupContacts = allContacts.filter(c =>
        !(c.t || []).includes('&owner') && (c.t || []).includes(groupTag)
      );

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-top:1px solid var(--color-bg-accent);';

      const info = document.createElement('div');
      info.style.cssText = 'display:flex;flex-direction:column;gap:0.2rem;';

      const tagLabel = document.createElement('strong');
      tagLabel.textContent = groupTag;

      const countLabel = document.createElement('span');
      countLabel.style.cssText = 'font-size:0.8rem;opacity:0.6;';
      countLabel.textContent = `${groupContacts.length} ${groupContacts.length === 1 ? 'person' : 'people'}`;

      info.appendChild(tagLabel);
      info.appendChild(countLabel);

      const publishBtn = document.createElement('button');
      publishBtn.type = 'button';
      publishBtn.className = 'trunk-btn trunk-btn--secondary';
      publishBtn.style.cssText = 'padding:0.4rem 0.9rem;font-size:0.85rem;white-space:nowrap;';
      publishBtn.textContent = 'Publish Update';

      publishBtn.addEventListener('click', async () => {
        if (groupContacts.length === 0) {
          alert(`No contacts found in ${groupTag}.`);
          return;
        }
        
        const volunteerMeta = { phone: ownerRecord.ph || null, email: ownerRecord.em || null };
        const encoded = await encodeGroup(groupContacts, groupTag, senderName, null, volunteerMeta);
        const appRoot = (window.location.origin.startsWith('http') ? window.location.origin : 'https://greatuncle.app') + '/';
        const shareUrl = `${appRoot}#invite=${encodeURIComponent(encoded)}`;
        const subject = `Updated ${groupTag} Circle`;
        const body = `Hi! Here is the latest ${groupTag} address book.\n\n🌿 Greatuncle Update 🌿\n${shareUrl}\n🌱 End of Update 🌱`;

        // Create Share Menu for Publishing Desk
        publishBtn.style.display = 'none';
        
        const menu = document.createElement('div');
        menu.style.cssText = 'display:flex; gap:0.4rem;';

        const systemBtn = document.createElement('button');
        systemBtn.className = 'trunk-btn trunk-btn--secondary';
        systemBtn.style.cssText = 'padding:0.4rem 0.6rem; font-size:0.8rem;';
        systemBtn.textContent = 'Share';
        systemBtn.onclick = async () => {
          try {
            await navigator.share({ title: subject, text: body });
          } catch (e) { if (e.name !== 'AbortError') alert('Failed. Use Email/Copy.'); }
        };

        const emailBtn = document.createElement('button');
        emailBtn.className = 'trunk-btn trunk-btn--secondary';
        emailBtn.style.cssText = 'padding:0.4rem 0.6rem; font-size:0.8rem;';
        emailBtn.textContent = 'Email';
        emailBtn.onclick = () => {
          const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          if (mailtoUrl.length > 2000) {
            alert('Too large for direct Email link. Use Copy instead.');
          } else {
            window.location.href = mailtoUrl;
          }
        };

        const copyBtn = document.createElement('button');
        copyBtn.className = 'trunk-btn trunk-btn--secondary';
        copyBtn.style.cssText = 'padding:0.4rem 0.6rem; font-size:0.8rem;';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = async () => {
          await navigator.clipboard.writeText(shareUrl);
          const old = copyBtn.textContent;
          copyBtn.textContent = '✓';
          setTimeout(() => { copyBtn.textContent = old; }, 2000);
        };

        if (navigator.share) menu.appendChild(systemBtn);
        menu.appendChild(emailBtn);
        menu.appendChild(copyBtn);
        row.appendChild(menu);
      });

      row.appendChild(info);
      row.appendChild(publishBtn);
      publishSection.appendChild(row);
    });

    content.appendChild(publishSection);
  }

  // --- THE VAULT (Backups) ---

  const vaultSection = document.createElement('div');
  vaultSection.className = 'trunk-section';

  const vaultTitle = document.createElement('div');
  vaultTitle.className = 'trunk-section-title';
  vaultTitle.textContent = ownerRecord ? 'The Vault (Complete Backup)' : 'Save your Backup';
  vaultSection.appendChild(vaultTitle);

  const vaultMeta = document.createElement('div');
  vaultMeta.className = 'trunk-section-meta';
  vaultMeta.textContent = lastExport
    ? 'Last rooted in vault: ' + formatExportDate(lastExport)
    : (ownerRecord ? 'You have not rooted your circle yet. Keep a complete seedling backup for safety.' : 'Save your backup to claim this circle and unlock smart connections.');
  vaultSection.appendChild(vaultMeta);

  // Storage Persistence Status (Nested in Vault for context)
  const storageMeta = document.createElement('div');
  storageMeta.className = 'trunk-section-meta';
  storageMeta.style.marginTop = '0.5rem';
  storageMeta.textContent = 'Checking protection level...';
  vaultSection.appendChild(storageMeta);

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then(isPersisted => {
      if (isPersisted) {
        storageMeta.innerHTML = '<span class="layer-badge" style="background:var(--color-success);color:#FFF;">' + (ownerRecord ? 'Protected from auto-deletion' : 'Safe in your browser') + '</span>';
      } else {
        storageMeta.textContent = ownerRecord 
          ? 'Browser may clear data if space runs low.' 
          : 'Browser may clear contacts if memory gets full.';
        const persistBtn = document.createElement('button');
        persistBtn.className = 'trunk-btn trunk-btn--secondary';
        persistBtn.style.marginTop = '0.5rem';
        persistBtn.textContent = 'Protect this Circle';
        persistBtn.onclick = async () => {
          const granted = await navigator.storage.persist();
          if (granted) {
            storageMeta.innerHTML = '<span class="layer-badge" style="background:var(--color-success);color:#FFF;">Protected</span>';
            persistBtn.remove();
          }
        };
        vaultSection.appendChild(persistBtn);
      }
    });
  }

  const exportActionRow = document.createElement('div');
  exportActionRow.style.display = 'flex';
  exportActionRow.style.flexDirection = 'column';
  exportActionRow.style.gap = '8px';
  exportActionRow.style.marginTop = '1rem';

  const checkAndClaim = () => {
    if (ownerRecord) return;
    setTimeout(() => {
      const tabBar = document.getElementById('tab-bar');
      if (tabBar) tabBar.setAttribute('hidden', '');
      renderOnboarding(db, () => {
        window.location.hash = 'home';
        window.location.reload();
      });
    }, 1000);
  };

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'trunk-btn trunk-btn--secondary';
  exportBtn.style.width = '100%';
  exportBtn.textContent = 'Download Complete Seedling (.json)';
  exportBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const logs = await getAllLogs(db);
    const json = exportSeedling(contacts, logs);
    const filename = `greatuncle-${new Date().toISOString().slice(0, 10)}.json`;
    triggerDownload(json, filename);
    setLastExportedAt(Date.now());
    resetDeletedSinceExport();
    vaultMeta.textContent = 'Last rooted in vault: ' + formatExportDate(Date.now());
    updateHorizonBar(db);
    checkAndClaim();
  });

  const copyBackupBtn = document.createElement('button');
  copyBackupBtn.className = 'trunk-btn trunk-btn--secondary';
  copyBackupBtn.style.width = '100%';
  copyBackupBtn.textContent = 'Copy Vault Text (to Notes/Notion)';
  copyBackupBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const logs = await getAllLogs(db);
    const payload = {
      v: 5,
      ea: Date.now(),
      c: contacts,
      l: logs
    };
    const code = await compressPayload(payload);
    const wrapped = formatWrappedLink(code);
    await navigator.clipboard.writeText(wrapped);
    const old = copyBackupBtn.textContent;
    copyBackupBtn.textContent = 'Copied to Clipboard!';
    setLastExportedAt(Date.now());
    vaultMeta.textContent = 'Last rooted in vault: ' + formatExportDate(Date.now());
    checkAndClaim();
    setTimeout(() => { copyBackupBtn.textContent = old; }, 2000);
  });

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'trunk-btn trunk-btn--secondary';
  printBtn.textContent = 'Print my Circle';
  printBtn.onclick = async () => {
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
  };

  exportActionRow.appendChild(exportBtn);
  exportActionRow.appendChild(copyBackupBtn);
  exportActionRow.appendChild(printBtn);
  vaultSection.appendChild(exportActionRow);

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
      const safe = sanitizeContact(contact, true);
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
          overwriteBtn.className = 'trunk-btn trunk-btn--secondary';
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

  // Only show the file-upload option if the app already has data (not the primary entry point)
  if (heritageCount > 0) {
    importSection.appendChild(importLabel);
  }

  const pasteDivider = document.createElement('div');
  pasteDivider.className = 'trunk-section-meta';
  pasteDivider.style.margin = heritageCount > 0 ? '1rem 0 0.5rem 0' : '0 0 0.5rem 0';
  pasteDivider.style.textAlign = 'center';
  pasteDivider.textContent = heritageCount > 0 ? '— OR —' : '';
  importSection.appendChild(pasteDivider);

  const pasteArea = document.createElement('textarea');
  pasteArea.className = 'trunk-readable-area';
  pasteArea.placeholder = heritageCount > 0
    ? 'Paste a link, a code, or your backup text here…'
    : 'Paste your invite link or backup text here to get started. If your link was cut off, copy the whole message and paste it here.';
  pasteArea.rows = heritageCount > 0 ? 4 : 6;
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
  nourishBtn.className = 'trunk-btn trunk-btn--secondary';
  nourishBtn.style.marginTop = '1rem';
  nourishBtn.style.width = '100%';
  nourishBtn.style.display = 'none'; // Hidden until valid input
  nourishBtn.textContent = 'Nourish your Circle with these People';
  importSection.appendChild(nourishBtn);

  let pendingImportRecords = [];
  let resultTypeRef = null;
  let resultPayloadRef = null;

  const updateAuditPreview = async (val) => {
    const cleanVal = val.trim();
    if (!cleanVal) {
      auditBox.style.display = 'none';
      nourishBtn.style.display = 'none';
      return;
    }

    const result = await parseAnyInput(cleanVal);
    resultTypeRef = result.type;
    resultPayloadRef = result.payload;

    if (result.type === IMPORT_TYPE.CSV || result.type === IMPORT_TYPE.VCARD) {
      const formatLabel = result.type === IMPORT_TYPE.CSV ? 'CSV' : 'VCard';
      auditBox.style.display = 'block';
      nourishBtn.style.display = 'none';

      const aiPrompt = `I have a list of contacts I want to import into an app called Greatuncle.
Please convert them into a valid JSON array using only these fields:

  n   = Full name (required)
  ph  = Phone number (optional, keep formatting as-is)
  em  = Email address (optional)
  ad  = Street address (optional, single line: "123 Main St, Springfield, IL")
  zp  = ZIP / postal code (optional)
  bd  = Birthday in YYYY-MM-DD format (optional, omit if unknown)
  av  = Anniversary in YYYY-MM-DD format (optional, omit if unknown)

Rules:
- Output a JSON array and NOTHING ELSE. No explanation, no markdown, no code fences.
- Omit any key whose value is empty or unknown.
- If a name has separate First/Last columns, combine them into a single "n" field.
- If a birthday has no year, use 1900 as a placeholder year (e.g., 1900-07-04).
- Do not include any fields not listed above.

Here is my contact data:
[PASTE YOUR ${formatLabel} HERE]`;

      auditBox.innerHTML = '';

      const header = document.createElement('div');
      header.style.cssText = 'font-weight:600;font-size:0.95rem;margin-bottom:0.4rem;';
      header.textContent = `📋 ${formatLabel} detected — use AI to convert`;
      auditBox.appendChild(header);

      const privacy = document.createElement('div');
      privacy.style.cssText = 'font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.75rem;padding:0.4rem 0.6rem;background:rgba(245,158,11,0.1);border-radius:6px;border-left:3px solid #f59e0b;';
      privacy.innerHTML = '<strong>Privacy note:</strong> This sends your contacts to a third-party AI. Only use it with data you\'re comfortable sharing.';
      auditBox.appendChild(privacy);

      const steps = document.createElement('div');
      steps.style.cssText = 'font-size:0.85rem;margin-bottom:0.6rem;line-height:1.6;';
      steps.innerHTML = `
        <strong>1.</strong> Copy the prompt below.<br>
        <strong>2.</strong> Open an AI assistant and paste the prompt, then add your ${formatLabel} at the bottom.<br>
        <strong>3.</strong> Copy the JSON array the AI outputs and paste it back here.
      `;
      auditBox.appendChild(steps);

      const aiLinks = document.createElement('div');
      aiLinks.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;';
      [
        { label: '✦ ChatGPT', url: 'https://chat.openai.com' },
        { label: '✦ Claude', url: 'https://claude.ai' },
        { label: '✦ Gemini', url: 'https://gemini.google.com' },
      ].forEach(({ label, url }) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = label;
        a.style.cssText = 'font-size:0.8rem;color:var(--color-primary);text-decoration:none;border:1px solid var(--color-primary);border-radius:6px;padding:0.2rem 0.5rem;';
        aiLinks.appendChild(a);
      });
      auditBox.appendChild(aiLinks);

      const promptBox = document.createElement('textarea');
      promptBox.readOnly = true;
      promptBox.value = aiPrompt;
      promptBox.rows = 6;
      promptBox.style.cssText = 'width:100%;font-family:monospace;font-size:0.75rem;border:1px solid var(--color-bg-accent);border-radius:8px;padding:0.5rem;background:var(--color-bg);color:var(--color-text);resize:vertical;box-sizing:border-box;';
      auditBox.appendChild(promptBox);

      const copyPromptBtn = document.createElement('button');
      copyPromptBtn.className = 'trunk-btn trunk-btn--secondary';
      copyPromptBtn.style.cssText = 'margin-top:0.5rem;width:100%;';
      copyPromptBtn.textContent = 'Copy AI Prompt';
      copyPromptBtn.onclick = async () => {
        await navigator.clipboard.writeText(aiPrompt);
        copyPromptBtn.textContent = 'Copied! ✓';
        setTimeout(() => { copyPromptBtn.textContent = 'Copy AI Prompt'; }, 2500);
      };
      auditBox.appendChild(copyPromptBtn);

      const convertor = document.createElement('div');
      convertor.style.cssText = 'font-size:0.75rem;color:var(--color-text-muted);margin-top:0.75rem;text-align:center;';
      convertor.innerHTML = `Prefer a visual approach? Use the <a href="/tools/contact_convertor.html" target="_blank" style="color:var(--color-primary);text-decoration:underline;">Contact Convertor</a>.`;
      auditBox.appendChild(convertor);

      return;
    }

    if (result.type === IMPORT_TYPE.MANGLED) {
      auditBox.style.display = 'block';
      nourishBtn.style.display = 'none';
      auditBox.innerHTML = `<div style="color: var(--color-error-text);">⚠️ That link appears to have been cut off. Try copying the whole message (including the <strong>--- START GREATUNCLE LINK ---</strong> block) and paste it again.</div>`;
      return;
    }

    if (result.type === IMPORT_TYPE.UNKNOWN) {
      auditBox.style.display = 'block';
      nourishBtn.style.display = 'none';
      auditBox.innerHTML = `<div style="color: var(--color-text-muted);">That doesn't look like a Greatuncle link or backup. Try pasting the full invite message.</div>`;
      return;
    }

    if (result.type === IMPORT_TYPE.FULL_BACKUP) {
      const existingContacts = await getAllContacts(db);
      const hasExisting = existingContacts.filter(c => !(c.t || []).includes('&owner')).length > 0;

      auditBox.style.display = 'block';
      pendingImportRecords = result.payload.c || result.payload.contacts || [];

      if (hasExisting) {
        // Merge vs Overwrite choice
        nourishBtn.style.display = 'none';
        auditBox.innerHTML = `
          <div style="font-weight: 500; margin-bottom: 0.5rem;">📦 Full Backup Detected — ${result.contactCount} people</div>
          <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.75rem;">You already have people in your circle. How would you like to proceed?</div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button id="merge-btn" class="trunk-btn trunk-btn--secondary" style="flex:1;">Merge (add new, keep existing)</button>
            <button id="overwrite-btn" class="trunk-btn" style="flex:1;background:var(--color-error,#c0392b);color:#fff;">Replace everything</button>
          </div>
        `;
        auditBox.querySelector('#merge-btn').addEventListener('click', async () => {
          const existing = await getAllContacts(db);
          const contactUpdates = [];
          for (const c of pendingImportRecords) {
            const safe = sanitizeContact(c, true);
            if (safe && !existing.find(e => e.id === safe.id)) contactUpdates.push(safe);
          }
          await saveContactsBatch(db, contactUpdates);
          
          // Merge logs
          const backupLogs = result.payload.l || result.payload.logs || [];
          await saveLogsBatch(db, backupLogs);

          setPendingImportNudge(true);
          window.location.hash = 'people'; window.location.reload();
        });
        auditBox.querySelector('#overwrite-btn').addEventListener('click', async () => {
          await clearAllContacts(db);
          await clearAllLogs(db);
          const contactUpdates = [];
          for (const c of pendingImportRecords) {
            const safe = sanitizeContact(c, true);
            if (safe) contactUpdates.push(safe);
          }
          await saveContactsBatch(db, contactUpdates);
          
          const backupLogs = result.payload.l || result.payload.logs || [];
          await saveLogsBatch(db, backupLogs);

          setPendingImportNudge(true);
          window.location.hash = 'people'; window.location.reload();
        });
      } else {
        nourishBtn.style.display = 'block';
        nourishBtn.className = 'trunk-btn trunk-btn--primary';
        nourishBtn.textContent = `Restore ${result.contactCount} people into your Circle`;
        auditBox.innerHTML = `
          <div style="color: var(--color-success); font-weight: 500; margin-bottom: 0.25rem;">✅ Full Backup Detected</div>
          <div style="font-size: 0.85rem; color: var(--color-text-muted);">Ready to restore <strong>${result.contactCount}</strong> people.</div>
        `;
      }
      return;
    }

    // IMPORT_TYPE.INVITE — regular group or single contact invite
    if (result.type === IMPORT_TYPE.INVITE && result.contactCount > 0) {
      const existingContacts = await getAllContacts(db);
      const { contacts } = ingestContacts(result.payload, existingContacts);
      pendingImportRecords = contacts;

      auditBox.style.display = 'block';
      nourishBtn.style.display = contacts.length > 0 ? 'block' : 'none';
      if (contacts.length > 0) nourishBtn.className = 'trunk-btn trunk-btn--primary';
      nourishBtn.textContent = 'Nourish your Circle with these People';

      const names = contacts.map(c => c.n).join(', ');
      auditBox.innerHTML = contacts.length > 0
        ? `<div style="color: var(--color-success); font-weight: 500; margin-bottom: 0.25rem;">✅ Sanctity Check Passed</div>
           <div style="font-size: 0.85rem; color: var(--color-text-muted);">Safe to import <strong>${contacts.length}</strong> ${contacts.length === 1 ? 'person' : 'people'}: ${names}</div>`
        : `<div style="color: var(--color-text-muted); font-weight: 500;">No new contacts found — everyone is already in your circle.</div>`;
      return;
    }

    auditBox.style.display = 'none';
    nourishBtn.style.display = 'none';
  };

  pasteArea.addEventListener('input', (e) => updateAuditPreview(e.target.value));

  nourishBtn.addEventListener('click', async () => {
    if (pendingImportRecords.length === 0) return;
    const contactUpdates = [];
    for (const record of pendingImportRecords) {
      const safe = sanitizeContact(record, true);
      if (safe) contactUpdates.push(safe);
    }
    await saveContactsBatch(db, contactUpdates);

    // Handle logs if this was a full backup restoration in an empty app
    if (resultTypeRef === IMPORT_TYPE.FULL_BACKUP) {
      const backupLogs = resultPayloadRef.l || resultPayloadRef.logs || [];
      await saveLogsBatch(db, backupLogs);
    }
    setPendingImportNudge(true);
    window.location.hash = 'people';
    window.location.reload();
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
  content.appendChild(vaultSection);
  content.appendChild(shareSection);
  content.appendChild(importSection);
  content.appendChild(diagSection);
  
  app.appendChild(content);
}
