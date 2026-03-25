import { getAllContacts } from '../../storage/contacts.js';
import { getLastExportedAt, getDeletedSinceExport } from '../../storage/settings.js';

/**
 * Updates the global #horizon-bar based on "vulnerability score":
 * Width = percentage based on (dirty contacts + deleted count).
 * Color = based on (days since last backup).
 */
export async function updateHorizonBar(db) {
  const bar = document.getElementById('horizon-bar');
  if (!bar) return;

  bar.style.cursor = 'pointer';
  bar.onclick = () => {
    import('../router.js').then(({ navigate }) => navigate('backup'));
  };

  const lastExport = getLastExportedAt();
  const deletedSinceExport = getDeletedSinceExport();
  const allContacts = await getAllContacts(db);
  
  // Count dirty contacts efficiently-ish 
  // (We could use the index, but for < 150 contacts, filter is fine)
  const dirtyCount = allContacts.filter(c => (c.t || []).includes('&dirty')).length;
  const totalVolatility = dirtyCount + deletedSinceExport.length;

  const daysSinceExport = lastExport 
    ? (Date.now() - lastExport) / 86400000 
    : 30; // 30+ days if never exported

  // Width: grows with change (1 change = 5%, max 100%)
  const width = Math.min(100, Math.max(0, totalVolatility * 5));
  
  // Color: hue transition from healthy green to urgent red
  // healthy (0 days) = teal (#4A6741), mid-danger (14 days) = amber (#D4A373), high-danger (30+ days) = ruby (#D84315)
  let color = 'var(--color-action)';
  if (daysSinceExport > 30) {
    color = '#D84315'; // Vulnerable (red)
  } else if (daysSinceExport > 14) {
    color = 'var(--color-amber)'; // Aging (amber)
  } else if (totalVolatility > 5 && daysSinceExport > 7) {
    color = '#D4A373'; // Busy but aging (amber)
  } else if (totalVolatility > 0) {
    color = 'var(--color-action)'; // Busy but fresh (teal)
  } else {
    color = 'var(--color-action)'; // Quiet (teal)
  }

  bar.style.width = `${width}%`;
  bar.style.backgroundColor = color;
  
  // Update tooltip/metadata if we want accessibility
  bar.setAttribute('aria-label', `${totalVolatility} unsaved changes, last backup ${Math.floor(daysSinceExport)} days ago`);
  bar.setAttribute('title', `${totalVolatility} unsaved changes, last backup ${Math.floor(daysSinceExport)} days ago`);
}
