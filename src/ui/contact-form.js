import { getContact, saveContact, deleteContact, getAllContacts } from '../storage/contacts.js';
import { getLogsForContact, deleteLogsForContact, restoreLogsForContact } from '../storage/logs.js';
import { addDeletedSinceExport, removeFromDeletedSinceExport, getSettings } from '../storage/settings.js';
import { createLevelSelector } from './components/level-selector.js';
import { createTagInput } from './components/tag-input.js';
import { showToast } from './components/toast.js';
import { showConfirmDialog } from './components/confirm-dialog.js';
import { goBack, navigate } from './router.js';
import { sanitizeString } from '../core/sanitizer.js';
import { generateId } from '../core/utils.js';

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

  let existingContact = null;
  if (contactId) {
    existingContact = await getContact(db, contactId);
  }

  const isEdit = !!existingContact;
  const isOwner = isEdit && (existingContact.tags || []).includes('&owner');
  const title = isEdit ? 'Edit Contact' : 'New Contact';
  const settings = await getSettings(db);

  let currentTags = existingContact ? [...(existingContact.tags || [])] : [];
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

  const nameField = makeTextField('Name', 'text', existingContact?.name);
  const phoneField = makeTextField('Phone', 'tel', existingContact?.phone);
  const emailField = makeTextField('Email', 'email', existingContact?.email);
  const addressField = makeTextField('Address', 'text', existingContact?.address);
  const zipField = makeTextField('Zip code', 'text', existingContact?.zip_code);

  const nameInput = nameField.getInput();
  nameInput.setAttribute('autocomplete', 'name');
  nameInput.setAttribute('required', '');

  if ('contacts' in navigator && 'ContactsManager' in window && !isEdit) {
    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.textContent = '👤+';
    importBtn.className = 'trunk-btn trunk-btn--secondary';
    importBtn.style.padding = '0 12px';
    importBtn.style.fontSize = '1.2rem';
    importBtn.title = 'Import from device';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '8px';
    
    nameField.insertBefore(wrapper, nameInput);
    wrapper.appendChild(nameInput);
    nameInput.style.flex = '1';
    wrapper.appendChild(importBtn);

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

  const birthdayField = buildDateField('Birthday', existingContact?.birthday || null);
  const anniversaryField = buildDateField('Anniversary', existingContact?.anniversary || null);
  datesSection.appendChild(birthdayField);
  datesSection.appendChild(anniversaryField);

  let dateOfPassingField = null;
  if (settings.trackLegacy) {
    dateOfPassingField = buildDateField('Date of passing', existingContact?.date_of_passing || null);
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
  notesInput.value = existingContact?.notes || '';
  notesInput.maxLength = 1000;
  notesField.appendChild(notesInput);
  notesSection.appendChild(notesField);
  formBody.appendChild(notesSection);

  // --- Connection ---
  const connectionSection = document.createElement('div');
  connectionSection.className = 'form-section';

  const connectionLabel = document.createElement('div');
  connectionLabel.className = 'form-section-label';
  connectionLabel.textContent = 'Connection';
  connectionSection.appendChild(connectionLabel);

  const explainer = document.createElement('p');
  explainer.className = 'form-explainer';
  explainer.textContent = 'How often do you want to stay in touch?';
  connectionSection.appendChild(explainer);

  const levelSelector = createLevelSelector(currentLevelTag, (tag) => {
    currentLevelTag = tag;
  });
  connectionSection.appendChild(levelSelector);
  formBody.appendChild(connectionSection);

  // --- Tags ---
  const tagsSection = document.createElement('div');
  tagsSection.className = 'form-section';

  const tagsLabel = document.createElement('div');
  tagsLabel.className = 'form-section-label';
  tagsLabel.textContent = 'Tags';
  tagsSection.appendChild(tagsLabel);

  let userTags = currentTags.filter(t => t.startsWith('#') || t.startsWith('@'));

  const tagInput = createTagInput(userTags, (updated) => {
    userTags = updated;
  });
  tagsSection.appendChild(tagInput);
  formBody.appendChild(tagsSection);

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
        message: `Delete ${existingContact.name}? This will remove them from your circle.`,
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

    const originalAddress = existingContact?.address || null;
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
      name,
      phone: safePhone,
      email: safeEmail,
      address: newAddress,
      zip_code: safeZip,
      birthday: birthdayField.getValue(),
      anniversary: anniversaryField.getValue(),
      date_of_passing: dateOfPassingField
        ? dateOfPassingField.getValue()
        : (existingContact?.date_of_passing ?? null),
      tags: finalTags,
      last_contacted: existingContact?.last_contacted || null,
      snooze_until: existingContact?.snooze_until || null,
      notes: safeNotes,
      created_at: existingContact?.created_at || Date.now(),
      updated_at: Date.now(),
    };

    await saveContact(db, contact);

    // Address "update all" prompt
    if (isEdit && originalAddress && newAddress !== originalAddress) {
      const allContacts = await getAllContacts(db);
      const candidates = allContacts.filter(c =>
        c.address === originalAddress && c.id !== contact.id
      );
      if (candidates.length > 0) {
        const names = candidates.map(c => c.name).join(', ');
        const confirmed = window.confirm(
          `Also update address for ${names}?`
        );
        if (confirmed) {
          for (const c of candidates) {
            const updatedTags = [...(c.tags || [])];
            if (!updatedTags.includes('&dirty')) updatedTags.push('&dirty');
            await saveContact(db, { ...c, address: newAddress, tags: updatedTags, updated_at: Date.now() });
          }
        }
      }
    }

    goBack();
  });
}
