import { addLog } from '../../storage/logs.js';
import { getAllContacts, saveContact } from '../../storage/contacts.js';
import { showBottomSheet } from './bottom-sheet.js';
import { calculateNextTarget } from '../../core/outreach-engine.js';

export async function showConnectedSheet(db, contactId, onDone) {
  const contacts = await getAllContacts(db);
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) return;

  const content = document.createElement('div');

  const actionsGrid = document.createElement('div');
  actionsGrid.style.display = 'flex';
  actionsGrid.style.justifyContent = 'space-around';
  actionsGrid.style.gap = '0.5rem';
  actionsGrid.style.marginBottom = '1.5rem';

  let selectedMedium = null;

  const createActionBtn = (label, icon, medium, actionUrl) => {
    const btn = document.createElement('button');
    btn.className = 'trunk-btn trunk-btn--secondary';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '0.75rem';
    btn.style.flex = '1';
    btn.style.gap = '0.4rem';
    
    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.fontSize = '1.6rem';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontSize = '0.75rem';

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);

    btn.addEventListener('click', () => {
      // Highlight selection
      Array.from(actionsGrid.children).forEach(c => {
        c.style.background = 'var(--color-bg)';
        c.style.borderColor = 'var(--color-border)';
      });
      btn.style.background = 'var(--color-bg-accent)';
      btn.style.borderColor = 'var(--color-primary)';
      
      selectedMedium = medium;
      
      if (actionUrl) {
        window.open(actionUrl, '_blank');
      }
    });

    return btn;
  };

  // Only show buttons if data exists, or fallback to generic if none
  let hasActions = false;
  if (contact.ph) {
    actionsGrid.appendChild(createActionBtn('Call', '📞', 'Call', `tel:${contact.ph}`));
    actionsGrid.appendChild(createActionBtn('Text', '💬', 'Text', `sms:${contact.ph}`));
    hasActions = true;
  }
  if (contact.em) {
    actionsGrid.appendChild(createActionBtn('Email', '✉️', 'Email', `mailto:${contact.em}`));
    hasActions = true;
  }
  if (contact.ad) {
    actionsGrid.appendChild(createActionBtn('Visit', '🏡', 'Visit', `https://maps.google.com/?q=${encodeURIComponent(contact.ad)}`));
    hasActions = true;
  }

  if (hasActions) {
    content.appendChild(actionsGrid);
  }

  const label = document.createElement('div');
  label.className = 'form-field';

  const textarea = document.createElement('textarea');
  textarea.className = 'form-input';
  textarea.rows = 3;
  textarea.style.resize = 'none';
  textarea.placeholder = 'A quick note...';

  label.appendChild(textarea);
  content.appendChild(label);

  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'trunk-btn trunk-btn--primary';
  doneBtn.style.marginTop = '1rem';
  doneBtn.style.width = '100%';
  doneBtn.textContent = 'Save connection';
  content.appendChild(doneBtn);

  const { close } = showBottomSheet({ title: 'Connected!', content });

  doneBtn.addEventListener('click', async () => {
    const now = Date.now();
    let comment = textarea.value.trim();
    
    if (selectedMedium) {
      comment = comment ? `[${selectedMedium}] ${comment}` : `[${selectedMedium}]`;
    } else if (!comment) {
      comment = null;
    }
    
    await addLog(db, contactId, now, comment);
    
    // Automatically reset the Next Target Date
    const nextDate = calculateNextTarget({ ...contact, lc: now }, now);
    await saveContact(db, { ...contact, lc: now, nd: nextDate, su: null, ua: now });

    close();
    if (onDone) onDone();
  });

  setTimeout(() => { if(!hasActions) textarea.focus(); }, 100);
}
