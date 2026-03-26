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

  // --- STEP 1: Identity Picker (Finding your seat) ---
  if (availableContacts.length > 0) {
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'onboarding-picker';
    
    const prompt = document.createElement('p');
    prompt.style.marginBottom = '1.5rem';
    prompt.style.fontWeight = '500';
    prompt.textContent = "Which of these seats is yours? Someone shared this gift with you, and you might be in it.";
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

function showConfirmationForm(db, contact, container, onComplete) {
  container.innerHTML = '';
  
  const title = document.createElement('h1');
  title.className = 'onboarding-title';
  title.textContent = 'Claim Your Seat';

  const tagline = document.createElement('p');
  tagline.className = 'onboarding-tagline';
  tagline.innerHTML = `Great! We'll use <strong>${contact.n}</strong> as your owner profile. You've transitioned to <strong>Sustaining Mode</strong>. Check your details below:`;

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
  submitBtn.textContent = 'Claim Profile & Get Started';

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
  container.appendChild(bdInput);
  container.appendChild(avInput);
  container.appendChild(submitBtn);
}

function showManualEntry(db, container, onComplete) {
  container.innerHTML = ''; // Clear existing content if any

  const title = document.createElement('h1');
  title.className = 'onboarding-title';
  title.textContent = 'Taking Stewardship';

  const tagline = document.createElement('p');
  tagline.className = 'onboarding-tagline';
  tagline.textContent = 'Transition to Owner Mode to start sustaining your circle.';

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

  const bdInput = document.createElement('input');
  bdInput.type = 'date';
  bdInput.className = 'form-input onboarding-field';
  bdInput.placeholder = 'Your birthday (optional)';

  const avInput = document.createElement('input');
  avInput.type = 'date';
  avInput.className = 'form-input onboarding-field';
  avInput.placeholder = 'Your anniversary (optional)';

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
    let birthday = bdInput.value || null;
    let anniversary = avInput.value || null;

    const now = Date.now();
    const owner = {
      id: generateId(),
      n: name,
      ph: null,
      em: email,
      ad: null,
      zp: null,
      bd: birthday,
      av: anniversary,
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
  privacyNote.innerHTML = 'Your name and email stay strictly on your device.<br>Only you can choose to share them.';

  container.appendChild(title);
  container.appendChild(tagline);
  container.appendChild(nameInput);
  container.appendChild(emailInput);
  container.appendChild(privacyNote);
  container.appendChild(submitBtn);
}
