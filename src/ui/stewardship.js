import { getAllContacts } from '../storage/contacts.js';
import { getAllLogs } from '../storage/logs.js';
import { getDeletedSinceExport } from '../storage/settings.js';
import { exportSeedling } from '../core/seedling.js';
import { renderOnboarding } from './onboarding.js';
import { showToast } from './components/toast.js';

export async function performStewardshipRitual(db, onSuccess) {
  // Use a slightly more robust confirmation check
  const confirmMsg = "Save a backup of this address book to your device to unlock editing. Your data stays 100% local and private. Save backup now?";
  
  if (!window.confirm(confirmMsg)) {
    return false;
  }

  // Show a "Processing" toast so the user knows something is happening
  showToast("Preparing your backup...");

  try {
    console.log("Stewardship: Fetching contacts and logs...");
    const [allContacts, allLogs] = await Promise.all([
      getAllContacts(db),
      getAllLogs(db)
    ]);
    console.log(`Stewardship: Found ${allContacts.length} contacts and ${allLogs.length} logs.`);
    
    // Include deleted IDs in backup for completeness
    const deletedIds = getDeletedSinceExport();
    const json = exportSeedling(allContacts, allLogs, deletedIds);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `Greatuncle_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(a);
    a.click();
    
    // Wait a tiny bit to ensure the browser has registered the click before DOM cleanup
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    // Transition to onboarding
    const app = document.getElementById('app');
    const tabBar = document.getElementById('tab-bar');
    if (tabBar) tabBar.setAttribute('hidden', '');

    // Force close any open bottom sheets
    document.querySelectorAll('.bottom-sheet-backdrop').forEach(el => el.remove());
    
    // Slight delay to let the user see the "started" feedback
    setTimeout(() => {
      renderOnboarding(db, () => {
        if (onSuccess) onSuccess();
        else window.location.reload();
      });
    }, 300);

    return true;
  } catch (err) {
    console.error("Stewardship ritual failed", err);
    const msg = (err && err.message) ? err.message : String(err);
    
    // Instead of a flashing alert, show a persistent error in the UI
    const app = document.getElementById('app');
    if (app) {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'padding:2rem; background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; border-radius: 12px; margin: 1rem;';
      errorDiv.innerHTML = `
        <h2 style="margin-top:0">Rooting Failed</h2>
        <p>Sorry, we couldn't create your backup: <strong>${msg}</strong></p>
        <p style="font-size: 0.9rem; opacity: 0.8;">This often happens in <strong>Incognito</strong> modes if downloads or storage access are restricted. Try using a standard browser window.</p>
        <button onclick="window.location.reload()" class="trunk-btn" style="margin-top: 1rem;">Back to Circle</button>
      `;
      app.innerHTML = '';
      app.appendChild(errorDiv);
    }
    return false;
  }
}
