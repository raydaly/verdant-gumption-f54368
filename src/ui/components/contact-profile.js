import { showBottomSheet } from './bottom-sheet.js';
import { getAllLogs } from '../../storage/logs.js';
import { navigate } from '../router.js';
import { exportToCalendar } from '../../core/calendar.js';
import { performStewardshipRitual } from '../stewardship.js';
import { saveContact, getOwner } from '../../storage/contacts.js';
import { formatPhone } from '../../core/utils.js';
import { getSnoozeMs } from '../../core/outreach-engine.js';

import { getMonthDay } from '../../core/milestone-engine.js';
import { getSettings } from '../../storage/settings.js';

/**
 * Renders the Connection Sheet (Contact Profile) for a specific contact.
 */
export async function showContactProfile(db, contact, onRefresh) {
  const content = document.createElement('div');
  content.className = 'profile-sheet';

  const settings = await getSettings(db);

  const getOrdinalSuffix = (num) => {
    if (num % 10 === 1 && num % 100 !== 11) return 'st';
    if (num % 10 === 2 && num % 100 !== 12) return 'nd';
    if (num % 10 === 3 && num % 100 !== 13) return 'rd';
    return 'th';
  };

  const formatSafeDate = (val) => {
    if (!val) return null;
    const md = getMonthDay(val);
    if (!md) return null;
    
    const d = new Date(2000, md.month, md.day);
    let displayStr = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

    // Calculate milestone number if year exists
    if (md.year && settings.showAge !== false) {
      const now = new Date();
      const currentYear = now.getFullYear();
      let eventYear = (new Date(currentYear, md.month, md.day) < now) ? currentYear : currentYear;
      // Wait, people usually just want the count for the CURRENT calendar year milestone
      const milestoneNum = currentYear - md.year;
      if (milestoneNum > 0) {
        displayStr += ` (${milestoneNum}${getOrdinalSuffix(milestoneNum)})`;
      }
    }

    return displayStr;
  };

  // Check ownership early — used in multiple sections
  const owner = await getOwner(db);

  // Last Journal Entry
  const allLogs = await getAllLogs(db);
  const contactLogs = allLogs
    .filter(l => l.contactId === contact.id)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  const lastLog = contactLogs[0];

  // Action Row
  const actionRow = document.createElement('div');
  actionRow.className = 'profile-action-row';

  const actions = [
    { label: 'Call', icon: '📞', href: contact.ph ? `tel:${contact.ph}` : null },
    { label: 'Text', icon: '💬', href: contact.ph ? `sms:${contact.ph}` : null },
    { label: 'Email', icon: '📧', href: contact.em ? `mailto:${contact.em}` : null },
    { label: 'Map', icon: '📍', href: contact.ad ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.ad)}` : null },
  ];

  actions.forEach(act => {
    if (!act.href) return;
    const btn = document.createElement('a');
    btn.className = 'profile-action-btn';
    btn.href = act.href;
    btn.innerHTML = `<span>${act.icon}</span><label>${act.label}</label>`;
    actionRow.appendChild(btn);
  });
  
  // Calendar Button
  const calBtn = document.createElement('button');
  calBtn.className = 'profile-action-btn';
  calBtn.innerHTML = `<span>📅</span><label>Plan</label>`;
  calBtn.addEventListener('click', () => {
    exportToCalendar(contact);
  });
  actionRow.appendChild(calBtn);

  // Snooze Button (Only for Owners)
  if (owner) {
    const snoozeBtn = document.createElement('button');
    snoozeBtn.className = 'profile-action-btn';
    snoozeBtn.innerHTML = `<span>⏳</span><label>Snooze</label>`;
    snoozeBtn.addEventListener('click', async () => {
      const ms = getSnoozeMs(settings);
      const snoozeUntil = Date.now() + ms;
      await saveContact(db, { ...contact, su: snoozeUntil, ua: Date.now() });
      if (onRefresh) onRefresh();
      close();
    });
    actionRow.appendChild(snoozeBtn);
  }

  content.appendChild(actionRow);

  // Journal Preview
  const journalBox = document.createElement('div');
  journalBox.className = 'profile-journal-box';
  
  const journalLabel = document.createElement('div');
  journalLabel.className = 'profile-section-label';
  journalLabel.textContent = 'Last Interaction';
  journalBox.appendChild(journalLabel);

  if (!owner) {
    // Gallery mode — show teaser instead of empty journal
    const teaser = document.createElement('div');
    teaser.className = 'profile-log-empty';
    teaser.innerHTML = `🔒 <a href="#" class="btn-link" style="text-decoration:underline;">Save a backup</a> to log interactions and track your connection history.`;
    teaser.querySelector('a').addEventListener('click', async (e) => {
      e.preventDefault();
      await performStewardshipRitual(db);
    });
    journalBox.appendChild(teaser);
  } else if (lastLog) {
    const logDate = new Date(lastLog.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const logEntry = document.createElement('div');
    logEntry.className = 'profile-last-log';
    logEntry.innerHTML = `
      <div class="profile-log-meta">${logDate}</div>
      <div class="profile-log-comment">${lastLog.comment || 'Interacted (no note)'}</div>
    `;
    journalBox.appendChild(logEntry);

    const moreBtn = document.createElement('button');
    moreBtn.className = 'btn-link';
    moreBtn.style.marginTop = '0.5rem';
    moreBtn.textContent = 'View full history →';
    moreBtn.addEventListener('click', () => {
      close();
      navigate('journal', { search: contact.n });
    });
    journalBox.appendChild(moreBtn);
  } else {
    const emptyLog = document.createElement('div');
    emptyLog.className = 'profile-log-empty';
    emptyLog.textContent = 'No interactions logged yet.';
    journalBox.appendChild(emptyLog);
  }

  content.appendChild(journalBox);

  // Notes
  if (contact.no) {
    const notesBox = document.createElement('div');
    notesBox.className = 'profile-journal-box';
    notesBox.style.marginTop = '1rem';
    
    const notesLabel = document.createElement('div');
    notesLabel.className = 'profile-section-label';
    notesLabel.textContent = 'Background (Notes)';
    notesBox.appendChild(notesLabel);

    const notesText = document.createElement('div');
    notesText.className = 'profile-log-comment';
    notesText.style.whiteSpace = 'pre-line';
    notesText.textContent = contact.no;
    notesBox.appendChild(notesText);

    content.appendChild(notesBox);
  }

  // Details & Tags
  const detailsBox = document.createElement('div');
  detailsBox.className = 'profile-details-box';

  // Readable contact details
  const detailFields = [
    { label: '📞 Phone', value: contact.ph ? formatPhone(contact.ph) : null },
    { label: '📧 Email', value: contact.em },
    { label: '📍 Address', value: contact.ad ? `${contact.ad}${contact.zp ? ' ' + contact.zp : ''}` : (contact.zp || null) },
    { label: '🎂 Birthday', value: formatSafeDate(contact.bd) },
    { label: '💍 Anniversary', value: formatSafeDate(contact.av) },
  ];

  const hasDetails = detailFields.some(f => f.value);
  if (hasDetails) {
    const detailList = document.createElement('div');
    detailList.style.cssText = 'display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;font-size:0.9rem;';
    detailFields.forEach(({ label, value }) => {
      if (!value) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:0.5rem;align-items:flex-start;';
      row.innerHTML = `<span style="color:var(--color-text-muted);min-width:7rem;">${label}</span><span style="word-break:break-word;">${value}</span>`;
      detailList.appendChild(row);
    });
    detailsBox.appendChild(detailList);
  }

  const visibleTags = (contact.t || []).filter(t => t.startsWith('@') || t.startsWith('#'));
  if (visibleTags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'profile-tags';
    visibleTags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'layer-badge';
      pill.textContent = tag;
      tagsContainer.appendChild(pill);
    });
    detailsBox.appendChild(tagsContainer);
  }

  if (owner) {
    const editBtn = document.createElement('button');
    editBtn.className = 'trunk-btn trunk-btn--secondary';
    editBtn.style.marginTop = '1.5rem';
    editBtn.style.width = '100%';
    editBtn.textContent = 'Edit Profile';
    editBtn.addEventListener('click', () => {
      close();
      navigate('contact-form', { contactId: contact.id });
    });
    detailsBox.appendChild(editBtn);
  }
  
  content.appendChild(detailsBox);

  const { close } = showBottomSheet({
    title: contact.n,
    content
  });
}
