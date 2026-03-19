import { DEFAULT_SETTINGS, APP_CONSTANTS } from '../core/constants.js';

export function getSettings(db) {
  return new Promise((resolve) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(APP_CONSTANTS.STORE_SETTINGS);
    const req = store.get('core_settings');
    req.onsuccess = (e) => {
      const { id, ...data } = e.target.result || {};
      resolve({ ...DEFAULT_SETTINGS, ...data });
    };
    req.onerror = () => resolve({ ...DEFAULT_SETTINGS });
  });
}

export async function saveSettings(db, partial) {
  const current = await getSettings(db);
  const merged = { ...current, ...partial, id: 'core_settings' };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(APP_CONSTANTS.STORE_SETTINGS);
    const req = store.put(merged);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

export function getLastExportedAt() {
  const val = localStorage.getItem(APP_CONSTANTS.LS_LAST_EXPORTED_AT);
  return val ? Number(val) : null;
}

export function setLastExportedAt(ts) {
  localStorage.setItem(APP_CONSTANTS.LS_LAST_EXPORTED_AT, String(ts));
}

export function getDeletedSinceExport() {
  try {
    const raw = localStorage.getItem(APP_CONSTANTS.LS_DELETED_SINCE_EXPORT);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDeletedSinceExport(id) {
  const current = getDeletedSinceExport();
  if (!current.includes(id)) {
    current.push(id);
    localStorage.setItem(APP_CONSTANTS.LS_DELETED_SINCE_EXPORT, JSON.stringify(current));
  }
}

export function removeFromDeletedSinceExport(id) {
  const current = getDeletedSinceExport();
  const updated = current.filter(x => x !== id);
  localStorage.setItem(APP_CONSTANTS.LS_DELETED_SINCE_EXPORT, JSON.stringify(updated));
}

export function resetDeletedSinceExport() {
  localStorage.removeItem(APP_CONSTANTS.LS_DELETED_SINCE_EXPORT);
}

export function getPendingImportNudge() {
  return localStorage.getItem(APP_CONSTANTS.LS_PENDING_IMPORT_NUDGE) === 'true';
}

export function setPendingImportNudge(bool) {
  localStorage.setItem(APP_CONSTANTS.LS_PENDING_IMPORT_NUDGE, String(bool));
}
