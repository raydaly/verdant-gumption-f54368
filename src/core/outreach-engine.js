import { TAGS } from './constants.js';

// Frequency in days between contacts for each level tag.
// These match the `display` values in the LEVELS array (level-selector.js).
const LEVEL_DAYS = {
  [TAGS.LEVELS.L5]:   5,
  [TAGS.LEVELS.L15]:  10,
  [TAGS.LEVELS.L50]:  35,
  [TAGS.LEVELS.L150]: 100,
};

function isOwner(contact) {
  return (contact.t || []).includes(TAGS.SYSTEM.OWNER);
}

function getLevelTag(tags) {
  return Object.keys(LEVEL_DAYS).find(t => (tags || []).includes(t)) || null;
}

export function calculateNextTarget(contact, now = Date.now()) {
  const levelTag = getLevelTag(contact.t);
  if (!levelTag) return null;
  const frequency = LEVEL_DAYS[levelTag];
  const lastMs = contact.lc || contact.ca || now;
  return lastMs + (frequency * 86400000);
}

export function getDueContacts(contacts, today = new Date()) {
  const now = today.getTime();
  const results = [];

  for (const c of contacts) {
    if (isOwner(c)) continue;

    const levelTag = getLevelTag(c.t);
    if (!levelTag) continue;

    if (c.su && c.su > now) continue;

    const frequency = LEVEL_DAYS[levelTag];
    const isPlanned = !!c.nd;
    const targetDateMs = c.nd || calculateNextTarget(c, now);
    
    const daysOverdue = (now - targetDateMs) / 86400000;
    
    let urgency;
    let shouldShow = false;

    if (isPlanned) {
      // For planned dates, show if within 24 hours or overdue
      shouldShow = daysOverdue > -1;
      urgency = daysOverdue >= 0 ? 1 + daysOverdue : 0.5;
    } else {
      // For calculated dates, show if 80% of the way there
      urgency = daysOverdue / frequency;
      shouldShow = urgency > -0.2;
    }

    if (shouldShow) {
      results.push({
        contact: c,
        levelTag,
        frequency,
        targetDateMs,
        isPlanned,
        daysOverdue: Math.round(daysOverdue),
        urgency,
      });
    }
  }

  return results.sort((a, b) => b.urgency - a.urgency);
}

export function getAnchorEvents(contacts, today = new Date(), lookAheadDays = 30) {
  const todayMs = today.getTime();
  const year = today.getFullYear();
  const allEvents = [];
  
  for (const c of contacts) {
    if (isOwner(c)) continue;

    for (const field of ['bd', 'av']) {
      const stored = c[field];
      if (!stored) continue;

      let month, day;
      if (typeof stored === 'string') {
        const parts = stored.split('-');
        if (parts.length === 3) {
          // YYYY-MM-DD or 0000-MM-DD
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else if (parts.length === 2) {
          // MM-DD
          month = parseInt(parts[0], 10) - 1;
          day = parseInt(parts[1], 10);
        } else {
          // Fallback to Date object if string is weird
          const d = new Date(stored);
          if (isNaN(d.getTime())) continue;
          month = d.getMonth();
          day = d.getDate();
        }
      } else {
        const d = new Date(stored);
        if (isNaN(d.getTime())) continue;
        month = d.getMonth();
        day = d.getDate();
      }

      let eventDate = new Date(year, month, day);
      if (eventDate.getTime() < todayMs - 86400000) {
        eventDate = new Date(year + 1, month, day);
      }

      const daysUntil = Math.round((eventDate.getTime() - todayMs) / 86400000);
      if (daysUntil >= 0 && daysUntil <= lookAheadDays) {
        allEvents.push({ contact: { ...c }, type: field === 'bd' ? 'birthday' : 'anniversary', date: eventDate, daysUntil });
      }
    }
  }

  const grouped = [];
  const map = new Map();
  allEvents.forEach(e => {
    if (e.type === 'anniversary') {
      const key = `${e.date.getTime()}_anniversary`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.contact.n += ` and ${e.contact.n}`;
      } else {
        map.set(key, e);
        grouped.push(e);
      }
    } else {
      grouped.push(e);
    }
  });

  return grouped.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getSnoozeMs(settings) {
  return ((settings && settings.skipDays) || 7) * 86400000;
}

export function checkGatheringRules(rules, today = new Date()) {
  if (!rules || rules.length === 0) return [];
  const dayOfWeek = today.getDay();
  return rules.filter(rule => rule.dayOfWeek === dayOfWeek);
}

export function getConnectionHealth(contacts) {
  const eligible = contacts.filter(c => !isOwner(c) && getLevelTag(c.t));
  if (eligible.length === 0) return { upToDate: 0, overdue: 0, total: 0, pct: 100 };

  const now = Date.now();
  let upToDate = 0;

  for (const c of eligible) {
    const isPlanned = !!c.nd;
    const targetDateMs = c.nd || calculateNextTarget(c, now);
    if (now <= targetDateMs) upToDate++;
  }

  const overdue = eligible.length - upToDate;
  const pct = Math.round((upToDate / eligible.length) * 100);
  return { upToDate, overdue, total: eligible.length, pct };
}
