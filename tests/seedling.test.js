import test from 'node:test';
import assert from 'node:assert';
import { ingestContacts, findMatch } from '../src/core/seedling.js';
import { TAGS } from '../src/core/constants.js';

test('Seedling Ingestion Pipeline', async (t) => {
  const existing = [
    { id: '1', n: 'Alice', em: 'alice@example.com', t: [] },
    { id: '2', n: 'Bob', ph: '5550000', t: [TAGS.SYSTEM.OWNER] }
  ];

  await t.test('findMatch should find by email', () => {
    const incoming = { n: 'Alice New', em: 'alice@example.com' };
    const match = findMatch(incoming, existing);
    assert.strictEqual(match.id, '1');
  });

  await t.test('findMatch should find by owner tag', () => {
    const incoming = { n: 'The Boss', t: [TAGS.SYSTEM.OWNER] };
    const match = findMatch(incoming, existing);
    assert.strictEqual(match.id, '2');
  });

  await t.test('ingestContacts should mark new arrivals as pending and dirty', () => {
    const payload = {
      c: [{ n: 'Charlie', ph: '5551111' }]
    };
    
    const { contacts } = ingestContacts(payload, existing, false);
    const charlie = contacts.find(c => c.n === 'Charlie');
    
    assert.ok(charlie, 'Charlie should be in the queue');
    assert.ok(charlie.t.includes(TAGS.SYSTEM.SHARE), 'Should have &share tag');
    assert.ok(charlie.t.includes(TAGS.SYSTEM.DIRTY), 'Should have &dirty tag');
    assert.ok(charlie.t.includes(TAGS.LEVELS.L50), 'Should have default level');
  });

  await t.test('ingestContacts should detect duplicates', () => {
    const payload = {
      c: [{ n: 'Alice Duplicate', em: 'alice@example.com' }]
    };
    
    const { contacts } = ingestContacts(payload, existing, false);
    const alice = contacts[0];
    
    assert.ok(alice.t.includes(TAGS.SYSTEM.DUPLICATE), 'Should be marked as duplicate');
    assert.strictEqual(alice.matchedId, '1');
  });
});
