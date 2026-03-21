import { openDB } from '../storage/db.js';
import { getOwner, getAllContacts, saveContact } from '../storage/contacts.js';
import { setPendingImportNudge } from '../storage/settings.js';
import { decodeShareParam } from '../core/seedling.js';
import { sanitizeString } from '../core/sanitizer.js';

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
      const safeName = sanitizeString(c.name, 100);
      if (!safeName) continue;
      
      const safePhone = sanitizeString(c.phone, 50);
      let safeEmail = sanitizeString(c.email, 100);
      if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
        safeEmail = null;
      }
      const safeAddress = sanitizeString(c.address, 200);
      const safeZip = sanitizeString(c.zip_code, 20);
      const safeNotes = sanitizeString(c.notes, 1000);
      
      const validateDate = (d) => {
        if (!d) return null;
        if (typeof d === 'number' && d > 0) return d;
        if (typeof d !== 'string') return null;
        const s = d.replace(/[<>]/g, '').substring(0, 30).trim();
        if (/^(\d{4}-)?\d{1,2}-\d{1,2}$/.test(s)) return s;
        if (/^\d{10,14}$/.test(s)) return parseInt(s);
        return null;
      };

      const safeBirthday = validateDate(c.birthday);
      const safeAnniversary = validateDate(c.anniversary);
      const safePassing = validateDate(c.date_of_passing);

      const safeTags = (Array.isArray(c.tags) ? c.tags : [])
        .map(t => sanitizeString(t, 50))
        .filter(t => t && (t.startsWith('@') || t.startsWith('#')));

      const safeBatchTag = sanitizeString(batchTag, 50);

      c = { 
        ...c, 
        name: safeName, 
        phone: safePhone, 
        email: safeEmail, 
        address: safeAddress, 
        zip_code: safeZip, 
        tags: safeTags,
        birthday: safeBirthday,
        anniversary: safeAnniversary,
        date_of_passing: safePassing,
        notes: safeNotes
      };

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
        birthday: c.birthday,
        anniversary: c.anniversary,
        date_of_passing: c.date_of_passing,
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
