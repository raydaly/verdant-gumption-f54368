import { getAllContacts } from '../storage/contacts.js';
import { getAllLogs } from '../storage/logs.js';
import { getDeletedSinceExport } from '../storage/settings.js';
import { exportSeedling } from '../core/seedling.js';
import { renderOnboarding } from './onboarding.js';

export async function performStewardshipRitual(db, onSuccess) {
  const confirmed = window.confirm(
    "To become the Architect of this Circle, first save a backup of your data.\n\n" +
    "This proves you hold your data locally on your device, not us. Download your Seedling Backup now?"
  );
  if (!confirmed) return false;

  try {
    const allContacts = await getAllContacts(db);
    const allLogs = await getAllLogs(db);
    const json = exportSeedling(allContacts, allLogs, getDeletedSinceExport());
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Greatuncle_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    // Turn off tabs temporarily to focus on onboarding
    document.getElementById('tab-bar').setAttribute('hidden', '');
    
    renderOnboarding(db, () => {
      if (onSuccess) onSuccess();
      else window.location.reload();
    });
    return true;
  } catch (err) {
    console.error("Backup failed", err);
    alert("Failed to create backup: " + err.message);
    return false;
  }
}
