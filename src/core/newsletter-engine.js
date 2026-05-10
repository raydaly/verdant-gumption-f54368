import { getAnchorEvents } from './outreach-engine.js';

/**
 * Stewardship Window Logic:
 * Early in month (1-15) -> 1st of current month
 * Late in month (16+)   -> 1st of next month
 */
export function getNearestFirstOfMonth(date = new Date()) {
  const d = new Date(date);
  if (d.getDate() > 15) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

export function generateNewsletterDraft({
  groupName,
  contacts,
  owner,
  startDate,
  duration, // 'monthly' or 'quarterly'
  personalNote,
  generalNews,
  bridgeLink
}) {
  const lookahead = duration === 'quarterly' ? 92 : 31;
  const start = new Date(startDate);
  
  // 1. Personal Note
  let draft = '';
  if (personalNote) {
    draft += `${personalNote}\n\n`;
  }
  
  draft += `This is a personal update from ${owner.n} for the ${groupName} circle.\n\n`;

  // 3. Radar: Upcoming Events
  const events = getAnchorEvents(contacts, start, lookahead);
  
  if (events.length > 0) {
    draft += `RADAR: UPCOMING EVENTS\n`;
    events.forEach(e => {
      const dateStr = e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const icon = e.type === 'birthday' ? '🎂' : '💍';
      draft += `${dateStr}: ${e.contact.n} (${icon} ${e.type})\n`;
    });
    draft += `\n`;
  }

  // 4. Circle Updates (Changes since the lookback period)
  const lookback = duration === 'quarterly' ? 92 : 31;
  const threshold = start.getTime() - (lookback * 86400000);
  const changed = contacts.filter(c => c.ua && c.ua > threshold && !(c.t || []).includes('&owner'));
  
  if (changed.length > 0) {
    draft += `CIRCLE UPDATES\n`;
    changed.forEach(c => {
      draft += `• ${c.n} has updated contact info.\n`;
    });
    draft += `\n`;
  }

  // 5. General News
  if (generalNews) {
    draft += `GENERAL NEWS\n${generalNews}\n\n`;
  }

  // 6. The Appendix (P.S.)
  if (bridgeLink) {
    draft += `---\n`;
    draft += `P.S. To keep your own address book updated with these changes, you can click this link to import the latest ${groupName} contact list:\n`;
    draft += `${bridgeLink}\n`;
  }

  return draft;
}
