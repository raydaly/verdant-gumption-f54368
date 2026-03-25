export function exportSeedling(contacts, logs) {
  const activeContacts = (contacts || []);
  const activeIds = new Set(activeContacts.map(c => c.id));
  const filteredLogs = (logs || []).filter(l => activeIds.has(l.contactId));

  return JSON.stringify({
    version: 2,
    exported_at: Date.now(),
    contacts: activeContacts,
    logs: filteredLogs,
  }, null, 2);
}

export function parseSeedling(jsonString) {
  const data = JSON.parse(jsonString);
  if (!data.contacts) throw new Error('Invalid Seedling file');

  // Detect legacy format: version is a string ("1.3") or contacts have embedded logs / is_user flag
  const isLegacy = typeof data.version === 'string' ||
    (data.contacts.length > 0 && ('is_user' in data.contacts[0] || Array.isArray(data.contacts[0].logs)));

  if (!isLegacy) {
    return { contacts: data.contacts || [], logs: data.logs || [] };
  }

  // Migrate legacy format — timestamps are already unix ms, just fix structure
  const contacts = [];
  const logs = [];
  const now = Date.now();

  for (const c of data.contacts) {
    const tags = [...(c.tags || [])];
    if (c.is_user && !tags.includes('&owner')) tags.push('&owner');

    contacts.push({
      id: c.id,
      name: c.name || 'Imported Contact',
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      zip_code: c.zip_code || null,
      birthday: c.birthday || null,
      anniversary: c.anniversary || null,
      date_of_passing: c.date_of_passing || null,
      tags,
      last_contacted: c.last_contacted || null,
      snooze_until: c.snooze_until || null,
      notes: c.notes || null,
      created_at: c.created_at || now,
      updated_at: c.updated_at || now,
    });

    // Extract embedded logs
    if (Array.isArray(c.logs)) {
      for (const log of c.logs) {
        logs.push({ contactId: c.id, timestamp: log.timestamp, comment: log.comment || null });
      }
    }
  }

  // Also include any top-level logs
  for (const log of (data.logs || [])) {
    logs.push({ contactId: log.contactId, timestamp: log.timestamp, comment: log.comment || null });
  }

  return { contacts, logs };
}

// Unicode-safe base64 encoding
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(str) {
  return decodeURIComponent(escape(atob(str)));
}

function cleanMember(c) {
  const clean = { name: c.name };
  if (c.phone) clean.phone = c.phone;
  if (c.email) clean.email = c.email;
  if (c.address) clean.address = c.address;
  if (c.zip_code) clean.zip_code = c.zip_code;
  if (c.birthday) clean.birthday = c.birthday;
  if (c.anniversary) clean.anniversary = c.anniversary;
  // Tags and other internal fields are intentionally omitted
  return clean;
}

export function encodeInvite(contact, senderName = null, recipientName = null) {
  const hasMilestones = !!(contact.birthday || contact.anniversary);
  const payload = {
    version: 2,
    senderName,
    recipientName,
    hasMilestones,
    contact: cleanMember(contact),
  };
  return encodeBase64(JSON.stringify(payload));
}

export function encodeGroup(contacts, groupTag, senderName = null, recipientName = null) {
  const hasMilestones = contacts.some(c => c.birthday || c.anniversary);
  const payload = {
    version: 2,
    senderName,
    recipientName,
    hasMilestones,
    group: groupTag,
    contacts: contacts.map(cleanMember),
  };
  return encodeBase64(JSON.stringify(payload));
}

/**
 * Exposes the raw payload object for UI preview (e.g. Trunk "View JSON")
 */
export function buildPayload(mode, data, senderName, recipientName) {
  if (mode === 'group') {
    const hasMilestones = data.contacts.some(c => c.birthday || c.anniversary);
    return {
      version: 2,
      senderName,
      recipientName,
      hasMilestones,
      group: data.groupTag,
      contacts: data.contacts.map(cleanMember)
    };
  } else {
    const hasMilestones = !!(data.contact.birthday || data.contact.anniversary);
    return {
      version: 2,
      senderName,
      recipientName,
      hasMilestones,
      contact: cleanMember(data.contact)
    };
  }
}

import { sanitizeContact, normalizePhone, sanitizeString } from './sanitizer.js';
import { generateId } from './utils.js';

export function findMatch(incoming, existingContacts) {
  return existingContacts.find(existing => {
    // Never match against pending imports
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

/**
 * Turns a raw payload into a sanitized list of prospective contact records.
 * Returns { contacts: Array, hadDuplicates: Boolean }
 */
export function ingestContacts(payload, existingContacts) {
  if (!payload) return { contacts: [], hadDuplicates: false };

  const incomingContacts = payload.contacts || (payload.contact ? [payload.contact] : []);
  const batchTag = payload.group ? sanitizeString(payload.group, 50) : null;
  
  const results = [];
  const now = Date.now();

  for (let c of incomingContacts) {
    const safe = sanitizeContact(c);
    if (!safe || !safe.name) continue;

    const match = findMatch(safe, existingContacts);
    let isAlreadyPending = existingContacts.some(e => 
      (e.tags || []).includes('&share') && findMatch(safe, [e])
    );

    if (match) {
      // Optimization: Skip if identical
      const isIdentical = 
        safe.name === match.name &&
        (safe.email || null) === (match.email || null) &&
        (safe.phone || null) === (match.phone || null) &&
        (safe.address || null) === (match.address || null) &&
        (safe.zip_code || null) === (match.zip_code || null) &&
        (safe.birthday || null) === (match.birthday || null);
      
      const hasNewTag = batchTag && !(match.tags || []).includes(batchTag);
      if (isIdentical && !hasNewTag) continue;
    }

    if (isAlreadyPending) continue;

    // Prepare the record for the review queue
    const finalTags = [...safe.tags, '&share', '&dirty'];
    if (batchTag && !finalTags.includes(batchTag)) finalTags.push(batchTag);
    
    // Default to @level50 (Neighborhood) if no level is assigned yet.
    // This ensures new imports show up in the checkup rotation.
    const hasLevel = finalTags.some(t => t.startsWith('&level'));
    if (!hasLevel) finalTags.push('&level50');

    const record = {
      ...safe,
      id: generateId(),
      last_contacted: null,
      snooze_until: null,
      created_at: now,
      updated_at: now
    };

    if (match) {
      record.tags.push('&duplicate');
      record.matchedId = match.id;
    }

    results.push(record);
  }

  return { contacts: results, count: results.length };
}

export function decodeShareParam(encoded) {
  try {
    return JSON.parse(decodeBase64(encoded));
  } catch {
    return null;
  }
}
