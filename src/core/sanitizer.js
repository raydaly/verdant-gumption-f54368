/**
 * Core sanitization for the "Trust Pillar" of Greatuncle.
 * Prevents XSS via manual entry or imported JSON.
 */

export function sanitizeString(val, maxLength = 200) {
  if (!val || typeof val !== 'string') return null;
  
  // 1. Strip HTML tags (simple effective strip of <...>)
  // Actually, we'll strip both < and > to be safe from half-open tags
  const clean = val.replace(/[<>]/g, '').trim();
  
  // 2. Enforce length
  return clean.substring(0, maxLength);
}

export function sanitizeContact(c) {
  if (!c || typeof c !== 'object') return null;

  return {
    ...c,
    name: sanitizeString(c.name, 100) || 'Unnamed Contact',
    phone: sanitizeString(c.phone, 50),
    email: sanitizeString(c.email, 100),
    address: sanitizeString(c.address, 200),
    zip_code: sanitizeString(c.zip_code, 20),
    notes: sanitizeString(c.notes, 1000), // Limit notes to 1000 chars
    // Tags are sanitized as an array
    tags: Array.isArray(c.tags) 
      ? c.tags.map(t => sanitizeString(t, 50)).filter(Boolean)
      : []
  };
}
