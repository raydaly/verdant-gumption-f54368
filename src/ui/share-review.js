import { getAllContacts, saveContact, deleteContact } from '../storage/contacts.js';
import { navigate } from './router.js';

const DIFF_FIELDS = ['phone', 'email', 'address', 'zip_code', 'birthday', 'anniversary'];

function normalizePhone(p) {
  if (!p) return '';
  return p.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
}

function formatField(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export async function renderShareReview(db) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const allContacts = await getAllContacts(db);
  const pending = allContacts.filter(c => (c.tags || []).includes('&share'));

  if (pending.length === 0) {
    navigate('people');
    return;
  }

  // Header
  const header = document.createElement('div');
  header.className = 'view-header';

  const h1 = document.createElement('h1');
  h1.textContent = `Review Imports (${pending.length})`;

  const skipAllBtn = document.createElement('button');
  skipAllBtn.className = 'header-icon-btn';
  skipAllBtn.textContent = '✕';
  skipAllBtn.setAttribute('aria-label', 'Skip all');
  skipAllBtn.addEventListener('click', async () => {
    if (confirm(`Discard all ${pending.length} pending imports?`)) {
      for (const p of pending) {
        await deleteContact(db, p.id);
      }
      navigate('people');
    }
  });

  header.appendChild(h1);
  const headerRight = document.createElement('div');
  headerRight.className = 'view-header-right';

  const acceptAllBtn = document.createElement('button');
  acceptAllBtn.className = 'header-icon-btn';
  acceptAllBtn.textContent = '⚡️';
  acceptAllBtn.title = 'Accept all identical & smart merges';
  acceptAllBtn.setAttribute('aria-label', 'Accept all easy updates');
  acceptAllBtn.addEventListener('click', async () => {
    let count = 0;
    for (const p of pending) {
      const match = allContacts.find(c => c.id === p.matchedId);
      if (match) {
        // If there are zero conflicts, we can auto-accept
        let hasConflict = false;
        const updates = { tags: new Set(match.tags || []) };
        for (const f of DIFF_FIELDS) {
          if (p[f] && match[f] && p[f].toString() !== match[f].toString()) {
            hasConflict = true; 
            break;
          }
          if (p[f] && !match[f]) {
            updates[f] = p[f];
          }
        }

        if (!hasConflict) {
          const merged = { ...match, ...updates, tags: [...updates.tags, '&dirty'], updated_at: Date.now() };
          await saveContact(db, merged);
          await deleteContact(db, p.id);
          count++;
        }
      }
    }
    if (count > 0) {
      alert(`Auto-accepted ${count} non-conflicting updates.`);
      renderShareReview(db);
    } else {
      alert("No easy merges found. Please review these manually.");
    }
  });

  headerRight.appendChild(acceptAllBtn);
  headerRight.appendChild(skipAllBtn);
  header.appendChild(headerRight);
  app.appendChild(header);

  const content = document.createElement('div');
  content.className = 'view-content';

  const meta = document.createElement('p');
  meta.className = 'share-review-meta';
  meta.textContent = 'Decide how to handle these incoming contacts.';
  content.appendChild(meta);

  // Auto-suggest bulk tag based on common incoming group tags
  const groupCounts = {};
  pending.forEach(p => {
    (p.tags || []).filter(t => t.startsWith('@')).forEach(tag => {
      groupCounts[tag] = (groupCounts[tag] || 0) + 1;
    });
  });
  let suggestedTag = '';
  let maxCount = 0;
  for (const [tag, count] of Object.entries(groupCounts)) {
    if (count > maxCount) {
      maxCount = count;
      suggestedTag = tag;
    }
  }

  for (const pendingContact of pending) {
    const matchedId = pendingContact.matchedId;
    const existingContact = matchedId ? allContacts.find(c => c.id === matchedId) : null;
    const isDuplicate = (pendingContact.tags || []).includes('&duplicate');

    const card = document.createElement('div');
    card.className = 'share-review-card';

    // Name
    const nameRow = document.createElement('div');
    nameRow.className = 'share-review-name';
    nameRow.textContent = pendingContact.name;
    if (isDuplicate) {
      const badge = document.createElement('span');
      badge.className = 'share-review-badge';
      badge.textContent = 'Already exists';
      nameRow.appendChild(badge);
    }
    card.appendChild(nameRow);

    const detailsRow = document.createElement('div');
    detailsRow.className = 'share-review-details';
    const parts = [pendingContact.phone, pendingContact.email].filter(Boolean);
    detailsRow.textContent = parts.join(' · ') || '(no contact info)';
    card.appendChild(detailsRow);

    // Card State for Merge
    const mergeChoices = {}; // field -> 'original' or 'shared'

    if (isDuplicate && existingContact) {
      const diffSection = document.createElement('div');
      diffSection.className = 'share-review-diffs';

      let hasConflicts = false;
      let hasSmartMerges = false;

      for (const field of DIFF_FIELDS) {
        const mine = existingContact[field];
        const theirs = pendingContact[field];

        if (theirs && theirs !== mine) {
          if (!mine) {
            // Smart Merge: we have nothing, they have something. Auto-accept.
            hasSmartMerges = true;
            mergeChoices[field] = 'shared';
          } else {
            // Conflict: we both have values and they differ.
            hasConflicts = true;
            mergeChoices[field] = 'original'; // Default to mine

            const conflictRow = document.createElement('div');
            conflictRow.className = 'conflict-row';
            
            const fieldLabel = document.createElement('div');
            fieldLabel.className = 'share-review-diff-label';
            fieldLabel.textContent = formatField(field);
            conflictRow.appendChild(fieldLabel);

            const options = document.createElement('div');
            options.className = 'conflict-options';

            const optMine = document.createElement('div');
            optMine.className = 'conflict-option conflict-option--selected';
            optMine.innerHTML = `<span class="conflict-val-label">Keep Mine</span><span class="conflict-val">${mine}</span>`;
            
            const optTheirs = document.createElement('div');
            optTheirs.className = 'conflict-option';
            optTheirs.innerHTML = `<span class="conflict-val-label">Use Shared</span><span class="conflict-val">${theirs}</span>`;

            optMine.onclick = () => {
              optMine.classList.add('conflict-option--selected');
              optTheirs.classList.remove('conflict-option--selected');
              mergeChoices[field] = 'original';
            };
            optTheirs.onclick = () => {
              optTheirs.classList.add('conflict-option--selected');
              optMine.classList.remove('conflict-option--selected');
              mergeChoices[field] = 'shared';
            };

            options.appendChild(optMine);
            options.appendChild(optTheirs);
            conflictRow.appendChild(options);
            diffSection.appendChild(conflictRow);
          }
        }
      }

      if (hasSmartMerges && !hasConflicts) {
        const smartMsg = document.createElement('div');
        smartMsg.className = 'share-review-details';
        smartMsg.innerHTML = '✨ <strong>Smart Sync:</strong> Shared version has info you are missing. "Accept" will add it.';
        diffSection.appendChild(smartMsg);
      }

      if (hasConflicts || hasSmartMerges) {
        card.appendChild(diffSection);
      } else {
        const noChange = document.createElement('div');
        noChange.className = 'share-review-details';
        noChange.textContent = 'No changes detected from your existing contact.';
        card.appendChild(noChange);
      }
    }

    // Tag Input (suggested from import)
    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.className = 'share-review-tag-input';
    tagInput.placeholder = '@group (optional)';
    const existingGroup = (pendingContact.tags || []).find(t => t.startsWith('@')) || suggestedTag;
    tagInput.value = existingGroup;
    card.appendChild(tagInput);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'share-review-actions';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'trunk-btn trunk-btn--secondary';
    skipBtn.textContent = 'Skip';
    skipBtn.style.flex = '1';
    skipBtn.onclick = async () => {
      await deleteContact(db, pendingContact.id);
      card.remove();
      await checkEmpty(db);
    };

    const actionBtn = document.createElement('button');
    actionBtn.className = 'trunk-btn';
    actionBtn.style.flex = '2';

    if (isDuplicate && existingContact) {
      actionBtn.textContent = 'Update Existing';
      actionBtn.onclick = async () => {
        const updated = { ...existingContact, updated_at: Date.now() };
        
        // Apply merge choices (conflicts) and smart merges
        for (const [field, choice] of Object.entries(mergeChoices)) {
          if (choice === 'shared') {
            updated[field] = pendingContact[field];
          }
        }

        // Apply new tag if typed
        const userTag = tagInput.value.trim();
        const tags = new Set(updated.tags || []);
        if (userTag) {
          const finalTag = userTag.startsWith('@') ? userTag : `@${userTag}`;
          tags.add(finalTag);
        }
        if (!tags.has('&dirty')) tags.add('&dirty');
        updated.tags = [...tags];

        await saveContact(db, updated);
        await deleteContact(db, pendingContact.id);
        card.remove();
        await checkEmpty(db);
      };
    } else {
      actionBtn.textContent = 'Add to Circle';
      actionBtn.onclick = async () => {
        const userTag = tagInput.value.trim();
        const incomingTags = (pendingContact.tags || []).filter(t => !t.startsWith('&'));
        const tags = new Set(incomingTags);
        
        if (userTag) {
          const finalTag = userTag.startsWith('@') ? userTag : `@${userTag}`;
          tags.add(finalTag);
        }
        tags.add('&dirty');

        const saved = { 
          ...pendingContact, 
          tags: [...tags], 
          updated_at: Date.now() 
        };
        delete saved.matchedId;
        
        await saveContact(db, saved);
        await deleteContact(db, pendingContact.id);
        card.remove();
        await checkEmpty(db);
      };
    }

    actions.appendChild(skipBtn);
    actions.appendChild(actionBtn);
    card.appendChild(actions);
    content.appendChild(card);
  }

  app.appendChild(content);

  async function checkEmpty(db) {
    const remaining = await getAllContacts(db);
    const stillPending = remaining.filter(c => (c.tags || []).includes('&share'));
    if (stillPending.length === 0) {
      navigate('people');
    }
  }
}
