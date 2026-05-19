import test from 'node:test';
import assert from 'node:assert';
import { getNearestFirstOfMonth, generateNewsletterDraft } from '../src/core/newsletter-engine.js';
import { TAGS } from '../src/core/constants.js';

test('Newsletter Engine - getNearestFirstOfMonth', async (t) => {
  await t.test('should return 1st of current month if date is <= 15', () => {
    const d = getNearestFirstOfMonth('2026-05-10');
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 4); // 0-indexed, so May is 4
    assert.strictEqual(d.getDate(), 1);
  });

  await t.test('should return 1st of next month if date is > 15', () => {
    const d = getNearestFirstOfMonth('2026-05-20');
    assert.strictEqual(d.getFullYear(), 2026);
    assert.strictEqual(d.getMonth(), 5); // 0-indexed, so June is 5
    assert.strictEqual(d.getDate(), 1);
  });
});

test('Newsletter Engine - generateNewsletterDraft', async (t) => {
  await t.test('should generate newsletter draft with events and correct filters', () => {
    const contacts = [
      { id: '1', n: 'Alice', bd: '2026-06-05', ua: Date.now() },
      { id: '2', n: 'Bob', bd: '2026-07-20' }, // no ua so it won't be in updates, bd in July so not in June events
      { id: '3', n: 'Charlie', t: [TAGS.SYSTEM.OWNER] } // owner
    ];
    const owner = { n: 'Owner' };
    const draft = generateNewsletterDraft({
      groupName: 'Family',
      contacts,
      owner,
      startDate: '2026-06-01',
      duration: 'monthly',
      personalNote: 'Hello Family!',
      generalNews: 'Nothing new.',
      bridgeLink: 'http://link'
    });

    assert.ok(draft.includes('Hello Family!'), 'Draft should include personal note');
    assert.ok(draft.includes('Family circle'), 'Draft should mention the circle');
    assert.ok(draft.includes('Alice'), 'Draft should list Alice (birthday in June)');
    assert.ok(!draft.includes('Bob'), 'Draft should not list Bob (birthday not in June/monthly lookahead)');
    assert.ok(!draft.includes('Charlie has updated'), 'Draft should not list owner in updates');
    assert.ok(draft.includes('Nothing new.'), 'Draft should include general news');
    assert.ok(draft.includes('http://link'), 'Draft should include bridge link');
  });
});
