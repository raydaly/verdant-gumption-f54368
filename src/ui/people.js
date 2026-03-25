import { getAllContacts, saveContact } from '../storage/contacts.js';
import { getSettings } from '../storage/settings.js';
import { getSnoozeMs } from '../core/outreach-engine.js';
import { navigate } from './router.js';
import { showBottomSheet } from './components/bottom-sheet.js';
import { showConnectedSheet } from './components/connected-sheet.js';
import { showContactProfile } from './components/contact-profile.js';
import { encodeInvite, encodeGroup } from '../core/seedling.js';
import { performStewardshipRitual } from './stewardship.js';
import { getUpcomingMilestones, formatMilestoneDate } from '../core/milestone-engine.js';

const LEVEL_TAGS = ['&level5', '&level15', '&level50', '&level150'];

const LAYER_LABELS = {
  '&level5':   'Hearth',
  '&level15':  'Table',
  '&level50':  'Neighborhood',
  '&level150': 'Horizon',
};

// Module-level filter state — persists across in-session navigation
let filterState = { sort: 'az', layer: null, group: null };

function getLayerTag(tags) {
  return LEVEL_TAGS.find(t => tags.includes(t)) || null;
}

function applyFilterSort(contacts, state) {
  let result = [...contacts];

  if (state.layer) {
    result = result.filter(c => (c.t || []).includes(state.layer));
  }

  if (state.group) {
    result = result.filter(c => (c.t || []).includes(state.group));
  }

  switch (state.sort) {
    case 'za':
      result.sort((a, b) => (b.n || '').toLowerCase().localeCompare((a.n || '').toLowerCase()));
      break;
    case 'recent':
      result.sort((a, b) => {
        if (!a.lc) return 1;
        if (!b.lc) return -1;
        return new Date(b.lc) - new Date(a.lc);
      });
      break;
    case 'oldest':
      result.sort((a, b) => {
        if (!a.lc) return 1;
        if (!b.lc) return -1;
        return new Date(a.lc) - new Date(b.lc);
      });
      break;
    default: // 'az'
      result.sort((a, b) => (a.n || '').toLowerCase().localeCompare((b.n || '').toLowerCase()));
  }

  return result;
}

function isFilterActive(state) {
  return state.sort !== 'az' || state.layer !== null || state.group !== null;
}

function buildContactRow(contact, isOwner, db, onRefresh, hasAppOwner) {
  const li = document.createElement('li');
  li.className = 'contact-row';

  const info = document.createElement('div');
  info.className = 'contact-row-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'contact-row-name';
  nameRow.textContent = contact.n;

  if (isOwner) {
    const badge = document.createElement('span');
    badge.className = 'owner-badge';
    badge.textContent = '(YOU)';
    nameRow.appendChild(badge);
  }

  const isLegacy = (contact.t || []).includes('&legacy');
  if (isLegacy) {
    li.classList.add('contact-row--legacy');
    const dove = document.createElement('span');
    dove.className = 'legacy-icon';
    dove.textContent = '🕊️';
    nameRow.appendChild(dove);
  }

  const meta = document.createElement('div');
  meta.className = 'contact-row-meta';

  const visibleTags = (contact.t || []).filter(t => t.startsWith('@') || t.startsWith('#'));
  visibleTags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className = 'layer-badge';
    pill.textContent = tag;
    meta.appendChild(pill);
  });

  info.appendChild(nameRow);
  info.appendChild(meta);
  li.appendChild(info);

  li.addEventListener('click', () => {
    if (isOwner) {
      navigate('settings');
    } else {
      showContactProfile(db, contact, onRefresh);
    }
  });

  if (!isOwner) {
    const actions = document.createElement('div');
    actions.className = 'contact-row-actions';

    if (contact.ph) {
      const smsBtn = document.createElement('a');
      smsBtn.className = 'contact-action-btn';
      smsBtn.href = `sms:${contact.ph}`;
      smsBtn.textContent = '💬';
      smsBtn.setAttribute('aria-label', 'Send SMS');
      smsBtn.setAttribute('title', 'Send SMS');
      smsBtn.addEventListener('click', e => e.stopPropagation());
      actions.appendChild(smsBtn);

      const callBtn = document.createElement('a');
      callBtn.className = 'contact-action-btn';
      callBtn.href = `tel:${contact.ph}`;
      callBtn.textContent = '📞';
      callBtn.setAttribute('aria-label', 'Call');
      callBtn.setAttribute('title', 'Call');
      callBtn.addEventListener('click', e => e.stopPropagation());
      actions.appendChild(callBtn);
    }

    if (contact.em) {
      const emailBtn = document.createElement('a');
      emailBtn.className = 'contact-action-btn';
      emailBtn.href = `mailto:${contact.em}`;
      emailBtn.textContent = '📧';
      emailBtn.setAttribute('aria-label', 'Send email');
      emailBtn.setAttribute('title', 'Send email');
      emailBtn.addEventListener('click', e => e.stopPropagation());
      actions.appendChild(emailBtn);
    }

    if (hasAppOwner) {
      const connectedBtn = document.createElement('button');
      connectedBtn.type = 'button';
      connectedBtn.className = 'contact-action-btn contact-action-connected';
      connectedBtn.textContent = 'Connected';
      connectedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConnectedSheet(db, contact.id, onRefresh);
      });
      actions.appendChild(connectedBtn);

      const snoozeBtn = document.createElement('button');
      snoozeBtn.type = 'button';
      snoozeBtn.className = 'contact-action-btn contact-action-snooze';
      snoozeBtn.textContent = 'Snooze';
      snoozeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const settings = await getSettings(db);
        const snoozeUntil = Date.now() + getSnoozeMs(settings);
        await saveContact(db, { ...contact, su: snoozeUntil, ua: Date.now() });
        if (onRefresh) onRefresh();
      });
      actions.appendChild(snoozeBtn);
    }

    li.appendChild(actions);
  }

  return li;
}

function renderList(ul, contacts, ownerContact, db, onRefresh) {
  ul.innerHTML = '';
  if (contacts.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    
    // Check if we are searching/filtering or if the DB is actually empty
    const searchInput = document.querySelector('.search-input');
    const isSearching = searchInput && searchInput.value.trim().length > 0;
    const isFiltering = isFilterActive(filterState);
    
    if (isSearching || isFiltering) {
      empty.textContent = 'No one matches your current search or filter.';
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn-link';
      clearBtn.style.display = 'block';
      clearBtn.style.margin = '0.5rem auto';
      clearBtn.textContent = 'Clear all filters';
      clearBtn.onclick = () => {
        if (searchInput) searchInput.value = '';
        filterState = { sort: 'az', layer: null, group: null };
        onRefresh();
      };
      empty.appendChild(clearBtn);
    } else {
      empty.textContent = 'No contacts yet — tap + to add someone.';
    }
    
    ul.appendChild(empty);
    return;
  }
  contacts.forEach(c => {
    const isOwner = ownerContact && c.id === ownerContact.id;
    ul.appendChild(buildContactRow(c, isOwner, db, onRefresh, !!ownerContact));
  });
}

function showFilterSheet(allContacts, filterBtn, ul, ownerContact, applyCallback) {
  const content = document.createElement('div');

  // Sort section
  const sortSection = document.createElement('div');
  sortSection.className = 'bottom-sheet-section';
  const sortLabel = document.createElement('div');
  sortLabel.className = 'bottom-sheet-section-label';
  sortLabel.textContent = 'Sort';
  sortSection.appendChild(sortLabel);

  const sortRow = document.createElement('div');
  sortRow.className = 'pill-row';

  const sorts = [
    { value: 'az', label: 'A → Z' },
    { value: 'za', label: 'Z → A' },
    { value: 'recent', label: 'Recent' },
    { value: 'oldest', label: 'Oldest' },
  ];

  sorts.forEach(({ value, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill-btn' + (filterState.sort === value ? ' pill-btn--active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      sortRow.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
      btn.classList.add('pill-btn--active');
      filterState.sort = value;
    });
    sortRow.appendChild(btn);
  });

  sortSection.appendChild(sortRow);
  content.appendChild(sortSection);

  // Layer filter section
  const layerSection = document.createElement('div');
  layerSection.className = 'bottom-sheet-section';
  const layerLabel = document.createElement('div');
  layerLabel.className = 'bottom-sheet-section-label';
  layerLabel.textContent = 'Filter by layer';
  layerSection.appendChild(layerLabel);

  const layerRow = document.createElement('div');
  layerRow.className = 'pill-row';

  const allLayerBtn = document.createElement('button');
  allLayerBtn.type = 'button';
  allLayerBtn.className = 'pill-btn' + (!filterState.layer ? ' pill-btn--active' : '');
  allLayerBtn.textContent = 'All';
  allLayerBtn.addEventListener('click', () => {
    layerRow.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
    allLayerBtn.classList.add('pill-btn--active');
    filterState.layer = null;
  });
  layerRow.appendChild(allLayerBtn);

  Object.entries(LAYER_LABELS).forEach(([tag, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill-btn' + (filterState.layer === tag ? ' pill-btn--active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      layerRow.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
      btn.classList.add('pill-btn--active');
      filterState.layer = tag;
    });
    layerRow.appendChild(btn);
  });

  layerSection.appendChild(layerRow);
  content.appendChild(layerSection);

  // Group filter section
  const allGroups = [];
  allContacts.forEach(c => {
    (c.t || []).filter(t => t.startsWith('@')).forEach(t => {
      if (!allGroups.includes(t)) allGroups.push(t);
    });
  });
  allGroups.sort();

  if (allGroups.length > 0) {
    const groupSection = document.createElement('div');
    groupSection.className = 'bottom-sheet-section';
    const groupLabel = document.createElement('div');
    groupLabel.className = 'bottom-sheet-section-label';
    groupLabel.textContent = 'Filter by group';
    groupSection.appendChild(groupLabel);

    const groupRow = document.createElement('div');
    groupRow.className = 'pill-row';

    const allGroupBtn = document.createElement('button');
    allGroupBtn.type = 'button';
    allGroupBtn.className = 'pill-btn' + (!filterState.group ? ' pill-btn--active' : '');
    allGroupBtn.textContent = 'All';
    allGroupBtn.addEventListener('click', () => {
      groupRow.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
      allGroupBtn.classList.add('pill-btn--active');
      filterState.group = null;
    });
    groupRow.appendChild(allGroupBtn);

    allGroups.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill-btn' + (filterState.group === tag ? ' pill-btn--active' : '');
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        groupRow.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
        btn.classList.add('pill-btn--active');
        filterState.group = tag;
      });
      groupRow.appendChild(btn);
    });

    groupSection.appendChild(groupRow);
    content.appendChild(groupSection);
  }

  // Apply button
  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'bottom-sheet-apply-btn';
  applyBtn.textContent = 'Apply';
  content.appendChild(applyBtn);

  // Create sheet first so applyBtn handler can reference it
  const sheetHandle = showBottomSheet({ title: 'Filter & Sort', content });

  applyBtn.addEventListener('click', () => {
    sheetHandle.close();
    applyCallback();
  });

  return sheetHandle;
}

export async function renderPeople(db) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="view-loading"><div class="view-loading-spinner"></div><span>Scanning your circle...</span></div>';

  const allContacts = await getAllContacts(db);
  const ownerContact = allContacts.find(c => (c.t || []).includes('&owner'));
  document.body.setAttribute('data-is-owned', !!ownerContact);
  
  const nonOwnerCount = allContacts.filter(c => !(c.t || []).includes('&owner')).length;
  console.log('Architect status:', ownerContact ? 'Claimed' : 'Gallery mode');

  const sortedAll = applyFilterSort(allContacts, filterState);

  app.innerHTML = '';

  // Check for import metadata to personalize the gallery experience
  let importMeta = null;
  try {
    const raw = sessionStorage.getItem('lastImportMeta');
    if (raw) importMeta = JSON.parse(raw);
  } catch (e) {}

  if (!ownerContact) {
    const claimBanner = document.createElement('div');
    claimBanner.className = 'claim-banner';
    claimBanner.style.background = 'var(--color-bg-card)';
    claimBanner.style.padding = '16px';
    claimBanner.style.border = '1px solid var(--color-bg-accent)';
    claimBanner.style.display = 'flex';
    claimBanner.style.flexDirection = 'column';
    claimBanner.style.gap = '16px';

    // Personalized banner text
    let bannerTitle = "🎁 You've been gifted access to this address book and birthday calendar.";
    if (importMeta) {
      const source = importMeta.groupName ? `the <strong>${importMeta.groupName}</strong> address book and birthday calendar` : 'this address book and birthday calendar';
      const from = importMeta.senderName ? ` by <strong>${importMeta.senderName}</strong>` : '';
      bannerTitle = `🎁 You've been gifted access to ${source}${from}.`;
    }

    const text = document.createElement('p');
    text.innerHTML = `<strong>${bannerTitle}</strong> Browse freely, call, text, or email anyone. To edit contacts or create groups, <strong>save a private backup first</strong> — it takes seconds and keeps your data 100% on your device. <a href="#" id="about-link-claim" style="color: var(--color-link); text-decoration: underline; font-weight: 500;">Learn how it works.</a>`;
    text.style.margin = '0';
    text.style.fontSize = '0.95rem';
    text.style.lineHeight = '1.45';

    const claimBtn = document.createElement('button');
    claimBtn.className = 'trunk-btn trunk-btn--primary';
    claimBtn.textContent = 'Option: Save a Backup to Start Editing';
    claimBtn.style.cursor = 'pointer';
    claimBtn.addEventListener('click', async () => {
      console.log('Claim button clicked. Initiating stewardship ritual.');
      try {
        const success = await performStewardshipRitual(db);
        console.log('Ritual result:', success ? 'Success' : 'User cancelled or failed');
      } catch (err) {
        console.error('Ritual execution error:', err);
      }
    });

    claimBanner.appendChild(text);
    claimBanner.appendChild(claimBtn);
    app.appendChild(claimBanner);

    const aboutLink = text.querySelector('#about-link-claim');
    aboutLink.onclick = (e) => {
      e.preventDefault();
      const sheetContent = document.createElement('div');
      sheetContent.style.cssText = 'display:flex;flex-direction:column;gap:1rem;font-size:0.95rem;line-height:1.55;';
      sheetContent.innerHTML = `
        <p style="margin:0">${importMeta?.senderName || 'Someone who cares about you'} shared their address book with you. Here's what you have:</p>
        <p style="margin:0">📒 <strong>Address Book</strong> — Browse, call, text, or email anyone in the list.</p>
        <p style="margin:0">🎂 <strong>Milestone Calendar</strong> — Birthdays and anniversaries for the whole year, at a glance.</p>
        <p style="margin:0">🔐 <strong>About your data:</strong> This address book lives only in your browser — there is no account, no cloud, no automatic backup. <strong>Only you can save it.</strong> If you clear your browser or switch from your phone to your laptop without saving, it's gone.</p>
        <p style="margin:0">✏️ <strong>Save a backup to unlock editing.</strong> The backup is a text file you can keep anywhere — your Files app, a notebook like Notion or Apple Notes, email it to yourself, or save it to Google Drive or iCloud. It unlocks adding contacts, editing, creating groups, and smart reminders to help you stay in touch.</p>
        <p style="margin:0;font-style:italic">🎁 And once it's yours, you become a Greatuncle too — able to share the gift and pass groups on to anyone you choose.</p>
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
          <button class="trunk-btn trunk-btn--primary" id="sheet-claim-btn" style="width:100%; cursor:pointer;">Option: Save a Backup to Start Editing</button>
          <button class="trunk-btn trunk-btn--secondary" id="sheet-cancel-btn" style="width:100%; cursor:pointer;">Cancel</button>
        </div>
      `;
      const { close } = showBottomSheet({ title: 'Your Gift Access', content: sheetContent });
      
      const sheetClaimBtn = sheetContent.querySelector('#sheet-claim-btn');
      sheetClaimBtn.addEventListener('click', async () => {
        close();
        await performStewardshipRitual(db);
      });

      const sheetCancelBtn = sheetContent.querySelector('#sheet-cancel-btn');
      sheetCancelBtn.addEventListener('click', () => close());
    };
  }

  // --- Show Celebration if just became owner ---
  if (sessionStorage.getItem('justBecameOwner') === 'true') {
    sessionStorage.removeItem('justBecameOwner');
    setTimeout(() => {
      const content = document.createElement('div');
      content.style.padding = '0.5rem 1.5rem 1.5rem';
      content.style.textAlign = 'center';

      content.innerHTML = `
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎊</div>
        <h2 style="margin-top: 0; margin-bottom: 1rem; font-family: var(--font-serif); color: var(--color-action);">Welcome to New Owner</h2>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1.5rem;">
          You've taken stewardship of your private circle. You are now the <strong>sovereign owner</strong> of your data.
        </p>
        
        <div style="text-align: left; background: var(--color-bg-accent); padding: 1.25rem; border-radius: 12px; margin-bottom: 1.5rem;">
          <h3 style="margin-top: 0; font-size: 0.9rem; text-transform: uppercase; opacity: 0.7;">New Powers Unlocked:</h3>
          <ul style="margin: 0.5rem 0; padding-left: 1.25rem; line-height: 1.6;">
            <li><strong>Sustaining</strong>: Add, edit, or remove any record.</li>
            <li><strong>Architecting</strong>: Create and share your own groups.</li>
            <li><strong>Privacy</strong>: Everything stays 100% on your device.</li>
          </ul>
        </div>

        <button id="celebration-close" class="trunk-btn" style="width: 100%;">Get Started</button>
      `;

      const { close } = showBottomSheet({
        title: 'Taking Stewardship',
        content: content
      });

      content.querySelector('#celebration-close').onclick = () => close();
    }, 500);
  }

  // Header
  const header = document.createElement('div');
  header.className = 'view-header';

  const h1 = document.createElement('h1');
  if (ownerContact) {
    h1.textContent = 'My Circle';
  } else if (importMeta && importMeta.groupName) {
    h1.textContent = `The ${importMeta.groupName} Circle`;
  } else if (importMeta && importMeta.senderName) {
    h1.textContent = `${importMeta.senderName}'s Circle`;
  } else {
    h1.textContent = 'Shared Circle';
  }

  const headerRight = document.createElement('div');
  headerRight.className = 'view-header-right';

  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'header-icon-btn';
  printBtn.setAttribute('aria-label', 'Print contact list');
  printBtn.textContent = '🖨️';
  printBtn.addEventListener('click', async () => {
    const contacts = await getAllContacts(db);
    const nonOwners = contacts
      .filter(c => !(c.t || []).includes('&owner'))
      .sort((a, b) => (a.n || '').toLowerCase().localeCompare((b.n || '').toLowerCase()));

    const printEl = document.createElement('div');
    printEl.className = 'print-contact-list';

    const title = document.createElement('h1');
    title.textContent = 'My Contact from Greatuncle';
    printEl.appendChild(title);

    nonOwners.forEach(c => {
      const row = document.createElement('div');
      row.className = 'print-contact-row';

      const name = document.createElement('div');
      name.className = 'print-contact-name';
      name.textContent = c.n;

      const details = document.createElement('div');
      details.className = 'print-contact-details';
      const parts = [c.ph, c.em, c.ad].filter(Boolean);
      details.textContent = parts.join(' · ');

      row.appendChild(name);
      if (parts.length) row.appendChild(details);
      printEl.appendChild(row);
    });

    document.body.appendChild(printEl);
    window.print();
    document.body.removeChild(printEl);
  });

  const gearBtn = document.createElement('button');
  gearBtn.type = 'button';
  gearBtn.className = 'gear-btn';
  gearBtn.setAttribute('aria-label', 'Settings');
  gearBtn.textContent = '⚙️';
  gearBtn.addEventListener('click', () => navigate('settings'));

  // Sharing helper
  const shareAction = async (tag = null) => {
    let shareUrl;
    const base = `${window.location.origin}${window.location.pathname}`;

    if (tag) {
      const contactsInGroup = allContacts.filter(c => (c.t || []).includes(tag) && !(c.t || []).includes('&owner'));
      const groupCode = encodeGroup(contactsInGroup, tag);
      shareUrl = `${base}?importGroup=${groupCode}`;
    } else {
      // Full circle share
      const allNonOwners = allContacts.filter(c => !(c.t || []).includes('&owner'));
      const groupCode = encodeGroup(allNonOwners, 'Shared Circle');
      shareUrl = `${base}?importGroup=${groupCode}`;
    }
    
    const subject = tag ? `GreatUncle Group: ${tag}` : 'GreatUncle Circle';
    const text = tag ? `Here is the ${tag} contact list.` : 'Check out this GreatUncle circle contact list.';

    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text: text, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.log('Web share failed, fallback to clipboard');
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (err) {
      // Final fallback for restricted environments
      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      alert('Share link copied to clipboard!');
    }
  };

  if (filterState.group || !ownerContact) {
    const headerShareBtn = document.createElement('button');
    headerShareBtn.type = 'button';
    headerShareBtn.className = 'header-icon-btn';
    headerShareBtn.title = filterState.group ? `Share ${filterState.group} group` : 'Share this circle';
    headerShareBtn.textContent = '📤';
    headerShareBtn.onclick = () => shareAction(filterState.group);
    headerRight.appendChild(headerShareBtn);
  }

  const calBtn = document.createElement('button');
  calBtn.type = 'button';
  calBtn.className = 'header-icon-btn';
  calBtn.setAttribute('aria-label', 'View milestone calendar');
  calBtn.textContent = '📅';
  calBtn.addEventListener('click', () => navigate('milestone-calendar'));

  headerRight.appendChild(calBtn);
  headerRight.appendChild(printBtn);
  headerRight.appendChild(gearBtn);

  header.appendChild(h1);
  header.appendChild(headerRight);
  app.appendChild(header);

  // Content
  const content = document.createElement('div');
  content.className = 'view-content';

  // Search row
  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search by name or #tag…';
  searchInput.setAttribute('aria-label', 'Search contacts');

  const filterBtn = document.createElement('button');
  filterBtn.type = 'button';
  filterBtn.className = 'filter-btn' + (isFilterActive(filterState) ? ' filter-btn--active' : '');
  filterBtn.textContent = 'Filter';

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'filter-btn filter-btn--share';
  shareBtn.setAttribute('aria-label', 'Share this group');
  shareBtn.textContent = '⬆️ Share';
  shareBtn.hidden = !filterState.group; // only show when a @group filter is active (Gallery sharing is handled in header)

  searchRow.appendChild(searchInput);
  searchRow.appendChild(filterBtn);
  searchRow.appendChild(shareBtn);
  content.appendChild(searchRow);

  // Dunbar warning (based on non-owner contacts)
  const dunbar = document.createElement('div');
  dunbar.className = 'dunbar-warning';
  dunbar.textContent = 'You have over 150 contacts. Research suggests 150 is a natural limit for meaningful relationships.';
  dunbar.hidden = nonOwnerCount <= 150;
  content.appendChild(dunbar);

  // Contact list
  const ul = document.createElement('ul');
  ul.className = 'contact-list';

  const onRefresh = () => renderPeople(db);

  let currentContacts = sortedAll;
  renderList(ul, currentContacts, ownerContact, db, onRefresh);
  content.appendChild(ul);

  app.appendChild(content);

  // Upcoming Milestones Section (only if < 30 people listed)
  if (sortedAll.length > 0 && sortedAll.length < 30) {
    const milestones = getUpcomingMilestones(sortedAll);
    if (milestones.length > 0) {
      const settings = await getSettings(db);
      const milestoneSection = document.createElement('div');
      milestoneSection.className = 'view-content milestone-radar';
      milestoneSection.style.marginTop = '0';
      milestoneSection.style.paddingTop = '1rem';
      milestoneSection.style.borderTop = '1px dashed var(--color-border)';

      const mTitle = document.createElement('div');
      mTitle.className = 'form-section-label';
      mTitle.style.marginBottom = '12px';
      mTitle.textContent = 'Upcoming Milestones (Next 31 Days)';
      milestoneSection.appendChild(mTitle);

      const mList = document.createElement('div');
      mList.style.display = 'flex';
      mList.style.flexDirection = 'column';
      mList.style.gap = '10px';

      const formatAge = (m) => {
        if (!settings.showAge || !m.age) return '';
        const suffix = (m.age % 10 === 1 && m.age !== 11) ? 'st' : 
                       (m.age % 10 === 2 && m.age !== 12) ? 'nd' :
                       (m.age % 10 === 3 && m.age !== 13) ? 'rd' : 'th';
        return ` · ${m.age}${suffix}`;
      };

      milestones.forEach(m => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '12px';
        item.style.padding = '4px 0';
        
        const daysLabel = m.daysUntil === 0 ? 'TODAY' : `in ${m.daysUntil} day${m.daysUntil === 1 ? '' : 's'}`;
        const dateStr = formatMilestoneDate(m.month, m.day, settings.dateFormat);
        const ageLabel = formatAge(m);
        
        item.innerHTML = `
          <div style="font-size: 1.2rem;">${m.icon}</div>
          <div style="flex: 1;">
            <div style="font-weight: 500;">${m.name}</div>
            <div style="font-size: 0.8rem; opacity: 0.6;">${dateStr} · ${m.type}${ageLabel} · ${daysLabel}</div>
          </div>
        `;
        mList.appendChild(item);
      });

      milestoneSection.appendChild(mList);
      app.appendChild(milestoneSection);
    }
  }

  // FAB (Only for Architect/Owner)
  if (ownerContact) {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'add-contact-fab';
    fab.textContent = '+';
    fab.setAttribute('aria-label', 'Add contact');
    fab.addEventListener('click', () => {
      navigate('contact-form', {});
    });
    app.appendChild(fab);
  }

  // Filter button handler
  filterBtn.addEventListener('click', () => {
    showFilterSheet(allContacts, filterBtn, ul, ownerContact, () => {
      const active = isFilterActive(filterState);
      filterBtn.className = 'filter-btn' + (active ? ' filter-btn--active' : '');
      // Update share button visibility (Gallery shares from header)
      shareBtn.hidden = !filterState.group;
      shareBtn.textContent = filterState.group ? `⬆️ Share ${filterState.group}` : '⬆️ Share';
      currentContacts = applyFilterSort(allContacts, filterState);
      renderList(ul, currentContacts, ownerContact, db, onRefresh);
    });
  });

  // Share button handler
  shareBtn.addEventListener('click', () => {
    const tag = filterState.group || shareBtn.dataset.shareTag;
    shareAction(tag);
  });

  // Live search
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const base = applyFilterSort(allContacts, filterState);

    if (!query) {
      currentContacts = base;
      // Reset share button to filter-state-only (Gallery shares from header)
      shareBtn.hidden = !filterState.group;
      shareBtn.textContent = filterState.group ? `⬆️ Share ${filterState.group}` : '⬆️ Share';
      return;
    }

    let filtered;
    // Check if the query is a pure @tag (e.g. "@bookclub") — exact group match
    const isPureGroupTag = /^@\S+$/.test(query);

    if (query.startsWith('#') || query.startsWith('@')) {
      filtered = base.filter(c =>
        (c.t || []).some(t => t.toLowerCase().startsWith(query))
      );
    } else {
      filtered = base.filter(c => (c.n || '').toLowerCase().includes(query));
    }

    currentContacts = filtered;
    renderList(ul, currentContacts, ownerContact, db, onRefresh);

    // Show Share button if search is a pure @tag
    if (isPureGroupTag) {
      // Find exact tag match from actual contacts
      const exactTag = allContacts
        .flatMap(c => c.t || [])
        .find(t => t.toLowerCase() === query);
      if (exactTag) {
        shareBtn.hidden = false;
        shareBtn.textContent = `⬆️ Share ${exactTag}`;
        shareBtn.dataset.shareTag = exactTag;
      } else {
        shareBtn.hidden = true;
        delete shareBtn.dataset.shareTag;
      }
    } else {
      // Non-group search — hide row share button (Gallery shares from header)
      shareBtn.hidden = !filterState.group;
      if (filterState.group) {
        shareBtn.textContent = `⬆️ Share ${filterState.group}`;
      }
      delete shareBtn.dataset.shareTag;
    }
  });
}
