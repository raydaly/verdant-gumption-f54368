/**
 * Utility for Milestone calculations (Birthdays, Anniversaries, etc.)
 */

/**
 * Normalizes a date into a Month and Day object.
 * Supports: YYYY-MM-DD, MM-DD, and Unix timestamps.
 */
export function getMonthDay(dateVal) {
  if (!dateVal) return null;
  
  let date;
  if (typeof dateVal === 'number' || /^\d+$/.test(dateVal)) {
    date = new Date(parseInt(dateVal));
  } else if (typeof dateVal === 'string') {
    // Check for MM-DD (no year)
    if (/^\d{1,2}-\d{1,2}$/.test(dateVal)) {
      const [m, d] = dateVal.split('-').map(Number);
      return { month: m - 1, day: d };
    }
    date = new Date(dateVal);
  } else {
    return null;
  }

  if (isNaN(date.getTime())) return null;
  return { month: date.getMonth(), day: date.getDate() };
}

/**
 * Calculates days until the next occurrence of a month/day event.
 */
export function getDaysUntil(month, day) {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Try this year
  let next = new Date(currentYear, month, day);
  
  // If it already passed this year, try next year
  if (next < now && (now.getMonth() !== month || now.getDate() !== day)) {
    next = new Date(currentYear + 1, month, day);
  }
  
  const diff = next.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
            daysUntil: days
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
          day: md.day
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
