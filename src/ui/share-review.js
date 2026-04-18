import { getAllContacts, saveContact, deleteContact } from '../storage/contacts.js';
import { navigate } from './router.js';

const DIFF_FIELDS = ['ph', 'em', 'ad', 'zp', 'bd', 'av'];

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
  const pending = allContacts.filter(c => (c.t || []).includes('&share'));

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
        const updates = { t: new Set(match.t || []) };
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
          const merged = { ...match, ...updates, t: [...updates.t, '&dirty'], ua: Date.now() };
          await saveContact(db, merged);
          count++;
        }
      }
    }
    if (count > 0) {
      renderShareReview(db);
    } else {
      alert("No easy merges found. Select 'Add to Circle' for new contacts.");
    }
  });

  const importAllBtn = document.createElement('button');
  importAllBtn.className = 'header-icon-btn';
  importAllBtn.textContent = '➕';
  importAllBtn.title = 'Add all new contacts to circle';
  importAllBtn.setAttribute('aria-label', 'Add all new');
  importAllBtn.addEventListener('click', async () => {
    const newOnes = pending.filter(p => !p.matchedId);
    if (newOnes.length === 0) return;
    
    if (confirm(`Add all ${newOnes.length} new people to your circle?`)) {
      for (const p of newOnes) {
        // Only strip specific internal sync tags, preserve levels and owner status
        const tags = new Set((p.t || []).filter(t => t !== '&share' && t !== '&duplicate'));
        if (suggestedTag) tags.add(suggestedTag);
        tags.add('&dirty');
        
        const saved = { ...p, t: [...tags], ua: Date.now() };
        delete saved.matchedId;
        await saveContact(db, saved);
      }
      renderShareReview(db);
    }
  });

  headerRight.appendChild(importAllBtn);
  headerRight.appendChild(acceptAllBtn);
  headerRight.appendChild(skipAllBtn);
  header.appendChild(headerRight);
  app.appendChild(header);

  const content = document.createElement('div');
  content.className = 'view-content';

  let importMeta = null;
  try {
    const rawMeta = sessionStorage.getItem('lastImportMeta');
    if (rawMeta) importMeta = JSON.parse(rawMeta);
  } catch(e) {}

  if (importMeta) {
    const welcomeCard = document.createElement('div');
    welcomeCard.className = 'share-review-card';
    welcomeCard.style.backgroundColor = 'var(--color-bg-elevated)';
    welcomeCard.style.padding = '1.25rem';
    welcomeCard.style.marginBottom = '1.5rem';
    welcomeCard.style.border = '2px solid var(--color-primary)';
    welcomeCard.style.borderRadius = 'var(--radius-l)';
    
    let greeting = 'Welcome!';
    if (importMeta.recipientName) {
      greeting = `Hi ${importMeta.recipientName},`;
    }

    const milestoneTxt = importMeta.hasMilestones ? ' and milestone (birthday) calendar' : '';
    const groupTxt = importMeta.groupName ? ` the ${importMeta.groupName} address book` : ' these contacts';
    
    welcomeCard.innerHTML = `
      <h2 style="margin-top: 0; margin-bottom: 0.5rem; font-family: var(--font-serif); color: var(--color-primary);">${greeting}</h2>
      <p style="margin-bottom: 0; font-size: 1.05rem; line-height: 1.5;">
        <strong>${importMeta.senderName}</strong> has shared${groupTxt}${milestoneTxt} with you. Here are the members:
      </p>
    `;
    content.appendChild(welcomeCard);
  } else {
    const metaTxt = document.createElement('p');
    metaTxt.className = 'share-review-meta';
    metaTxt.textContent = 'Decide which of these contacts to add to your private circle.';
    content.appendChild(metaTxt);
  }

  // Auto-suggest bulk tag based on common incoming group tags
  const groupCounts = {};
  pending.forEach(p => {
    (p.t || []).filter(t => t.startsWith('@')).forEach(tag => {
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
    const isDuplicate = (pendingContact.t || []).includes('&duplicate');

    const card = document.createElement('div');
    card.className = 'share-review-card';

    // Name
    const nameRow = document.createElement('div');
    nameRow.className = 'share-review-name';
    nameRow.textContent = pendingContact.n;
    if (isDuplicate) {
      const badge = document.createElement('span');
      badge.className = 'share-review-badge';
      badge.textContent = 'Already exists';
      nameRow.appendChild(badge);
    }
    card.appendChild(nameRow);

    const detailsRow = document.createElement('div');
    detailsRow.className = 'share-review-details';
    const parts = [pendingContact.ph, pendingContact.em].filter(Boolean);
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
        const incomingValue = pendingContact[field];
        const localValue = existingContact[field];

        // Check if there is an actual difference (and ignore null vs undefined vs empty string mismatches)
        const incomingValStr = (incomingValue || '').toString().trim();
        const localValStr = (localValue || '').toString().trim();

        if (incomingValStr !== localValStr) {
          if (!localValStr && incomingValStr) {
            // Smart Merge: we have nothing, they have something. Auto-accept.
            hasSmartMerges = true;
            mergeChoices[field] = 'shared';
          } else if (localValStr && incomingValStr) {
            // Conflict: we both have values and they differ.
            hasConflicts = true;
            mergeChoices[field] = 'original'; // Default to mine

            const conflictRow = document.createElement('div');
            conflictRow.className = 'conflict-row';
            
            const fieldLabel = document.createElement('div');
            fieldLabel.className = 'share-review-diff-label';
            const displayField = field === 'ph' ? 'Phone' : 
                               field === 'em' ? 'Email' :
                               field === 'ad' ? 'Address' :
                               field === 'zp' ? 'Zip Code' :
                               field === 'bd' ? 'Birthday' :
                               field === 'av' ? 'Anniversary' : 'Unknown';
            fieldLabel.textContent = displayField;
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
    const existingGroup = (pendingContact.t || []).find(t => t.startsWith('@')) || suggestedTag;
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
        const updated = { ...existingContact, ua: Date.now() };
        
        // Apply merge choices (conflicts) and smart merges
        for (const [field, choice] of Object.entries(mergeChoices)) {
          if (choice === 'shared') {
            updated[field] = pendingContact[field];
          }
        }

        // Apply new tag if typed
        const userTag = tagInput.value.trim();
        const tags = new Set(updated.t || []);
        if (userTag) {
          const finalTag = userTag.startsWith('@') ? userTag : `@${userTag}`;
          tags.add(finalTag);
        }
        if (!tags.has('&dirty')) tags.add('&dirty');
        updated.t = [...tags];

        await saveContact(db, updated);
        await deleteContact(db, pendingContact.id);
        card.remove();
        await checkEmpty(db);
      };
    } else {
      actionBtn.textContent = 'Add to Circle';
      actionBtn.onclick = async () => {
        const userTag = tagInput.value.trim();
        // Only strip specific internal sync tags, preserve levels and owner status
        const tags = new Set((pendingContact.t || []).filter(t => t !== '&share' && t !== '&duplicate'));
        
        if (userTag) {
          const finalTag = userTag.startsWith('@') ? userTag : `@${userTag}`;
          tags.add(finalTag);
        }
        tags.add('&dirty');

        const saved = { ...pendingContact, t: [...tags], ua: Date.now() };
        delete saved.matchedId;
        
        try {
          await saveContact(db, saved);
          alert('Saved ' + saved.n + ' to Circle!');
          card.remove();
          await checkEmpty(db);
        } catch (err) {
          alert('Error saving contact: ' + err.message);
        }
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
    const stillPending = remaining.filter(c => (c.t || []).includes('&share'));
    if (stillPending.length === 0) {
      navigate('people');
    }
  }
}
