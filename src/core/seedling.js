export function exportSeedling(contacts, logs) {
  const filteredContacts = (contacts || []).filter(c => !(c.tags || []).includes('&share'));
  const activeIds = new Set(filteredContacts.map(c => c.id));
  const filteredLogs = (logs || []).filter(l => activeIds.has(l.contactId));

  return JSON.stringify({
    version: 2,
    exported_at: Date.now(),
    contacts: filteredContacts,
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

export function encodeInvite(contact) {
  const payload = JSON.stringify({
    version: 1,
    contact: {
      name: contact.name,
      phone: contact.phone || null,
      email: contact.email || null,
      address: contact.address || null,
      zip_code: contact.zip_code || null,
      birthday: contact.birthday || null,
      anniversary: contact.anniversary || null,
      tags: (contact.tags || []).filter(t => t.startsWith('@') || t.startsWith('#')),
    },
  });
  return encodeBase64(payload);
}

export function encodeGroup(contacts, groupTag) {
  const payload = JSON.stringify({
    version: 1,
    group: groupTag,
    contacts: contacts.map(c => ({
      name: c.name,
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      zip_code: c.zip_code || null,
      birthday: c.birthday || null,
      anniversary: c.anniversary || null,
      tags: (c.tags || []).filter(t => t.startsWith('@') || t.startsWith('#')),
    })),
  });
  return encodeBase64(payload);
}

export function decodeShareParam(encoded) {
  try {
    return JSON.parse(decodeBase64(encoded));
  } catch {
    return null;
  }
}
