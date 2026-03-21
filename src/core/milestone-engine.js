/**
 * Utility for Milestone calculations (Birthdays, Anniversaries, etc.)
 */

/**
 * Normalizes a date into a Month and Day object.
 * Supports: YYYY-MM-DD, MM-DD, and Unix timestamps.
 */
export function getMonthDay(dateVal) {
  if (!dateVal) return null;
  
  // 1. Manually parse YYYY-MM-DD or MM-DD strings to avoid timezone shift
  if (typeof dateVal === 'string') {
    const parts = dateVal.split('-');
    
    // Case: YYYY-MM-DD (e.g., 1990-05-15)
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts.map(Number);
      // Handle the "0000" or "1904" year unknown hack
      const year = (y === 0 || y === 1904) ? null : y;
      return { month: m - 1, day: d, year };
    }
    
    // Case: MM-DD (e.g., 05-15)
    if (parts.length === 2) {
      const [m, d] = parts.map(Number);
      return { month: m - 1, day: d, year: null };
    }
  }

  // 2. Fallback for timestamps or weird formats
  let date;
  if (typeof dateVal === 'number' || /^\d+$/.test(dateVal)) {
    date = new Date(parseInt(dateVal));
  } else if (typeof dateVal === 'string') {
    date = new Date(dateVal);
  } else {
    return null;
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
