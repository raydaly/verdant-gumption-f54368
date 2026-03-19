import { addLog } from '../../storage/logs.js';
import { getAllContacts, saveContact } from '../../storage/contacts.js';
import { showBottomSheet } from './bottom-sheet.js';

export function showConnectedSheet(db, contactId, onDone) {
  const content = document.createElement('div');

  const label = document.createElement('div');
  label.className = 'form-field';

  const labelText = document.createElement('label');
  labelText.textContent = 'How did you connect? (optional)';
  labelText.style.cssText = 'display:block;font-size:0.875rem;color:var(--color-text-muted);margin-bottom:0.3rem';

  const textarea = document.createElement('textarea');
  textarea.className = 'form-input';
  textarea.rows = 3;
  textarea.style.resize = 'none';
  textarea.placeholder = 'A quick note…';

  label.appendChild(labelText);
  label.appendChild(textarea);
  content.appendChild(label);

  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'trunk-btn';
  doneBtn.style.marginTop = '1rem';
  doneBtn.textContent = 'Done';
  content.appendChild(doneBtn);

  const { close } = showBottomSheet({ title: 'Connected!', content });

  doneBtn.addEventListener('click', async () => {
    const now = Date.now();
    const comment = textarea.value.trim() || null;
    await addLog(db, contactId, now, comment);
    const contacts = await getAllContacts(db);
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      await saveContact(db, { ...contact, last_contacted: now });
    }
    close();
    if (onDone) onDone();
  });

  setTimeout(() => textarea.focus(), 100);
}
