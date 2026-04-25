import { saveContact, getAllContacts } from '../storage/contacts.js';
import { generateId } from '../core/utils.js';

export async function renderOnboarding(db, onComplete) {
  const allContacts = await getAllContacts(db);
  // Filter out any contacts that are already Owners (though there shouldn't be any yet)
  const availableContacts = allContacts.filter(c => !(c.t || []).includes('&owner'));

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
  
  screen.appendChild(title);
  screen.appendChild(tagline);

  // --- Option H: Auto-identify recipient from invite metadata ---
  let recipientHint = '';
  let autoMatchedContact = null;
  try {
    const meta = JSON.parse(sessionStorage.getItem('lastImportMeta') || '{}');
    recipientHint = (meta.recipientName || '').toLowerCase().trim();
  } catch(e) {}

  if (recipientHint && availableContacts.length > 0) {
    const exactMatches = availableContacts.filter(c =>
      (c.n || '').toLowerCase() === recipientHint
    );
    const fuzzyMatches = exactMatches.length === 0
      ? availableContacts.filter(c => (c.n || '').toLowerCase().includes(recipientHint))
      : [];
    const match = exactMatches.length === 1 ? exactMatches[0]
                : fuzzyMatches.length === 1  ? fuzzyMatches[0]
                : null;

    if (match) {
      autoMatchedContact = match;
    }
  }

  if (autoMatchedContact) {
    // Skip the picker — go straight to "Is this you?" confirmation
    showIsThisYouCard(db, autoMatchedContact, screen, onComplete);
  } else if (availableContacts.length > 0) {
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'onboarding-picker';
    
    const prompt = document.createElement('p');
    prompt.style.cssText = 'margin-bottom: 2rem; font-weight: 500; font-size: 1rem; line-height: 1.5; color: var(--color-text-muted);';
    prompt.textContent = "Someone who cares about you has shared their private address book with you. Please verify your name below:";
    pickerContainer.appendChild(prompt);

    // Get recipient name hint if available
    let recipientHint = '';
    try {
      const meta = JSON.parse(sessionStorage.getItem('lastImportMeta') || '{}');
      recipientHint = (meta.recipientName || '').toLowerCase().trim();
    } catch(e) {}

    // Sort available contacts: matches first, then alpha
    const sorted = [...availableContacts].sort((a, b) => {
      const aMatch = recipientHint && a.n.toLowerCase().includes(recipientHint);
      const bMatch = recipientHint && b.n.toLowerCase().includes(recipientHint);
      if (aMatch && !bMatch) return -1;
      if (bMatch && !aMatch) return 1;
      return a.n.localeCompare(b.n);
    });

    const list = document.createElement('div');
    list.className = 'onboarding-picker-list';
    list.style.maxHeight = '300px';
    list.style.overflowY = 'auto';
    list.style.marginBottom = '1.5rem';
    list.style.border = '1px solid var(--color-bg-accent)';
    list.style.borderRadius = '12px';
    list.style.background = 'var(--color-bg-card)';

    sorted.slice(0, 50).forEach(contact => {
      const item = document.createElement('button');
      item.className = 'onboarding-picker-item';
      item.style.width = '100%';
      item.style.padding = '12px 16px';
      item.style.textAlign = 'left';
      item.style.border = 'none';
      item.style.borderBottom = '1px solid var(--color-bg-accent)';
      item.style.background = 'transparent';
      item.style.cursor = 'pointer';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      
      const name = document.createElement('span');
      name.textContent = contact.n;
      name.style.fontWeight = (recipientHint && contact.n.toLowerCase().includes(recipientHint)) ? '600' : '400';
      
      const arrow = document.createElement('span');
      arrow.textContent = '→';
      arrow.style.opacity = '0.3';
      
      item.appendChild(name);
      item.appendChild(arrow);
      
      item.onclick = () => {
        // Confirm identity
        showConfirmationForm(db, contact, screen, onComplete);
      };
      list.appendChild(item);
    });

    pickerContainer.appendChild(list);

    const orText = document.createElement('p');
    orText.style.textAlign = 'center';
    orText.style.fontSize = '0.9rem';
    orText.style.color = 'var(--color-text-muted)';
    orText.style.margin = '1rem 0';
    orText.textContent = "— or —";
    pickerContainer.appendChild(orText);

    const noneBtn = document.createElement('button');
    noneBtn.className = 'onboarding-submit-btn';
    noneBtn.style.background = 'transparent';
    noneBtn.style.color = 'var(--color-text)';
    noneBtn.style.border = '1.5px solid var(--color-bg-accent)';
    noneBtn.textContent = "I'm not in this list / Create New";
    noneBtn.onclick = () => {
      pickerContainer.remove();
      showManualEntry(db, screen, onComplete);
    };
    pickerContainer.appendChild(noneBtn);

    screen.appendChild(pickerContainer);
  } else {
    showManualEntry(db, screen, onComplete);
  }

  app.appendChild(screen);
}

function showIsThisYouCard(db, contact, container, onComplete) {
  container.innerHTML = '';

  const title = document.createElement('h1');
  title.className = 'onboarding-title';
  title.textContent = 'Greatuncle';

  let senderName = '';
  let groupName = '';
  try {
    const meta = JSON.parse(sessionStorage.getItem('lastImportMeta') || '{}');
    senderName = meta.senderName || '';
    groupName = meta.groupName || '';
  } catch(e) {}

  const greeting = document.createElement('p');
  greeting.className = 'onboarding-tagline';
  greeting.style.marginBottom = '1.5rem';
  greeting.innerHTML = senderName
    ? `<strong>${senderName}</strong> has invited you into their circle${groupName ? ` — the <em>${groupName}</em>` : ''}.`
    : `You've been invited into a shared circle.`;

  // The "Is this you?" card
  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--color-bg-card);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-l);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    text-align: center;
  `;

  const prompt = document.createElement('p');
  prompt.style.cssText = 'font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 0.5rem;';
  prompt.textContent = 'We found your seat at the table:';

  const nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size: 1.6rem; font-weight: 700; font-family: var(--font-serif); color: var(--color-primary); margin-bottom: 0.25rem;';
  nameEl.textContent = contact.n;

  const subEl = document.createElement('div');
  subEl.style.cssText = 'font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1.25rem;';
  const parts = [contact.ph, contact.em].filter(Boolean);
  subEl.textContent = parts.join(' · ') || '';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'onboarding-submit-btn';
  yesBtn.textContent = `Yes, that's me →`;
  yesBtn.onclick = () => showConfirmationForm(db, contact, container, onComplete);

  const noBtn = document.createElement('button');
  noBtn.type = 'button';
  noBtn.style.cssText = 'display: block; margin: 0.75rem auto 0; background: none; border: none; color: var(--color-text-muted); font-size: 0.85rem; cursor: pointer; text-decoration: underline;';
  noBtn.textContent = "That's not me — show the full list";
  noBtn.onclick = async () => {
    // Clear the auto-match hint so we don't loop back to the same card
    try {
      const meta = JSON.parse(sessionStorage.getItem('lastImportMeta') || '{}');
      delete meta.recipientName;
      sessionStorage.setItem('lastImportMeta', JSON.stringify(meta));
    } catch(e) {}
    container.innerHTML = '';
    renderOnboarding(db, onComplete);
  };

  card.appendChild(prompt);
  card.appendChild(nameEl);
  card.appendChild(subEl);
  card.appendChild(yesBtn);
  card.appendChild(noBtn);

  container.appendChild(title);
  container.appendChild(greeting);
  container.appendChild(card);
}

function showConfirmationForm(db, contact, container, onComplete) {
  container.innerHTML = '';
  
  const title = document.createElement('h1');
  title.className = 'onboarding-title';
  title.style.fontFamily = 'var(--font-serif)';
  title.textContent = 'Greatuncle';

  const tagline = document.createElement('p');
  tagline.className = 'onboarding-tagline';
  tagline.innerHTML = `Great! We'll use <strong>${contact.n}</strong> as your seat in this circle. This choice stays strictly on your device. Just a few more details to help us remind you of the people you love:`;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'form-input onboarding-field';
  nameInput.value = contact.n;
  nameInput.placeholder = 'Your name';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.className = 'form-input onboarding-field';
  emailInput.value = contact.em || '';
  emailInput.placeholder = 'Your email (optional)';

  const submitBtn = document.createElement('button');
  submitBtn.className = 'onboarding-submit-btn';
  submitBtn.textContent = 'Get started';

  submitBtn.onclick = async () => {
    const now = Date.now();
    const updated = {
      ...contact,
      n: nameInput.value.trim(),
      em: emailInput.value.trim() || null,
      t: [...new Set([...(contact.t || []), '&owner'])],
      ua: now
    };
    await saveContact(db, updated);
    onComplete();
  };

  container.appendChild(title);
  container.appendChild(tagline);
  container.appendChild(nameInput);
  container.appendChild(emailInput);
  container.appendChild(submitBtn);
}

function showManualEntry(db, container, onComplete) {
  container.innerHTML = ''; // Clear existing content if any

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
    let name = nameInput.value.trim();
    if (!name) return;
    let email = emailInput.value.trim() || null;

    const now = Date.now();
    const owner = {
      id: generateId(),
      n: name,
      ph: null,
      em: email,
      ad: null,
      zp: null,
      bd: null,
      av: null,
      dp: null,
      t: ['&owner'],
      lc: null,
      su: null,
      no: null,
      ca: now,
      ua: now,
    };

    await saveContact(db, owner);
    onComplete();
  });

  const privacyNote = document.createElement('p');
  privacyNote.className = 'onboarding-privacy-note';
  privacyNote.style.marginTop = '2rem';
  privacyNote.style.fontSize = '0.85rem';
  privacyNote.innerHTML = 'Your data stays strictly on your device.<br><strong>No Cloud. No Ads. No Prying Eyes.</strong>';

  container.appendChild(title);
  container.appendChild(tagline);
  container.appendChild(nameInput);
  container.appendChild(emailInput);
  container.appendChild(privacyNote);
  container.appendChild(submitBtn);

  // --- Invite Fallback ---
  const inviteFallback = document.createElement('div');
  inviteFallback.style.marginTop = '3rem';
  inviteFallback.style.textAlign = 'center';
  inviteFallback.style.borderTop = '1px solid var(--color-bg-accent)';
  inviteFallback.style.paddingTop = '1.5rem';

  const inviteText = document.createElement('p');
  inviteText.style.fontSize = '0.9rem';
  inviteText.style.color = 'var(--color-text-muted)';
  inviteText.textContent = "Have an invite link that didn't load?";
  inviteFallback.appendChild(inviteText);

  const inviteBtn = document.createElement('button');
  inviteBtn.type = 'button';
  inviteBtn.className = 'trunk-btn trunk-btn--secondary';
  inviteBtn.style.marginTop = '0.5rem';
  inviteBtn.style.fontSize = '0.85rem';
  inviteBtn.textContent = 'Paste Invite Link Manually';
  
  const inputContainer = document.createElement('div');
  inputContainer.style.display = 'none';
  inputContainer.style.marginTop = '1rem';

  const manualInput = document.createElement('input');
  manualInput.type = 'text';
  manualInput.className = 'form-input';
  manualInput.placeholder = 'Paste link here...';
  manualInput.style.marginBottom = '0.5rem';

  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'trunk-btn';
  goBtn.textContent = 'Import Now';
  goBtn.onclick = () => {
    const code = manualInput.value.trim();
    if (code) {
      window.location.hash = code.includes('#') ? code.split('#')[1] : 'invite=' + code;
      window.location.reload();
    }
  };

  inputContainer.appendChild(manualInput);
  inputContainer.appendChild(goBtn);

  inviteBtn.onclick = () => {
    inviteBtn.style.display = 'none';
    inputContainer.style.display = 'block';
    manualInput.focus();
  };

  inviteFallback.appendChild(inviteBtn);
  inviteFallback.appendChild(inputContainer);
  container.appendChild(inviteFallback);
}
