/**
 * Generates a RFC4122 compliant UUID v4.
 * Uses crypto.randomUUID() if available, then crypto.getRandomValues(), 
 * and finally Math.random() as a last resort.
 */
export function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }
  } catch (e) {
    console.warn("Crypto API failed, falling back to Math.random", e);
  }
  
  // Last resort fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Formats a phone number for human-readable display.
 * - 10 digits → (555) 123-4567
 * - 11 digits starting with 1 → +1 (555) 123-4567
 * - Already formatted or international → returned as-is
 */
export function formatPhone(raw) {
  if (!raw || typeof raw !== 'string') return raw;

  // If it already contains letters (vanity numbers) or looks formatted, return as-is
  if (/[a-zA-Z]/.test(raw)) return raw;
  if (/[^\d\s\+\-\.\(\)x]/.test(raw)) return raw;

  // Strip everything except digits and leading +
  const hasPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');

  // Handle extensions like x123 or ext.123
  const extMatch = raw.match(/\s*(?:x|ext\.?)\s*(\d+)$/i);
  const ext = extMatch ? ` x${extMatch[1]}` : '';

  if (!hasPlus && digits.length === 10) {
    // US/Canada: (555) 123-4567
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}${ext}`;
  }

  if (!hasPlus && digits.length === 11 && digits[0] === '1') {
    // US/Canada with country code: +1 (555) 123-4567
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}${ext}`;
  }

  // International or unrecognized — return as stored
  return raw;
}
