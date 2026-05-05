import test from 'node:test';
import assert from 'node:assert';
import { compressPayload, decompressPayload, IMPORT_TYPE, parseAnyInput } from '../src/core/parser.js';

test('Compression Pipeline', async (t) => {
  await t.test('should compress and decompress a payload correctly', async () => {
    const payload = { c: [{ n: 'Test Person', ph: '1234567890' }] };
    const encoded = await compressPayload(payload);
    
    assert.ok(encoded.startsWith('z'), 'Compressed payload should start with z');
    
    const decoded = await decompressPayload(encoded);
    assert.deepStrictEqual(decoded, payload, 'Decoded payload should match original');
  });

  await t.test('should handle legacy Base64 payloads (uncompressed)', async () => {
    const payload = { c: [{ n: 'Legacy User' }] };
    // Create a legacy-style Base64 string (no 'z' prefix)
    const json = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    
    const decoded = await decompressPayload(encoded);
    assert.deepStrictEqual(decoded, payload);
  });
});

test('Smart Parser (parseAnyInput)', async (t) => {
  await t.test('should detect full Seedling backup JSON', async () => {
    const backup = { v: 5, c: [{ n: 'Backup Contact' }], l: [] };
    const result = await parseAnyInput(JSON.stringify(backup));
    
    assert.strictEqual(result.type, IMPORT_TYPE.FULL_BACKUP);
    assert.strictEqual(result.contactCount, 1);
  });

  await t.test('should extract invite from URL fragment', async () => {
    const payload = { c: [{ n: 'Invite Link Person' }] };
    const encoded = await compressPayload(payload);
    const url = `https://greatuncle.app/#invite=${encoded}`;
    
    const result = await parseAnyInput(url);
    assert.strictEqual(result.type, IMPORT_TYPE.INVITE);
    assert.strictEqual(result.contactCount, 1);
    assert.deepStrictEqual(result.payload, payload);
  });

  await t.test('should handle delimited emoji blocks', async () => {
    const payload = { c: [{ n: 'Emoji Person' }] };
    const encoded = await compressPayload(payload);
    const text = `
🌿 Greatuncle Update 🌿
Rooted: yesterday
https://greatuncle.app/#invite=${encoded}
🌱 End of Update 🌱
    `;
    
    const result = await parseAnyInput(text);
    assert.strictEqual(result.type, IMPORT_TYPE.INVITE);
    assert.strictEqual(result.contactCount, 1);
  });

  await t.test('should detect CSV and VCard', async () => {
    const csv = "Name,Phone,Email\nJohn Doe,555-1234,john@example.com";
    const vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD";
    
    const csvResult = await parseAnyInput(csv);
    assert.strictEqual(csvResult.type, IMPORT_TYPE.CSV);
    
    const vcardResult = await parseAnyInput(vcard);
    assert.strictEqual(vcardResult.type, IMPORT_TYPE.VCARD);
  });
});
