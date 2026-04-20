export function exportSeedling(contacts, logs) {
  const activeContacts = (contacts || []);
  const activeIds = new Set(activeContacts.map(c => c.id));
  const filteredLogs = (logs || []).filter(l => activeIds.has(l.contactId));

  return JSON.stringify({
    v: 5,
    ea: Date.now(),
    c: activeContacts,
    l: filteredLogs,
  }, (key, value) => value === null ? undefined : value, 2);
}

export function parseSeedling(jsonString) {
  const data = JSON.parse(jsonString);
  const contacts = data.c || data.contacts;
  if (!contacts) throw new Error('Invalid Seedling file');

  return { 
    contacts: contacts || [], 
    logs: data.l || data.logs || [] 
  };
}

import { compressPayload, decompressPayload } from './parser.js';

function cleanMember(c) {
  const clean = { n: c.n };
  if (c.ph) clean.ph = c.ph;
  if (c.em) clean.em = c.em;
  if (c.ad) clean.ad = c.ad;
  if (c.zp) clean.zp = c.zp;
  if (c.bd) clean.bd = c.bd;
  if (c.av) clean.av = c.av;
  if (c.dp) clean.dp = c.dp;
  // Notes (no) and internal tags (&owner, &dirty) are intentionally omitted for privacy
  return clean;
}

export async function encodeInvite(contact, senderName = null, recipientName = null) {
  const payload = {
    v: 5,
    ea: Date.now(),
    sn: senderName,
    rn: recipientName,
    c: [cleanMember(contact)],
  };
  return compressPayload(payload);
}

export async function encodeGroup(contacts, groupTag, senderName = null, recipientName = null, volunteerMeta = null) {
  const payload = {
    v: 5,
    ea: Date.now(),
    sn: senderName,
    rn: recipientName,
    g: groupTag,
    c: contacts.map(cleanMember),
  };
  // If the sender is volunteering as a Greatuncle for this group,
  // embed their contact details so the recipient's app can route corrections back.
  if (volunteerMeta) {
    payload.sv = true;           // sv = steward volunteer flag
    if (volunteerMeta.phone) payload.sp = volunteerMeta.phone;  // sp = steward phone
    if (volunteerMeta.email) payload.se = volunteerMeta.email;  // se = steward email
  }
  return compressPayload(payload);
}

/**
 * Exposes the raw payload object for UI preview (e.g. Trunk "View JSON")
 */
export function buildPayload(mode, data, senderName, recipientName) {
  const base = {
    v: 5,
    ea: Date.now(),
    sn: senderName,
    rn: recipientName
  };

  if (mode === 'group') {
    return {
      ...base,
      g: data.groupTag,
      c: data.contacts.map(cleanMember)
    };
  } else {
    return {
      ...base,
      c: [cleanMember(data.contact)]
    };
  }
}

import { sanitizeContact, normalizePhone, sanitizeString } from './sanitizer.js';
import { generateId } from './utils.js';

export function findMatch(incoming, existingContacts) {
  // Never match against pending imports
  const pool = existingContacts.filter(c => !(c.t || []).includes('&share'));

  // 1. Email Match (highest confidence)
  if (incoming.em) {
    const match = pool.find(c => c.em && c.em.toLowerCase().trim() === incoming.em.toLowerCase().trim());
    if (match) return match;
  }

  // 2. Phone Match
  if (incoming.ph) {
    const pIncoming = normalizePhone(incoming.ph);
    const match = pool.find(c => c.ph && normalizePhone(c.ph) === pIncoming);
    if (match) return match;
  }

  // 3. Name Match (only if unique)
  if (incoming.n) {
    const nameMatches = pool.filter(c => c.n && c.n.toLowerCase().trim() === incoming.n.toLowerCase().trim());
    if (nameMatches.length === 1) return nameMatches[0];
  }

  // 4. Owner match (Safety catch for the primary user)
  if (incoming.t && incoming.t.includes('&owner')) {
    const owner = pool.find(c => (c.t || []).includes('&owner'));
    if (owner) return owner;
  }

  return null;
}

/**
 * Turns a raw payload into a sanitized list of prospective contact records.
 * Returns { contacts: Array, hadDuplicates: Boolean }
 */
export function ingestContacts(payload, existingContacts, isFreshInstall = false) {
  if (!payload) return { contacts: [], hadDuplicates: false };

  // Handle both abbreviated and direct array payloads
  const incomingContacts = Array.isArray(payload) 
    ? payload 
    : (payload.c || (payload.contact ? [payload.contact] : []));
  const batchTag = payload.g ? sanitizeString(payload.g, 50) : null;
  
  const results = [];
  const now = Date.now();

  for (let c of incomingContacts) {
    const safe = sanitizeContact(c);
    if (!safe || !safe.n) continue;

    const match = findMatch(safe, existingContacts);
    let isAlreadyPending = existingContacts.some(e => 
      (e.t || []).includes('&share') && findMatch(safe, [e])
    );

    if (match) {
      // Optimization: Skip if identical
      const isIdentical = 
        safe.n === match.n &&
        (safe.em || null) === (match.em || null) &&
        (safe.ph || null) === (match.ph || null) &&
        (safe.ad || null) === (match.ad || null) &&
        (safe.zp || null) === (match.zp || null) &&
        (safe.bd || null) === (match.bd || null);
      
      const hasNewTag = batchTag && !(match.t || []).includes(batchTag);
      if (isIdentical && !hasNewTag) continue;
    }

    if (isAlreadyPending) continue;

    // Prepare the record for the review queue
    const finalTags = [...(safe.t || []), '&dirty'];
    if (!isFreshInstall) finalTags.push('&share');
    if (batchTag && !finalTags.includes(batchTag)) finalTags.push(batchTag);
    
    // Default to @level50 (Neighborhood) if no level is assigned yet.
    // This ensures new imports show up in the checkup rotation.
    const hasLevel = finalTags.some(t => t.startsWith('&level'));
    if (!hasLevel) finalTags.push('&level50');

    const record = {
      ...safe,
      t: finalTags,
      id: match ? match.id : (safe.id || generateId()),
      lc: null,
      su: null,
      ca: now,
      ua: now
    };

    if (match) {
      record.t.push('&duplicate');
      record.matchedId = match.id;
    }

    results.push(record);
  }

  return { contacts: results, count: results.length };
}

export async function decodeShareParam(encoded) {
  return decompressPayload(encoded);
}
