/**
 * Exports a connection event to a downloadable .ics file.
 */
export function exportToCalendar(contact, activity = "Connection") {
  if (!contact) return;

  const title = `${activity}: ${contact.n}`;
  const description = `${activity} via Greatuncle.`;

  const start = new Date();
  start.setHours(start.getHours() + 1); // Default to +1h from now
  const end = new Date(start.getTime() + (60 * 60 * 1000)); // 1 hour duration

  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Greatuncle//Connection Tool//EN',
    'BEGIN:VEVENT',
    `UID:${self.crypto?.randomUUID() || Math.random().toString(36)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(contact.n || 'Contact').replace(/\s+/g, '_')}_${activity.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
