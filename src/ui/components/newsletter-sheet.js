import { generateNewsletterDraft, getNearestFirstOfMonth } from '../../core/newsletter-engine.js';
import { showBottomSheet } from './bottom-sheet.js';
import { encodeGroup } from '../../core/seedling.js';
import { TAGS } from '../../core/constants.js';

export async function showNewsletterSheet(db, groupTag, allContacts, ownerContact, onDone) {
  const content = document.createElement('div');
  content.className = 'newsletter-composer-sheet';
  content.style.cssText = 'display:flex; flex-direction:column; gap:1rem; padding:0.5rem 0; max-height:80vh; overflow-y:auto;';

  const groupName = groupTag.replace(/^@/, '');
  const groupContacts = allContacts.filter(c => 
    !(c.t || []).includes(TAGS.SYSTEM.OWNER) && (c.t || []).includes(groupTag)
  );
  const senderName = ownerContact ? ownerContact.n : 'Someone';

  // Pre-generate bridge link invite code async
  let bridgeLink = '';
  try {
    const encoded = await encodeGroup(groupContacts, groupTag, senderName, null);
    const appRoot = (window.location.origin.startsWith('http') ? window.location.origin : 'https://greatuncle.app') + '/';
    bridgeLink = `${appRoot}#invite=${encodeURIComponent(encoded)}`;
  } catch (e) {
    console.error('Failed to generate bridge link:', e);
  }

  // Header meta
  const meta = document.createElement('div');
  meta.className = 'form-section-label';
  meta.style.cssText = 'margin-bottom:0.25rem; font-size:0.85rem; opacity:0.7;';
  meta.textContent = `Drafting update for ${groupTag} (${groupContacts.length} people)`;
  content.appendChild(meta);

  // Split row for date and duration
  const splitRow = document.createElement('div');
  splitRow.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;';

  // Start Date field
  const dateField = document.createElement('div');
  dateField.className = 'form-field';
  const dateLabel = document.createElement('label');
  dateLabel.textContent = 'Start Date';
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'form-input';
  dateInput.value = getNearestFirstOfMonth().toISOString().split('T')[0];
  dateField.appendChild(dateLabel);
  dateField.appendChild(dateInput);
  splitRow.appendChild(dateField);

  // Timeframe field
  const durationField = document.createElement('div');
  durationField.className = 'form-field';
  const durationLabel = document.createElement('label');
  durationLabel.textContent = 'Timeframe';
  const durationSelect = document.createElement('select');
  durationSelect.className = 'form-input';
  const durOpt1 = document.createElement('option');
  durOpt1.value = 'monthly';
  durOpt1.textContent = 'Monthly (31d)';
  const durOpt2 = document.createElement('option');
  durOpt2.value = 'quarterly';
  durOpt2.textContent = 'Quarterly (92d)';
  durationSelect.appendChild(durOpt1);
  durationSelect.appendChild(durOpt2);
  
  const savedDuration = localStorage.getItem('newsletter_duration') || 'monthly';
  durationSelect.value = savedDuration;
  durationSelect.addEventListener('change', () => localStorage.setItem('newsletter_duration', durationSelect.value));

  durationField.appendChild(durationLabel);
  durationField.appendChild(durationSelect);
  splitRow.appendChild(durationField);
  content.appendChild(splitRow);

  // Subject field
  const subjectField = document.createElement('div');
  subjectField.className = 'form-field';
  const subjectLabel = document.createElement('label');
  subjectLabel.textContent = 'Email Subject';
  const subjectInput = document.createElement('input');
  subjectInput.type = 'text';
  subjectInput.className = 'form-input';
  subjectField.appendChild(subjectLabel);
  subjectField.appendChild(subjectInput);
  content.appendChild(subjectField);

  const updateDefaultSubject = () => {
    const date = new Date(dateInput.value);
    const month = date.toLocaleString('default', { month: 'long' });
    subjectInput.value = `${month} updates for Greatuncle.app @${groupName}`;
  };
  updateDefaultSubject();

  // Personal Note field
  const noteField = document.createElement('div');
  noteField.className = 'form-field';
  const noteLabel = document.createElement('label');
  noteLabel.textContent = 'Personal Note';
  const noteInput = document.createElement('textarea');
  noteInput.className = 'form-input';
  noteInput.rows = 2;
  noteInput.placeholder = 'A warm greeting for the circle...';
  noteField.appendChild(noteLabel);
  noteField.appendChild(noteInput);
  content.appendChild(noteField);

  // General News field
  const newsField = document.createElement('div');
  newsField.className = 'form-field';
  const newsLabel = document.createElement('label');
  newsLabel.textContent = 'General News';
  const newsInput = document.createElement('textarea');
  newsInput.className = 'form-input';
  newsInput.rows = 2;
  newsInput.placeholder = 'Other stories or shout-outs...';
  newsField.appendChild(newsLabel);
  newsField.appendChild(newsInput);
  content.appendChild(newsField);

  // Preview header & box
  const previewHeader = document.createElement('div');
  previewHeader.className = 'form-section-label';
  previewHeader.style.cssText = 'margin-top:0.5rem; margin-bottom:0.25rem;';
  previewHeader.textContent = 'Live Preview';
  content.appendChild(previewHeader);

  const previewBox = document.createElement('pre');
  previewBox.style.cssText = 'padding:0.75rem; background:var(--color-bg); font-size:0.8rem; white-space:pre-wrap; border:1px dashed var(--color-border); border-radius:var(--radius-s); max-height:160px; overflow-y:auto; margin:0; font-family:monospace;';
  content.appendChild(previewBox);

  // Update preview helper
  const updatePreview = () => {
    const draft = generateNewsletterDraft({
      groupName: groupTag,
      contacts: groupContacts,
      owner: ownerContact || { n: 'Owner', em: '' },
      startDate: dateInput.value,
      duration: durationSelect.value,
      personalNote: noteInput.value,
      generalNews: newsInput.value,
      bridgeLink: bridgeLink || '(Generating Bridge Link...)'
    });
    previewBox.textContent = `SUBJECT: ${subjectInput.value}\n\n${draft}`;
    return draft;
  };

  [dateInput, durationSelect, noteInput, newsInput, subjectInput].forEach(el => {
    el.addEventListener('input', updatePreview);
  });
  dateInput.addEventListener('change', () => {
    updateDefaultSubject();
    updatePreview();
  });

  // Action buttons row
  const actionRow = document.createElement('div');
  actionRow.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.5rem;';

  const emailBtn = document.createElement('button');
  emailBtn.className = 'trunk-btn trunk-btn--primary';
  emailBtn.textContent = '✉️ Prepare Email';
  emailBtn.addEventListener('click', () => {
    const draft = updatePreview();
    const ownerEmail = ownerContact?.em || '';
    const subject = encodeURIComponent(subjectInput.value);
    const body = encodeURIComponent(draft);
    window.location.href = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
    navigator.clipboard.writeText(draft);
  });

  const copyBtn = document.createElement('button');
  copyBtn.className = 'trunk-btn trunk-btn--secondary';
  copyBtn.textContent = '📋 Copy Body';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(updatePreview());
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => { copyBtn.textContent = '📋 Copy Body'; }, 2000);
  });

  const copyRecipientsBtn = document.createElement('button');
  copyRecipientsBtn.className = 'trunk-btn trunk-btn--secondary';
  copyRecipientsBtn.style.gridColumn = 'span 2';
  copyRecipientsBtn.textContent = '👥 Copy Recipient Emails';
  copyRecipientsBtn.addEventListener('click', () => {
    const emails = groupContacts.map(c => c.em).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emails);
    const count = groupContacts.map(c => c.em).filter(Boolean).length;
    copyRecipientsBtn.textContent = `✅ Copied ${count} Emails`;
    setTimeout(() => { copyRecipientsBtn.textContent = '👥 Copy Recipient Emails'; }, 2000);
  });

  actionRow.appendChild(emailBtn);
  actionRow.appendChild(copyBtn);
  actionRow.appendChild(copyRecipientsBtn);
  content.appendChild(actionRow);

  // Initialize preview
  updatePreview();

  const { close } = showBottomSheet({
    title: `📜 Newsletter Composer`,
    content,
    onClose: onDone
  });
}
