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

  let em = sanitizeString(c.em, 100);
  // Basic email validity check
  if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
    em = null;
  }

  const res = {
    id: c.id,
    n: sanitizeString(c.n, 100) || 'Unnamed Contact',
    ph: sanitizeString(c.ph, 50),
    em,
    ad: sanitizeString(c.ad, 200),
    zp: sanitizeString(c.zp, 20),
    no: sanitizeString(c.no, 1000), // Limit notes to 1000 chars
    bd: validateDate(c.bd),
    av: validateDate(c.av),
    dp: validateDate(c.dp),
    lc: c.lc || null,
    su: c.su || null,
    ca: c.ca || null,
    ua: c.ua || null,
    // Tags are sanitized as an array
    t: (Array.isArray(c.t) ? c.t : [])
      .map(tag => sanitizeString(tag, 50))
      .filter(tag => tag && (tag.startsWith('@') || tag.startsWith('#') || tag.startsWith('&') || tag.startsWith('!')))
  };
  
  // Clean up any other fields if we want specific output only
  return res;
}
