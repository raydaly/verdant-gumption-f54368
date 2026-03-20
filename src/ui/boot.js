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

    for (let c of incomingContacts) {
      if (!c.name || typeof c.name !== 'string') continue;

      // Sanitization Gate (Trust Pillar)
      const safeName = c.name.replace(/</g, '').substring(0, 100).trim();
      if (!safeName) continue;
      
      const safePhone = typeof c.phone === 'string' ? c.phone.replace(/</g, '').substring(0, 50).trim() : null;
      let safeEmail = typeof c.email === 'string' ? c.email.replace(/</g, '').substring(0, 100).trim() : null;
      if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
        safeEmail = null;
      }
      const safeAddress = typeof c.address === 'string' ? c.address.replace(/</g, '').substring(0, 200).trim() : null;
      const safeZip = typeof c.zip_code === 'string' ? c.zip_code.replace(/</g, '').substring(0, 20).trim() : null;
      
      const safeTags = (Array.isArray(c.tags) ? c.tags : [])
        .filter(t => typeof t === 'string')
        .map(t => t.replace(/</g, '').substring(0, 50).trim())
        .filter(t => t && (t.startsWith('@') || t.startsWith('#')));

      const safeBatchTag = batchTag ? batchTag.replace(/</g, '').substring(0, 50).trim() : null;

      c = { ...c, name: safeName, phone: safePhone, email: safeEmail, address: safeAddress, zip_code: safeZip, tags: safeTags };

      const match = findMatch(c, existingContacts);
      
      if (match) {
        // Optimization: If the incoming contact is IDENTICAL to the match, 
        // we can skip adding it to the review queue entirely.
        const isIdentical = 
          c.name === match.name &&
          (c.email || null) === (match.email || null) &&
          (c.phone || null) === (match.phone || null) &&
          (c.address || null) === (match.address || null) &&
          (c.zip_code || null) === (match.zip_code || null);
        
        // If it's a perfect match AND we don't have a specific batch tag to add, skip it.
        // If we DO have a batch tag (like @testgroup) and the user ALREADY has that tag, skip it.
        const hasNewTag = safeBatchTag && !(match.tags || []).includes(safeBatchTag);
        if (isIdentical && !hasNewTag) continue;
      }
      
      // CRITICAL: If this exact person is ALREADY in the pending queue (&share), 
      // do not add them again. This prevents spamming the review list if the link is clicked twice.
      const isAlreadyPending = existingContacts.some(e => 
        (e.tags || []).includes('&share') && findMatch(c, [e])
      );
      if (isAlreadyPending) continue;

      const finalTags = [...c.tags, '&share', '&dirty'];
      if (safeBatchTag && !finalTags.includes(safeBatchTag)) finalTags.push(safeBatchTag);

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
        tags: finalTags,
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
  
  let version = 'v-boot-start';
  try {
    const res = await fetch('/manifest.json?cb=' + Date.now());
    if (res.ok) {
      const manifest = await res.json();
      version = manifest.version || 'v-missing';
      console.log('Manifest version:', version);
    } else {
      console.warn('Manifest fetch failed:', res.status);
      version = 'v-res-' + res.status;
    }
  } catch (err) {
    console.error('Manifest error:', err);
    version = 'v-err';
  }

  const allContacts = await getAllContacts(db);
  const hasContacts = allContacts.length > 0;
  return { db, hasOwner: !!owner, hasNewImports, version, hadParams: hasUrlParams, hasContacts };
}
