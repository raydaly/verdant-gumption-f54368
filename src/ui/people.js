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
    result = result.filter(c => (c.tags || []).includes(state.layer));
  }

  if (state.group) {
    result = result.filter(c => (c.tags || []).includes(state.group));
  }

  switch (state.sort) {
    case 'za':
      result.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));
      break;
    case 'recent':
      result.sort((a, b) => {
        if (!a.last_contacted) return 1;
        if (!b.last_contacted) return -1;
        return new Date(b.last_contacted) - new Date(a.last_contacted);
      });
      break;
    case 'oldest':
      result.sort((a, b) => {
        if (!a.last_contacted) return 1;
        if (!b.last_contacted) return -1;
        return new Date(a.last_contacted) - new Date(b.last_contacted);
      });
      break;
    default: // 'az'
      result.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  return result;
}

function isFilterActive(state) {
  return state.sort !== 'az' || state.layer !== null || state.group !== null;
}

function buildContactRow(contact, isOwner, db, onRefresh) {
  const li = document.createElement('li');
  li.className = 'contact-row';

  const info = document.createElement('div');
  info.className = 'contact-row-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'contact-row-name';
  nameRow.textContent = contact.name;

  if (isOwner) {
    const badge = document.createElement('span');
    badge.className = 'owner-badge';
    badge.textContent = '(YOU)';
    nameRow.appendChild(badge);
  }

  const isLegacy = (contact.tags || []).includes('&legacy');
  if (isLegacy) {
    li.classList.add('contact-row--legacy');
    const dove = document.createElement('span');
    dove.className = 'legacy-icon';
    dove.textContent = '🕊️';
    nameRow.appendChild(dove);
  }

  const meta = document.createElement('div');
  meta.className = 'contact-row-meta';

  const visibleTags = (contact.tags || []).filter(t => t.startsWith('@') || t.startsWith('#'));
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

    if (contact.phone) {
      const smsBtn = document.createElement('a');
      smsBtn.className = 'contact-action-btn';
      smsBtn.href = `sms:${contact.phone}`;
      smsBtn.textContent = '💬';
      smsBtn.setAttribute('aria-label', 'Send SMS');
      smsBtn.setAttribute('title', 'Send SMS');
      smsBtn.addEventListener('click', e => e.stopPropagation());
      actions.appendChild(smsBtn);

      const callBtn = document.createElement('a');
      callBtn.className = 'contact-action-btn';
      callBtn.href = `tel:${contact.phone}`;
      callBtn.textContent = '📞';
      callBtn.setAttribute('aria-label', 'Call');
      callBtn.setAttribute('title', 'Call');
      callBtn.addEventListener('click', e => e.stopPropagation());
      actions.appendChild(callBtn);
    }

    if (contact.email) {
      const emailBtn = document.createElement('a');
      emailBtn.className = 'contact-action-btn';
      emailBtn.href = `mailto:${contact.email}`;
      emailBtn.textContent = '📧';
      emailBtn.setAttribute('aria-label', 'Send email');
      emailBtn.setAttribute('title', 'Send email');
      emailBtn.addEventListener('click', e => e.stopPropagation());
      actions.appendChild(emailBtn);
    }

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
      await saveContact(db, { ...contact, snooze_until: snoozeUntil, updated_at: Date.now() });
      if (onRefresh) onRefresh();
    });
    actions.appendChild(snoozeBtn);

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
    ul.appendChild(buildContactRow(c, isOwner, db, onRefresh));
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
    (c.tags || []).filter(t => t.startsWith('@')).forEach(t => {
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
  const ownerContact = allContacts.find(c => (c.tags || []).includes('&owner'));
  const nonOwnerCount = allContacts.filter(c => !(c.tags || []).includes('&owner')).length;

  const sortedAll = applyFilterSort(allContacts, filterState);

  app.innerHTML = '';

  if (!ownerContact) {
    const claimBanner = document.createElement('div');
    claimBanner.className = 'claim-banner';
    claimBanner.style.background = 'var(--color-bg-elevated)';
    claimBanner.style.padding = '12px 16px';
    claimBanner.style.borderBottom = '1px solid var(--color-border)';
    claimBanner.style.display = 'flex';
    claimBanner.style.flexDirection = 'column';
    claimBanner.style.gap = '12px';

    const text = document.createElement('p');
    text.textContent = 'You are viewing a shared circle. Claim your circle to unlock connection tracking and editing.';
    text.style.margin = '0';
    text.style.fontSize = '0.9rem';

    const claimBtn = document.createElement('button');
    claimBtn.className = 'trunk-btn trunk-btn--primary';
    claimBtn.textContent = 'Claim Circle';
    claimBtn.onclick = () => performStewardshipRitual(db);

    claimBanner.appendChild(text);
    claimBanner.appendChild(claimBtn);
    app.appendChild(claimBanner);
  }

  // Header
  const header = document.createElement('div');
  header.className = 'view-header';

  const h1 = document.createElement('h1');
  h1.textContent = 'People';

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
      .filter(c => !(c.tags || []).includes('&owner'))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

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
      name.textContent = c.name;

      const details = document.createElement('div');
      details.className = 'print-contact-details';
      const parts = [c.phone, c.email, c.address].filter(Boolean);
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

  if (filterState.group) {
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'header-icon-btn';
    shareBtn.title = `Share ${filterState.group} group`;
    shareBtn.textContent = '📤';
    shareBtn.addEventListener('click', async () => {
      const contactsInGroup = sortedAll.filter(c => (c.tags || []).includes(filterState.group));
      const groupCode = encodeGroup(contactsInGroup, filterState.group);
      const shareUrl = `${window.location.origin}/?importGroup=${groupCode}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `GreatUncle Circle: ${filterState.group}`,
          text: `Here is the ${filterState.group} contact list.`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      }
    });
    headerRight.appendChild(shareBtn);
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
  shareBtn.hidden = !filterState.group; // only show when a @group filter is active

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

  // FAB
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'add-contact-fab';
  fab.textContent = '+';
  fab.setAttribute('aria-label', 'Add contact');
  fab.addEventListener('click', () => {
    if (!ownerContact) {
      performStewardshipRitual(db, () => navigate('contact-form', {}));
    } else {
      navigate('contact-form', {});
    }
  });
  app.appendChild(fab);

  // Filter button handler
  filterBtn.addEventListener('click', () => {
    showFilterSheet(allContacts, filterBtn, ul, ownerContact, () => {
      const active = isFilterActive(filterState);
      filterBtn.className = 'filter-btn' + (active ? ' filter-btn--active' : '');
      // Only show Share when a named @group is active
      shareBtn.hidden = !filterState.group;
      if (filterState.group) {
        shareBtn.textContent = `⬆️ Share ${filterState.group}`;
      } else {
        shareBtn.textContent = '⬆️ Share';
      }
      currentContacts = applyFilterSort(allContacts, filterState);
      renderList(ul, currentContacts, ownerContact, db, onRefresh);
    });
  });

  // Share button handler — active when a @group filter or @tag search is active
  shareBtn.addEventListener('click', async () => {
    const tag = filterState.group || shareBtn.dataset.shareTag;
    if (!tag) return; // safety guard

    const groupContacts = allContacts.filter(c =>
      !(c.tags || []).includes('&owner') && (c.tags || []).includes(tag)
    );
    if (groupContacts.length === 0) return;

    const encoded = encodeGroup(groupContacts, tag);
    const base = window.location.origin + window.location.pathname;
    const url = `${base}?importGroup=${encodeURIComponent(encoded)}`;

    const subject = `Greatuncle group: ${tag}`;
    const body = `Here are my ${tag} contacts from Greatuncle:\n\n${url}`;
    const groupEmails = groupContacts.map(c => c.email).filter(Boolean);

    // Mobile: native share sheet
    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text: body });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.log('Web share failed, fallback to mailto');
      }
    }

    // Desktop: open mailto in new tab so app stays open
    const toField = groupEmails.join(',');
    window.open(`mailto:${toField}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  });

  // Live search
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const base = applyFilterSort(allContacts, filterState);

    if (!query) {
      currentContacts = base;
      renderList(ul, currentContacts, ownerContact, db, onRefresh);
      // Reset share button to filter-state-only
      const hasGroupFilter = !!filterState.group;
      shareBtn.hidden = !hasGroupFilter;
      shareBtn.textContent = hasGroupFilter ? `⬆️ Share ${filterState.group}` : '⬆️ Share';
      return;
    }

    let filtered;
    // Check if the query is a pure @tag (e.g. "@bookclub") — exact group match
    const isPureGroupTag = /^@\S+$/.test(query);

    if (query.startsWith('#') || query.startsWith('@')) {
      filtered = base.filter(c =>
        (c.tags || []).some(t => t.toLowerCase().startsWith(query))
      );
    } else {
      filtered = base.filter(c => c.name.toLowerCase().includes(query));
    }

    currentContacts = filtered;
    renderList(ul, currentContacts, ownerContact, db, onRefresh);

    // Show Share button if search is a pure @tag
    if (isPureGroupTag) {
      // Find exact tag match from actual contacts
      const exactTag = allContacts
        .flatMap(c => c.tags || [])
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
      // Non-group search — hide Share unless filter overlay has a group active
      const hasGroupFilter = !!filterState.group;
      shareBtn.hidden = !hasGroupFilter;
      if (hasGroupFilter) {
        shareBtn.textContent = `⬆️ Share ${filterState.group}`;
      }
      delete shareBtn.dataset.shareTag;
    }
  });
}
