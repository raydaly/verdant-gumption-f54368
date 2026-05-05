import { saveContact } from '../../storage/contacts.js';
import { showBottomSheet } from './bottom-sheet.js';
import { getAnchorEvents } from '../../core/outreach-engine.js';

export function showLaterSheet(db, contact, onDone) {
  const content = document.createElement('div');
  
  const title = document.createElement('div');
  title.textContent = 'When should we try again?';
  title.style.marginBottom = '1rem';
  title.style.color = 'var(--color-text-muted)';
  title.style.fontSize = '0.9rem';
  content.appendChild(title);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '0.75rem';

  const createOption = (label, icon, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'trunk-btn trunk-btn--secondary';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '1rem';
    btn.style.gap = '0.5rem';
    btn.style.height = 'auto';

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.fontSize = '1.5rem';
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontSize = '0.85rem';
    labelEl.style.lineHeight = '1.2';

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    btn.addEventListener('click', onClick);
    return btn;
  };

  const setDateAndClose = async (targetDateMs, closeFunc) => {
    // We update 'nd' (Next Date). We also clear 'su' (Snooze Until) since 'nd' replaces it logically.
    await saveContact(db, { ...contact, nd: targetDateMs, su: null, ua: Date.now() });
    closeFunc();
    if (onDone) onDone();
  };

  const now = Date.now();

  // Option 1: Wait a Week
  grid.appendChild(createOption('Wait a Week', '🕒', () => setDateAndClose(now + (7 * 86400000), close)));

  // Option 2: Contextual (Wait for Event)
  const events = getAnchorEvents([contact], new Date(), 30);
  if (events.length > 0) {
    const nextEvent = events[0];
    const eventLabel = nextEvent.type === 'birthday' ? 'Birthday' : 'Anniversary';
    const eventIcon = nextEvent.type === 'birthday' ? '🎂' : '💍';
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStr = `${monthNames[nextEvent.date.getMonth()]} ${nextEvent.date.getDate()}`;
    
    grid.appendChild(createOption(`Wait for ${eventLabel}\n(${dateStr})`, eventIcon, () => {
      // Set to 8 AM on the event date
      const eventTime = new Date(nextEvent.date);
      eventTime.setHours(8, 0, 0, 0);
      setDateAndClose(eventTime.getTime(), close);
    }));
  }

  // Option 3: Wait a Month
  grid.appendChild(createOption('Wait a Month', '📅', () => setDateAndClose(now + (30 * 86400000), close)));

  // Option 4: Specific Date
  const datePickerBtn = createOption('Specific Date...', '🗓️', () => {
    // Create an invisible native date picker and trigger it
    const input = document.createElement('input');
    input.type = 'date';
    input.style.position = 'absolute';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);
    
    input.addEventListener('change', () => {
      if (input.value) {
        // Parse the YYYY-MM-DD input as local time
        const parts = input.value.split('-');
        const selectedDate = new Date(parts[0], parts[1] - 1, parts[2], 8, 0, 0, 0);
        setDateAndClose(selectedDate.getTime(), close);
      }
      document.body.removeChild(input);
    });
    
    input.showPicker ? input.showPicker() : input.click();
  });
  grid.appendChild(datePickerBtn);

  content.appendChild(grid);

  const { close } = showBottomSheet({ title: 'Reschedule', content });
}
