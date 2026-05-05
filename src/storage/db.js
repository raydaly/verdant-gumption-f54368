import { APP_CONSTANTS } from '../core/constants.js';

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(APP_CONSTANTS.DB_NAME, APP_CONSTANTS.DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Additive Upgrade Logic: Create stores and indexes ONLY if they don't exist.
      // This prevents data loss during version bumps.
      if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_CONTACTS)) {
        const contacts = db.createObjectStore(APP_CONSTANTS.STORE_CONTACTS, { keyPath: 'id' });
        contacts.createIndex('em', 'em', { unique: false });
        contacts.createIndex('t', 't', { multiEntry: true });
        contacts.createIndex('lc', 'lc');
        contacts.createIndex('su', 'su');
      }

      if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_LOGS)) {
        const logs = db.createObjectStore(APP_CONSTANTS.STORE_LOGS, { autoIncrement: true });
        logs.createIndex('contactId', 'contactId');
        logs.createIndex('timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_SETTINGS)) {
        db.createObjectStore(APP_CONSTANTS.STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
}
