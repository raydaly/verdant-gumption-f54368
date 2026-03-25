// Frequency in days between contacts for each level tag.
// These match the `display` values in the LEVELS array (level-selector.js).
const LEVEL_DAYS = {
  '&level5':   5,
  '&level15':  10,
  '&level50':  35,
  '&level150': 100,
};

function isOwner(contact) {
  return (contact.t || []).includes('&owner');
}

function getLevelTag(tags) {
  return Object.keys(LEVEL_DAYS).find(t => (tags || []).includes(t)) || null;
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
    const lastMs = c.lc || c.ca || now;
    const daysSince = (now - lastMs) / 86400000;
    const daysOverdue = daysSince - frequency;
    const urgency = daysOverdue / frequency;

    if (urgency > -0.2) {
      results.push({
        contact: c,
        levelTag,
        frequency,
        daysSince: Math.round(daysSince),
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
      if (typeof stored === 'string' && stored.startsWith('0000-')) {
        const parts = stored.split('-');
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
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
    const freq = LEVEL_DAYS[getLevelTag(c.t)];
    const lastMs = c.lc || 0;
    if ((now - lastMs) / 86400000 <= freq) upToDate++;
  }

  const overdue = eligible.length - upToDate;
  const pct = Math.round((upToDate / eligible.length) * 100);
  return { upToDate, overdue, total: eligible.length, pct };
}
