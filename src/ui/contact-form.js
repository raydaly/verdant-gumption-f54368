import { getContact, saveContact, deleteContact, getAllContacts } from '../storage/contacts.js';
import { getLogsForContact, deleteLogsForContact, restoreLogsForContact } from '../storage/logs.js';
import { addDeletedSinceExport, removeFromDeletedSinceExport, getSettings } from '../storage/settings.js';
import { createLevelSelector } from './components/level-selector.js';
import { createTagInput } from './components/tag-input.js';
import { showToast } from './components/toast.js';
import { showConfirmDialog } from './components/confirm-dialog.js';
import { showBottomSheet } from './components/bottom-sheet.js';
import { goBack, navigate } from './router.js';
import { sanitizeString } from '../core/sanitizer.js';
import { generateId } from '../core/utils.js';
import { encodeInvite } from '../core/seedling.js';

const LEVEL_TAGS = ['&level5', '&level15', '&level50', '&level150'];

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function makeDays() {
  const days = [];
  for (let i = 1; i <= 31; i++) {
    days.push({ value: String(i).padStart(2, '0'), label: String(i) });
  }
  return days;
}

function buildDateField(labelText, storedValue) {
  const field = document.createElement('div');
  field.className = 'form-field';

  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  field.appendChild(lbl);

  const wrap = document.createElement('div');
  wrap.className = 'date-field-wrap';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'form-input';

  const monthDayRow = document.createElement('div');
  monthDayRow.className = 'month-day-row';

  const monthSelect = document.createElement('select');
  const emptyMonthOpt = document.createElement('option');
  emptyMonthOpt.value = '';
  emptyMonthOpt.textContent = 'Month';
  monthSelect.appendChild(emptyMonthOpt);
  MONTHS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    monthSelect.appendChild(opt);
  });

  const daySelect = document.createElement('select');
  const emptyDayOpt = document.createElement('option');
  emptyDayOpt.value = '';
  emptyDayOpt.textContent = 'Day';
  daySelect.appendChild(emptyDayOpt);
  makeDays().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.value;
    opt.textContent = d.label;
    daySelect.appendChild(opt);
  });

  monthDayRow.appendChild(monthSelect);
  monthDayRow.appendChild(daySelect);

  const yearUnknownRow = document.createElement('div');
  yearUnknownRow.className = 'year-unknown-row';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const checkId = labelText.toLowerCase().replace(/\s/g, '-') + '-year-unknown';
  checkbox.id = checkId;

  const checkLabel = document.createElement('label');
  checkLabel.htmlFor = checkId;
  checkLabel.textContent = 'Year unknown';
  checkLabel.style.color = 'var(--color-text-muted)';
  checkLabel.style.fontSize = '0.875rem';
  checkLabel.style.display = 'inline';
  checkLabel.style.marginBottom = '0';

  yearUnknownRow.appendChild(checkbox);
  yearUnknownRow.appendChild(checkLabel);

  const isYearUnknown = storedValue && (storedValue.startsWith('0000-') || storedValue.startsWith('1904-'));
  if (isYearUnknown) {
    const parts = storedValue.split('-');
    monthSelect.value = parts[1] || '';
    daySelect.value = parts[2] || '';
    checkbox.checked = true;
    dateInput.hidden = true;
    monthDayRow.hidden = false;
  } else {
    dateInput.value = storedValue || '';
    checkbox.checked = false;
    dateInput.hidden = false;
    monthDayRow.hidden = true;
  }

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      dateInput.hidden = true;
      monthDayRow.hidden = false;
    } else {
      dateInput.hidden = false;
      monthDayRow.hidden = true;
    }
  });

  wrap.appendChild(dateInput);
  wrap.appendChild(monthDayRow);
  wrap.appendChild(yearUnknownRow);
  field.appendChild(wrap);

  field.getValue = () => {
    if (checkbox.checked) {
      const m = monthSelect.value;
      const d = daySelect.value;
      if (!m && !d) return null;
      return '0000-' + (m || '01') + '-' + (d || '01');
    }
    return dateInput.value || null;
  };

  return field;
}

export async function renderContactForm(db, contactId) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const allContacts = await getAllContacts(db);
  let existingContact = null;
  if (contactId) {
    existingContact = allContacts.find(c => c.id === contactId) || await getContact(db, contactId);
  }

  // Compute popular tags
  const tagCounts = {};
  allContacts.forEach(c => {
    (c.t || []).forEach(tag => {
      if (tag.startsWith('@') || tag.startsWith('#')) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
  });
  const popularTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]) // Descending frequency
    .map(e => e[0]);

  const isEdit = !!existingContact;
  const isOwner = isEdit && (existingContact.t || []).includes('&owner');
  const title = isEdit ? `Edit: ${existingContact.n}` : 'New Contact';
  const settings = await getSettings(db);

  let currentTags = existingContact ? [...(existingContact.t || [])] : [];
  let currentLevelTag = currentTags.find(t => LEVEL_TAGS.includes(t)) || null;

  const formView = document.createElement('div');
  formView.className = 'form-view';

  // Header
  const formHeader = document.createElement('div');
  formHeader.className = 'form-header';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'form-cancel-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => goBack());

  const h1 = document.createElement('h1');
  h1.textContent = title;

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'form-save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.disabled = true;

  formHeader.appendChild(cancelBtn);
  formHeader.appendChild(h1);
  formHeader.appendChild(saveBtn);

  // Body
  const formBody = document.createElement('div');
  formBody.className = 'form-body';

  // --- Relationship (Top Section) ---
  const relationshipSection = document.createElement('div');
  relationshipSection.className = 'form-section';

  const relLabel = document.createElement('div');
  relLabel.className = 'form-section-label';
  relLabel.textContent = 'Relationship';
  relationshipSection.appendChild(relLabel);

  const explainer = document.createElement('p');
  explainer.className = 'form-explainer';
  explainer.textContent = 'Choose your target for staying in touch, and tag them by community.';
  relationshipSection.appendChild(explainer);

  // Connection
  const levelSelector = createLevelSelector(currentLevelTag, (tag) => {
    currentLevelTag = tag;
  });
  relationshipSection.appendChild(levelSelector);

  // Tags
  let userTags = currentTags.filter(t => t.startsWith('#') || t.startsWith('@'));
  const tagInput = createTagInput(userTags, (updated) => {
    userTags = updated;
  }, popularTags);
  tagInput.style.marginTop = '1rem';
  relationshipSection.appendChild(tagInput);

  formBody.appendChild(relationshipSection);

  // --- Contact details ---
  const detailsSection = document.createElement('div');
  detailsSection.className = 'form-section';

  const detailsLabel = document.createElement('div');
  detailsLabel.className = 'form-section-label';
  detailsLabel.textContent = 'Contact details';
  detailsSection.appendChild(detailsLabel);

  function makeTextField(labelText, inputType, value) {
    const field = document.createElement('div');
    field.className = 'form-field';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    const input = document.createElement('input');
    input.type = inputType;
    input.className = 'form-input';
    input.value = value || '';
    field.appendChild(lbl);
    field.appendChild(input);
    field.getInput = () => input;
    return field;
  }

  const nameField = makeTextField('Name', 'text', existingContact?.n);
  const phoneField = makeTextField('Phone', 'tel', existingContact?.ph);
  const emailField = makeTextField('Email', 'email', existingContact?.em);
  const addressField = makeTextField('Address', 'text', existingContact?.ad);
  const zipField = makeTextField('Zip code', 'text', existingContact?.zp);

  const nameInput = nameField.getInput();
  nameInput.setAttribute('autocomplete', 'name');
  nameInput.setAttribute('required', '');

  if ('contacts' in navigator && 'ContactsManager' in window && !isEdit) {
    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.textContent = 'Import from Contacts';
    importBtn.className = 'trunk-btn trunk-btn--secondary';
    importBtn.style.marginBottom = '1.5rem';
    
    formBody.insertBefore(importBtn, relationshipSection);

    importBtn.addEventListener('click', async () => {
      try {
        const props = ['name', 'email', 'tel'];
        const contacts = await navigator.contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          if (c.name && c.name.length > 0) nameInput.value = c.name[0];
          if (c.tel && c.tel.length > 0) phoneField.getInput().value = c.tel[0];
          if (c.email && c.email.length > 0) emailField.getInput().value = c.email[0];
          checkSaveEnabled();
        }
      } catch (ex) {
        console.error('Contact picker failed:', ex);
      }
    });
  }

  const checkSaveEnabled = () => {
    saveBtn.disabled = nameInput.value.trim() === '';
  };
  nameInput.addEventListener('input', checkSaveEnabled);
  checkSaveEnabled();

  detailsSection.appendChild(nameField);
  detailsSection.appendChild(phoneField);
  detailsSection.appendChild(emailField);
  detailsSection.appendChild(addressField);
  detailsSection.appendChild(zipField);
  formBody.appendChild(detailsSection);

  // --- Dates ---
  const datesSection = document.createElement('div');
  datesSection.className = 'form-section';

  const datesLabel = document.createElement('div');
  datesLabel.className = 'form-section-label';
  datesLabel.textContent = 'Dates';
  datesSection.appendChild(datesLabel);

  const birthdayField = buildDateField('Birthday', existingContact?.bd || null);
  const anniversaryField = buildDateField('Anniversary', existingContact?.av || null);
  datesSection.appendChild(birthdayField);
  datesSection.appendChild(anniversaryField);

  let dateOfPassingField = null;
  if (settings.trackLegacy) {
    dateOfPassingField = buildDateField('Date of passing', existingContact?.dp || null);
    datesSection.appendChild(dateOfPassingField);
  }

  formBody.appendChild(datesSection);

  // --- Notes ---
  const notesSection = document.createElement('div');
  notesSection.className = 'form-section';

  const notesLabel = document.createElement('div');
  notesLabel.className = 'form-section-label';
  notesLabel.textContent = 'Notes';
  notesSection.appendChild(notesLabel);

  const notesField = document.createElement('div');
  notesField.className = 'form-field';
  const notesInput = document.createElement('textarea');
  notesInput.className = 'form-input';
  notesInput.style.minHeight = '100px';
  notesInput.style.resize = 'vertical';
  notesInput.placeholder = 'Background, connections, context…';
  notesInput.value = existingContact?.no || '';
  notesInput.maxLength = 1000;
  notesField.appendChild(notesInput);
  notesSection.appendChild(notesField);
  formBody.appendChild(notesSection);

  // Assemble
  formView.appendChild(formHeader);
  formView.appendChild(formBody);

  // Delete button (edit mode, non-owner only)
  if (isEdit && !isOwner) {
    const formFooter = document.createElement('div');
    formFooter.className = 'form-footer';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'form-delete-btn';
    deleteBtn.textContent = 'Delete contact';

    deleteBtn.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Delete contact',
        message: `Delete ${existingContact.n}? This will remove them from your circle.`,
        onConfirm: async () => {
          // Snapshot before deletion for undo
          const deletedContact = { ...existingContact };
          const deletedLogs = await getLogsForContact(db, contactId);

          await deleteContact(db, contactId);
          await deleteLogsForContact(db, contactId);
          addDeletedSinceExport(contactId);

          goBack();

          showToast('Contact deleted', async () => {
            await saveContact(db, deletedContact);
            await restoreLogsForContact(db, deletedLogs);
            removeFromDeletedSinceExport(contactId);
            navigate('people');
          });
        },
      });
    });

    formFooter.appendChild(deleteBtn);
    formView.appendChild(formFooter);
  }

  app.appendChild(formView);

  // Save handler
  saveBtn.addEventListener('click', async () => {
    const emailNode = emailField.getInput();
    if (emailNode.value && !emailNode.checkValidity()) {
      emailNode.reportValidity();
      return;
    }

    let name = sanitizeString(nameInput.value, 100);
    if (!name) return;

    const originalAddress = existingContact?.ad || null;
    let newAddress = sanitizeString(addressField.getInput().value, 200);

    let safePhone = sanitizeString(phoneField.getInput().value, 50);
    let safeEmail = sanitizeString(emailField.getInput().value, 100);
    let safeZip = sanitizeString(zipField.getInput().value, 20);
    let safeNotes = sanitizeString(notesInput.value, 1000);

    const systemTags = currentTags.filter(t => t.startsWith('&') || t.startsWith('!'));
    const nonLevelSystemTags = systemTags.filter(t => !LEVEL_TAGS.includes(t));
    const newSystemTags = [...nonLevelSystemTags];
    if (currentLevelTag) newSystemTags.push(currentLevelTag);
    if (!newSystemTags.includes('&dirty')) newSystemTags.push('&dirty');

    const safeUserTags = userTags
      .map(t => sanitizeString(t, 50))
      .filter(t => t && (t.startsWith('@') || t.startsWith('#')));

    const finalTags = [...newSystemTags, ...safeUserTags];

    const contact = {
      id: existingContact?.id || generateId(),
      n: name,
      ph: safePhone,
      em: safeEmail,
      ad: newAddress,
      zp: safeZip,
      bd: birthdayField.getValue(),
      av: anniversaryField.getValue(),
      dp: dateOfPassingField
        ? dateOfPassingField.getValue()
        : (existingContact?.dp ?? null),
      t: finalTags,
      lc: existingContact?.lc || null,
      su: existingContact?.su || null,
      no: safeNotes,
      ca: existingContact?.ca || Date.now(),
      ua: Date.now(),
    };

    await saveContact(db, contact);

    // --- Phase 3: Stewardship Correction Routing ---
    // Only trigger for edits (not new contacts) that have @group tags.
    if (isEdit) {
      const groupTags = finalTags.filter(t => t.startsWith('@'));
      if (groupTags.length > 0) {
        const freshContacts = await getAllContacts(db);
        // Find all stewards who curate any of this contact's groups
        const stewards = [];
        groupTags.forEach(groupTag => {
          const groupName = groupTag.replace(/^@/, '');
          const stewardTag = `&steward.${groupName}`;
          freshContacts.forEach(c => {
            if (
              (c.t || []).includes(stewardTag) &&
              !stewards.find(s => s.id === c.id)
            ) {
              stewards.push({ ...c, _stewardsFor: groupTag });
            }
          });
        });

        if (stewards.length > 0) {
          const base = `${window.location.origin}${window.location.pathname}`;
          const correctionCode = encodeInvite(contact);
          const correctionUrl = `${base}?invite=${correctionCode}`;

          const content = document.createElement('div');
          content.style.cssText = 'display:flex;flex-direction:column;gap:1rem;padding:0.5rem 0;';

          const msg = document.createElement('p');
          msg.style.cssText = 'margin:0;font-size:0.95rem;line-height:1.5;';
          msg.innerHTML = `You updated <strong>${contact.n}</strong>. The following Greatuncle(s) curate groups this person belongs to. Would you like to forward this correction?`;
          content.appendChild(msg);

          stewards.forEach(steward => {
            const stewardRow = document.createElement('div');
            stewardRow.style.cssText = 'border-top:1px solid var(--color-bg-accent);padding-top:0.75rem;display:flex;flex-direction:column;gap:0.5rem;';

            const stewardLabel = document.createElement('p');
            stewardLabel.style.cssText = 'margin:0;font-size:0.85rem;opacity:0.7;';
            stewardLabel.textContent = `${steward.n} — curates ${steward._stewardsFor}`;
            stewardRow.appendChild(stewardLabel);

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;';

            if (steward.ph) {
              const smsBtn = document.createElement('a');
              smsBtn.className = 'trunk-btn trunk-btn--primary';
              smsBtn.style.cssText = 'flex:1;text-align:center;text-decoration:none;';
              smsBtn.href = `sms:${steward.ph}?body=${encodeURIComponent('Hi ' + steward.n + ', here is an updated contact record: ' + correctionUrl)}`;
              smsBtn.textContent = `Text ${steward.n}`;
              btnRow.appendChild(smsBtn);
            }

            if (steward.em) {
              const emailBtn = document.createElement('a');
              emailBtn.className = steward.ph ? 'trunk-btn trunk-btn--secondary' : 'trunk-btn trunk-btn--primary';
              emailBtn.style.cssText = 'flex:1;text-align:center;text-decoration:none;';
              emailBtn.href = `mailto:${steward.em}?subject=${encodeURIComponent('Contact Update: ' + contact.n)}&body=${encodeURIComponent('Hi ' + steward.n + ', here is an updated contact record: ' + correctionUrl)}`;
              emailBtn.textContent = `Email ${steward.n}`;
              btnRow.appendChild(emailBtn);
            }

            stewardRow.appendChild(btnRow);
            content.appendChild(stewardRow);
          });

          const skipBtn = document.createElement('button');
          skipBtn.type = 'button';
          skipBtn.className = 'trunk-btn trunk-btn--secondary';
          skipBtn.style.marginTop = '0.25rem';
          skipBtn.textContent = 'Skip for now';
          content.appendChild(skipBtn);

          const { close } = showBottomSheet({ title: 'Forward Correction?', content });
          skipBtn.addEventListener('click', () => close());
          // SMS/email links navigate away naturally, so closing is automatic
        }
      }
    }

    // Feedback: Success Transform
    saveBtn.textContent = 'Saved ✓';
    saveBtn.style.color = '#2e7d32'; // Forest Green
    saveBtn.disabled = true;

    // Address "update all" prompt
    if (isEdit && originalAddress && newAddress !== originalAddress) {
      const allContactsAfter = await getAllContacts(db);
      const candidates = allContactsAfter.filter(c =>
        c.ad === originalAddress && c.id !== contact.id
      );
      if (candidates.length > 0) {
        const names = candidates.map(c => c.n).join(', ');
        const confirmed = window.confirm(
          `Also update address for ${names}?`
        );
        if (confirmed) {
          for (const c of candidates) {
            const updatedTags = [...(c.t || [])];
            if (!updatedTags.includes('&dirty')) updatedTags.push('&dirty');
            await saveContact(db, { ...c, ad: newAddress, t: updatedTags, ua: Date.now() });
          }
        }
      }
    }

    setTimeout(() => {
      goBack();
    }, 500);
  });
}
