import { showBottomSheet } from './bottom-sheet.js';
import { getAllLogs } from '../../storage/logs.js';
import { navigate } from '../router.js';
import { exportToCalendar } from '../../core/calendar.js';

/**
 * Renders the Connection Sheet (Contact Profile) for a specific contact.
 */
export async function showContactProfile(db, contact, onRefresh) {
  const content = document.createElement('div');
  content.className = 'profile-sheet';

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
    { label: 'Call', icon: '📞', href: contact.phone ? `tel:${contact.phone}` : null },
    { label: 'Text', icon: '💬', href: contact.phone ? `sms:${contact.phone}` : null },
    { label: 'Email', icon: '📧', href: contact.email ? `mailto:${contact.email}` : null },
    { label: 'Map', icon: '📍', href: contact.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}` : null },
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

  content.appendChild(actionRow);

  // Journal Preview
  const journalBox = document.createElement('div');
  journalBox.className = 'profile-journal-box';
  
  const journalLabel = document.createElement('div');
  journalLabel.className = 'profile-section-label';
  journalLabel.textContent = 'Last Interaction';
  journalBox.appendChild(journalLabel);

  if (lastLog) {
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
      navigate('journal', { search: contact.name });
    });
    journalBox.appendChild(moreBtn);
  } else {
    const emptyLog = document.createElement('div');
    emptyLog.className = 'profile-log-empty';
    emptyLog.textContent = 'No interactions logged yet.';
    journalBox.appendChild(emptyLog);
  }

  content.appendChild(journalBox);

  // Details & Tags
  const detailsBox = document.createElement('div');
  detailsBox.className = 'profile-details-box';
  
  const visibleTags = (contact.tags || []).filter(t => t.startsWith('@') || t.startsWith('#'));
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
  
  content.appendChild(detailsBox);

  const { close } = showBottomSheet({
    title: contact.name,
    content
  });
}
