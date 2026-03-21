/**
 * Utility for Milestone calculations (Birthdays, Anniversaries, etc.)
 */

/**
 * Normalizes a date into a Month and Day object.
 * Supports: YYYY-MM-DD, MM-DD, and Unix timestamps.
 */
export function getMonthDay(dateVal) {
  if (!dateVal) return null;
  
  // 1. Convert to a trimmed string and strip time portion
  let str = String(dateVal).trim();
  if (!str) return null;

  // Split on Space or 'T' to isolate the date part (e.g. 2024-03-20T00:00Z -> 2024-03-20)
  const datePart = str.split(/[ T]/)[0];
  const parts = datePart.split(/[-/]/);

  // Case: YYYY-MM-DD or YYYY/MM/DD
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts.map(v => parseInt(v, 10));
    if (!isNaN(m) && !isNaN(d)) {
      const year = (y === 0 || y === 1904) ? null : y;
      return { month: m - 1, day: d, year };
    }
  }

  // Case: MM-DD or MM/DD
  if (parts.length === 2) {
    const [m, d] = parts.map(v => parseInt(v, 10));
    if (!isNaN(m) && !isNaN(d)) {
      return { month: m - 1, day: d, year: null };
    }
  }

  // Case: MM/DD/YYYY or DD/MM/YYYY? Assume MM/DD/YYYY for US compatibility.
  if (parts.length === 3 && (parts[2].length === 4 || parts[2].length === 2)) {
    const [m, d, y] = parts.map(v => parseInt(v, 10));
    if (!isNaN(m) && !isNaN(d)) {
      const year = (y === 0 || y === 1904) ? null : (y < 100 ? 2000 + y : y);
      return { month: m - 1, day: d, year };
    }
  }

  // Fallback: Use browser parsing for timestamps or weird formats
  let date;
  if (/^\d+$/.test(str)) {
    date = new Date(parseInt(str, 10));
  } else {
    date = new Date(str);
  }

  if (isNaN(date.getTime())) return null;
  return { month: date.getMonth(), day: date.getDate(), year: date.getFullYear() };
}

/**
 * Calculates days until the next occurrence of a month/day event.
 * Normalizes to local midnight for accuracy.
 */
export function getDaysUntil(month, day) {
  const now = new Date();
  // Today at local midnight
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const currentYear = today.getFullYear();
  
  // Candidate for this year
  let next = new Date(currentYear, month, day);
  
  // If it already passed this year, use next year
  if (next < today) {
    next = new Date(currentYear + 1, month, day);
  }
  
  const diff = next.getTime() - today.getTime();
  // Round to nearest day to handle any DST shifts
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the age at the next occurrence.
 */
function getAgeAtEvent(birthYear, eventMonth, eventDay) {
  if (!birthYear) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = today.getFullYear();
  
  let eventThisYear = new Date(currentYear, eventMonth, eventDay);
  let targetYear = (eventThisYear < today) ? currentYear + 1 : currentYear;
  
  return targetYear - birthYear;
}

/**
 * Returns a list of milestones for the next 31 days.
 */
export function getUpcomingMilestones(contacts, daysLimit = 31) {
  const milestones = [];
  
  contacts.forEach(c => {
    const events = [
      { type: 'Birthday', icon: '🎂', val: c.birthday },
      { type: 'Anniversary', icon: '💍', val: c.anniversary },
      { type: 'Legacy', icon: '🌿', val: c.date_of_passing }
    ];

    events.forEach(e => {
      const md = getMonthDay(e.val);
      if (md) {
        const days = getDaysUntil(md.month, md.day);
        if (days >= 0 && days <= daysLimit) {
          milestones.push({
            name: c.name,
            type: e.type,
            icon: e.icon,
            month: md.month,
            day: md.day,
            daysUntil: days,
            age: getAgeAtEvent(md.year, md.month, md.day)
          });
        }
      }
    });
  });

  return milestones.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Group all milestones by month for a full calendar view.
 */
export function getFullYearMilestones(contacts) {
  const all = [];
  contacts.forEach(c => {
    const events = [
      { type: 'Birthday', icon: '🎂', val: c.birthday },
      { type: 'Anniversary', icon: '💍', val: c.anniversary },
      { type: 'Legacy', icon: '🌿', val: c.date_of_passing }
    ];

    events.forEach(e => {
      const md = getMonthDay(e.val);
      if (md) {
        all.push({
          name: c.name,
          type: e.type,
          icon: e.icon,
          month: md.month,
          day: md.day,
          age: getAgeAtEvent(md.year, md.month, md.day)
        });
      }
    });
  });

  // Group by month
  const months = Array.from({ length: 12 }, (_, i) => ({
    name: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
    index: i,
    events: []
  }));

  all.forEach(e => {
    months[e.month].events.push(e);
  });

  months.forEach(m => {
    m.events.sort((a, b) => a.day - b.day);
  });

  return months.filter(m => m.events.length > 0);
}

/**
 * Formats a month/day according to settings.
 */
export function formatMilestoneDate(month, day, setting = 'default') {
  if (setting === 'mdy') return `${month + 1}/${day}`;
  if (setting === 'dmy') return `${day}/${month + 1}`;
  if (setting === 'ymd') return `${month + 1}-${day}`;
  
  // Default: Use browser's short format without year (e.g., "May 15" or "15 May")
  return new Date(2000, month, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
