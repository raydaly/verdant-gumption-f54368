import { openDB } from '../storage/db.js';
import { getOwner, getAllContacts, saveContact } from '../storage/contacts.js';
import { setPendingImportNudge } from '../storage/settings.js';
import { decodeShareParam } from '../core/seedling.js';

function normalizePhone(p) {
  if (!p) return '';
  return p.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
}

function findMatch(incoming, existingContacts) {
  return existingContacts.find(existing => {
    if (existing.tags && existing.tags.includes('&share')) return false;

    const nameMatch = existing.name && incoming.name &&
      existing.name.toLowerCase().trim() === incoming.name.toLowerCase().trim();
    const phoneMatch = incoming.phone && existing.phone &&
      normalizePhone(existing.phone) === normalizePhone(incoming.phone);
    const emailMatch = incoming.email && existing.email &&
      existing.email.toLowerCase().trim() === incoming.email.toLowerCase().trim();

    return nameMatch || phoneMatch || emailMatch;
  }) || null;
}

async function parseAndWriteImport(db, params) {
  const inviteRaw = params.get('invite');
  const groupRaw = params.get('importGroup');

  if (!inviteRaw && !groupRaw) return false;

  const existingContacts = await getAllContacts(db);
  let addedAny = false;

  const processPayload = async (payload) => {
    if (!payload) return;
    
    const incomingContacts = payload.contacts || (payload.contact ? [payload.contact] : []);
    const batchTag = payload.group || (payload.contact ? null : '@received');

    for (const c of incomingContacts) {
      if (!c.name) continue;

      const match = findMatch(c, existingContacts);
      
      // CRITICAL: If this exact person is ALREADY in the pending queue (&share), 
      // do not add them again. This prevents spamming the review list if the link is clicked twice.
      const isAlreadyPending = existingContacts.some(e => 
        (e.tags || []).includes('&share') && findMatch(c, [e])
      );
      if (isAlreadyPending) continue;

      const tags = (c.tags || []).filter(t => !t.startsWith('&'));
      tags.push('&share', '&dirty');
      if (batchTag && !tags.includes(batchTag)) tags.push(batchTag);

      const now = Date.now();
      const record = {
        id: crypto.randomUUID(),
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        zip_code: c.zip_code || null,
        birthday: null,
        anniversary: null,
        date_of_passing: null,
        tags,
        last_contacted: null,
        snooze_until: null,
        notes: null,
        created_at: now,
        updated_at: now,
      };

      if (match) {
        record.tags.push('&duplicate');
        record.matchedId = match.id;
      }

      await saveContact(db, record);
      addedAny = true;
    }
  };

  try {
    if (inviteRaw) await processPayload(decodeShareParam(inviteRaw));
    if (groupRaw) await processPayload(decodeShareParam(groupRaw));
  } catch (err) {
    console.error('Import failed:', err);
  }

  if (addedAny) {
    setPendingImportNudge(true);
  }

  history.replaceState(null, '', window.location.pathname);
  return addedAny;
}

export async function boot() {
  const db = await openDB();
  const params = new URLSearchParams(window.location.search);
  const hasUrlParams = params.has('invite') || params.has('importGroup');

  let hasNewImports = false;
  if (hasUrlParams) {
    hasNewImports = await parseAndWriteImport(db, params);
  }

  const owner = await getOwner(db);
  return { db, hasOwner: !!owner, hasNewImports };
}
