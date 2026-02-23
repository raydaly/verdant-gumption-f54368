export function exportToCalendar(appInstance, id, customDateTime = null, activity = "Connection") {
    let contact;
    let namesList = "";

    if (id === 'gathering-group') {
        const db = appInstance.getSuggestionContext();
        if (db.gathering) {
            contact = { name: `Group (${db.gathering.tag})` };
            namesList = `Sustain connections with:\n` + db.gathering.people.map(p => `- ${p.name}`).join('\n');
        } else {
            return;
        }
    } else {
        contact = appInstance.contacts.find(c => c.id === id);
    }

    if (!contact) return;

    const title = `${activity}: ${contact.name}`;
    const description = namesList || `${activity} via Greatuncle.`;

    const start = customDateTime ? new Date(customDateTime) : new Date();
    if (!customDateTime) {
        start.setHours(start.getHours() + 1); // Default to +1h if immediate export
    }

    const end = new Date(start.getTime() + (60 * 60 * 1000)); // 1 hour duration

    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Greatuncle//Connection Tool//EN',
        'BEGIN:VEVENT',
        `UID:${crypto.randomUUID()}`,
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
    link.setAttribute('download', `${contact.name.replace(/\s+/g, '_')}_${activity.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
