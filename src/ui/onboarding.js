import { saveContact, getAllContacts } from '../storage/contacts.js';
import { generateId } from '../core/utils.js';

export function renderOnboarding(db, onComplete) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const screen = document.createElement('div');
  screen.className = 'onboarding-screen';

  const title = document.createElement('h1');
  title.className = 'onboarding-title';
  title.textContent = 'Greatuncle';

  const tagline = document.createElement('p');
  tagline.className = 'onboarding-tagline';
  tagline.textContent = 'Smart reminders to help you stay in touch.';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'form-input onboarding-field';
  nameInput.placeholder = 'Your name';
  nameInput.autocomplete = 'name';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.className = 'form-input onboarding-field';
  emailInput.placeholder = 'Your email (optional)';
  emailInput.autocomplete = 'email';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'onboarding-submit-btn';
  submitBtn.textContent = 'Get started';
  submitBtn.disabled = true;

  nameInput.addEventListener('input', () => {
    submitBtn.disabled = nameInput.value.trim() === '';
  });

  submitBtn.addEventListener('click', async () => {
    if (emailInput.value && !emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }

    let name = nameInput.value.trim();
    if (name) name = name.replace(/</g, '').substring(0, 100).trim();
    if (!name) return;

    let email = emailInput.value.trim() || null;
    if (email) email = email.replace(/</g, '').substring(0, 100).trim();

    const now = Date.now();
    const owner = {
      id: generateId(),
      name,
      phone: null,
      email,
      address: null,
      zip_code: null,
      birthday: null,
      anniversary: null,
      date_of_passing: null,
      tags: ['&owner'],
      last_contacted: null,
      snooze_until: null,
      notes: null,
      created_at: now,
      updated_at: now,
    };

    await saveContact(db, owner);

    // Check if any imported contacts match by email
    if (email) {
      const allContacts = await getAllContacts(db);
      const matches = allContacts.filter(c =>
        !(c.tags || []).includes('&owner') &&
        c.email && c.email.toLowerCase() === email.toLowerCase() &&
        (c.tags || []).includes('&dirty')
      );
      if (matches.length > 0) {
        const nudge = document.createElement('p');
        nudge.className = 'onboarding-match-nudge';
        nudge.textContent = `Found ${matches.length} imported contact(s) that may know you — check the People tab.`;
        screen.appendChild(nudge);
        setTimeout(() => onComplete(), 2500);
        return;
      }
    }

    onComplete();
  });

  const privacyNote = document.createElement('p');
  privacyNote.className = 'onboarding-privacy-note';
  privacyNote.style.fontSize = '0.85rem';
  privacyNote.style.opacity = '0.7';
  privacyNote.style.marginTop = '0.5rem';
  privacyNote.style.lineHeight = '1.4';
  privacyNote.textContent = 'Your name and email stay strictly on your device. Only you can choose to share them with others if you ever gift a group to someone else.';

  screen.appendChild(title);
  screen.appendChild(tagline);
  screen.appendChild(nameInput);
  screen.appendChild(emailInput);
  screen.appendChild(privacyNote);
  screen.appendChild(submitBtn);
  app.appendChild(screen);

  setTimeout(() => nameInput.focus(), 100);
}
