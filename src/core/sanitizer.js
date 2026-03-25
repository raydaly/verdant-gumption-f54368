/**
 * Core sanitization for the "Trust Pillar" of Greatuncle.
 * Prevents XSS via manual entry or imported JSON.
 */

export function normalizePhone(p) {
  if (!p || typeof p !== 'string') return null;
  // Strip non-digits and leading 1 (US focus) if it's an 11-digit number
  return p.replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
}

export function validateDate(d) {
  if (!d) return null;
  // If numeric timestamp (unix ms), keep it
  if (typeof d === 'number' && d > 0) return d;
  if (typeof d !== 'string') return null;
  
  // Sanitization: strip anything suspicious and limit length
  const s = d.replace(/[<>]/g, '').substring(0, 30).trim();
  
  // Accept: YYYY-MM-DD or MM-DD or Unix seconds/ms string
  if (/^(\d{4}-)?\d{1,2}-\d{1,2}$/.test(s)) return s;
  if (/^\d{10,14}$/.test(s)) return parseInt(s);
  
  return null;
}

export function sanitizeString(val, maxLength = 200) {
  if (!val || typeof val !== 'string') return null;
  
  // Strip HTML tags (< and >) to be safe from XSS or half-open tags
  const clean = val.replace(/[<>]/g, '').trim();
  
  // Enforce length
  return clean.substring(0, maxLength);
}

export function sanitizeContact(c) {
  if (!c || typeof c !== 'object') return null;

  let email = sanitizeString(c.email, 100);
  // Basic email validity check
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    email = null;
  }

  return {
    ...c,
    name: sanitizeString(c.name, 100) || 'Unnamed Contact',
    phone: sanitizeString(c.phone, 50),
    email,
    address: sanitizeString(c.address, 200),
    zip_code: sanitizeString(c.zip_code, 20),
    notes: sanitizeString(c.notes, 1000), // Limit notes to 1000 chars
    birthday: validateDate(c.birthday),
    anniversary: validateDate(c.anniversary),
    date_of_passing: validateDate(c.date_of_passing),
    // Tags are sanitized as an array
    tags: (Array.isArray(c.tags) ? c.tags : []) 
      .map(t => sanitizeString(t, 50))
      .filter(t => t && (t.startsWith('@') || t.startsWith('#') || t.startsWith('&') || t.startsWith('!')))
  };
}
