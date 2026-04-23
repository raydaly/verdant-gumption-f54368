/**
 * parser.js — The Greatuncle Universal Doorway
 *
 * A unified ingestion engine that accepts any string (URL, code, JSON, delimited text)
 * and intelligently detects its type and routes it to the correct decoder.
 *
 * Pipeline for new links:
 *   JSON → CompressionStream (DEFLATE) → Base64URL → URL Fragment
 *
 * Pipeline for decoding:
 *   URL Fragment / Base64URL → Decompress → JSON → ingestContacts()
 */

// ─── Encoding Helpers ──────────────────────────────────────────────────────

/**
 * Converts a Uint8Array of binary data to a URL-safe Base64 string.
 * Uses Base64URL encoding (replaces +/= with -/_) so the result is safe
 * inside a URL fragment without additional percent-encoding.
 */
function uint8ToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Converts a Base64URL string back to a Uint8Array.
 * Handles both standard Base64 (+/) and URL-safe Base64URL (-_).
 */
function base64UrlToUint8(str) {
  // Restore padding and standard base64 chars
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + (4 - str.length % 4) % 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Compression ───────────────────────────────────────────────────────────

/**
 * Compresses a JSON-serializable payload using native DEFLATE (CompressionStream).
 * Returns a URL-safe Base64 string, suitable for a URL Fragment.
 *
 * Falls back to plain Base64 on older browsers that lack CompressionStream.
 */
export async function compressPayload(payload) {
  const json = JSON.stringify(payload);

  if (typeof CompressionStream === 'undefined') {
    // Fallback: legacy Base64 (no compression)
    return btoa(unescape(encodeURIComponent(json)));
  }

  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(json);

  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(inputBytes);
  writer.close();

  const chunks = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine all chunks into one Uint8Array
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Prefix with 'z' to flag that this payload is DEFLATE-compressed
  return 'z' + uint8ToBase64Url(compressed);
}

/**
 * Decompresses a payload string that was produced by compressPayload().
 * Handles both the new 'z'-prefixed DEFLATE format and the legacy plain Base64 format.
 */
export async function decompressPayload(encoded) {
  if (!encoded) return null;

  try {
    // New DEFLATE format (prefixed with 'z')
    if (encoded.startsWith('z') && typeof DecompressionStream !== 'undefined') {
      const bytes = base64UrlToUint8(encoded.slice(1));

      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();

      const chunks = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decompressed));
    }

    // Legacy Base64 format (from before compression)
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}

// ─── Smart Parser ──────────────────────────────────────────────────────────

/**
 * The "TYPE" of data detected in a pasted string.
 * Tells the UI how to present the import to the user.
 */
export const IMPORT_TYPE = {
  INVITE: 'invite',         // A single contact or group invite (additive)
  FULL_BACKUP: 'full_backup', // A complete Seedling JSON backup (restore or merge)
  MANGLED: 'mangled',       // Detected Greatuncle data but failed to decode
  CSV: 'csv',               // A CSV file (redirect to Contact Convertor)
  VCARD: 'vcard',           // A VCard file (redirect to Contact Convertor)
  UNKNOWN: 'unknown',       // Not recognizable as Greatuncle data
};

/**
 * Scans any arbitrary string for Greatuncle data and returns a structured result.
 *
 * Handles:
 *  - Full Greatuncle URLs with # fragment (new secure format)
 *  - Full Greatuncle URLs with ? query string (legacy format)
 *  - Text blocks with --- START GREATUNCLE LINK --- delimiters
 *  - Raw Base64 / Base64URL invite codes
 *  - Raw Seedling JSON (full backup)
 *  - CSV and VCard detection (for redirect guidance)
 *
 * @param {string} text - Raw pasted text from the user
 * @returns {Promise<{type: string, payload: object|null, raw: string|null, contactCount: number}>}
 */
export async function parseAnyInput(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return { type: IMPORT_TYPE.UNKNOWN, payload: null, raw: null, contactCount: 0 };

  // ── 1. Extract from delimited block first ──────────────────────────────
  const delimStart = '--- START GREATUNCLE LINK ---';
  const delimEnd = '--- END GREATUNCLE LINK ---';
  let searchText = trimmed;
  if (trimmed.includes(delimStart)) {
    const startIdx = trimmed.indexOf(delimStart) + delimStart.length;
    const endIdx = trimmed.includes(delimEnd)
      ? trimmed.indexOf(delimEnd)
      : trimmed.length;
    const block = trimmed.slice(startIdx, endIdx).trim();
    // Filter out metadata lines like "Rooted: ..." to find the actual code/URL
    searchText = block.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('Rooted:'))
      .join('\n')
      .trim();
  }

  // ── 2. Extract the encoded value from a URL ────────────────────────────
  let encoded = null;
  let paramName = null;

  // Try the # fragment format (new secure format)
  const hashMatch = searchText.match(/[#&]?(invite|importGroup)=([^&\s]+)/);
  if (hashMatch) {
    paramName = hashMatch[1];
    encoded = decodeURIComponent(hashMatch[2]);
  }

  // Try the ? query string format (legacy)
  if (!encoded) {
    const queryMatch = searchText.match(/[?&](invite|importGroup)=([^&\s]+)/);
    if (queryMatch) {
      paramName = queryMatch[1];
      encoded = decodeURIComponent(queryMatch[2]);
    }
  }

  // ── 3. If we found a code, try to decode it ────────────────────────────
  if (encoded) {
    const payload = await decompressPayload(encoded);
    if (payload) {
      const contacts = Array.isArray(payload.c) ? payload.c : (payload.c ? [payload.c] : []);
      return {
        type: IMPORT_TYPE.INVITE,
        payload,
        raw: encoded,
        contactCount: contacts.length,
        paramName,
      };
    } else {
      // We found a code but couldn't decode it — it's mangled
      return { type: IMPORT_TYPE.MANGLED, payload: null, raw: encoded, contactCount: 0 };
    }
  }

  // ── 4. Try treating the whole text as a raw Base64 code ───────────────
  // (For users who copy just the code, not the full URL)
  if (searchText.length > 20 && !searchText.startsWith('{') && !searchText.includes(' ') && !searchText.includes('\n')) {
    const payload = await decompressPayload(searchText);
    if (payload && (payload.c || payload.contacts)) {
      const contacts = Array.isArray(payload.c) ? payload.c : (payload.c ? [payload.c] : []);
      return {
        type: IMPORT_TYPE.INVITE,
        payload,
        raw: searchText,
        contactCount: contacts.length,
      };
    }
  }

  // ── 5. Try parsing as full Seedling JSON backup ────────────────────────
  if (searchText.startsWith('{') || searchText.startsWith('[')) {
    try {
      const json = JSON.parse(searchText);
      // Detect a Seedling backup (has version key and contacts array)
      const contacts = json.c || json.contacts;
      if (contacts && Array.isArray(contacts)) {
        return {
          type: IMPORT_TYPE.FULL_BACKUP,
          payload: json,
          raw: searchText,
          contactCount: contacts.length,
        };
      }
    } catch {
      // Not valid JSON
    }
  }

  // ── 6. Detect CSV (redirect to Contact Convertor) ─────────────────────
  const lines = trimmed.split('\n');
  if (lines.length > 1) {
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes(',') && (
      firstLine.includes('name') ||
      firstLine.includes('email') ||
      firstLine.includes('phone') ||
      firstLine.includes('first')
    )) {
      return { type: IMPORT_TYPE.CSV, payload: null, raw: trimmed, contactCount: 0 };
    }

    // ── 7. Detect VCard ──────────────────────────────────────────────────
    if (trimmed.startsWith('BEGIN:VCARD')) {
      return { type: IMPORT_TYPE.VCARD, payload: null, raw: trimmed, contactCount: 0 };
    }
  }

  return { type: IMPORT_TYPE.UNKNOWN, payload: null, raw: null, contactCount: 0 };
}

// ─── Hash Fragment Helpers (for boot.js) ──────────────────────────────────

/**
 * Parses the current URL hash for Greatuncle invite parameters.
 * Returns { paramName, encoded } if found, or null.
 *
 * Supports both:
 *   #invite=...        (simple format)
 *   #/?invite=...      (router-compatible format)
 */
export function parseHashForInvite() {
  const hash = window.location.hash.slice(1); // Remove leading '#'
  if (!hash) return null;

  // Try as a query string within the hash
  const qIndex = hash.indexOf('?');
  const hashQuery = qIndex >= 0 ? hash.slice(qIndex + 1) : hash;

  const params = new URLSearchParams(hashQuery);
  const invite = params.get('invite');
  const importGroup = params.get('importGroup');

  if (invite) return { paramName: 'invite', encoded: invite };
  if (importGroup) return { paramName: 'importGroup', encoded: importGroup };

  // Try bare format: #invite=...
  const bareMatch = hash.match(/^(invite|importGroup)=(.+)$/);
  if (bareMatch) return { paramName: bareMatch[1], encoded: bareMatch[2] };

  return null;
}

/**
 * Checks if the current URL hash looks "mangled" (contains an invite key
 * but the value appears to be incomplete or corrupted).
 */
export function isHashMangled() {
  const result = parseHashForInvite();
  if (!result) return false;

  const { encoded } = result;
  if (!encoded || encoded.length < 10) return true;

  // A valid Base64 / Base64URL string should only contain these characters
  const validBase64Url = /^[A-Za-z0-9\-_+/=z]+$/;
  if (!validBase64Url.test(encoded)) return true;

  return false;
}
