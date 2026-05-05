import { APP_CONSTANTS } from '../core/constants.js';

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(APP_CONSTANTS.DB_NAME, APP_CONSTANTS.DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Additive Upgrade Logic: Create stores and indexes ONLY if they don't exist.
      // This prevents data loss during version bumps.
      if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_CONTACTS)) {
        db.createObjectStore(APP_CONSTANTS.STORE_CONTACTS, { keyPath: 'id' });
      }
      
      const contactsStore = event.target.transaction.objectStore(APP_CONSTANTS.STORE_CONTACTS);
      if (!contactsStore.indexNames.contains('em')) contactsStore.createIndex('em', 'em', { unique: false });
      if (!contactsStore.indexNames.contains('t')) contactsStore.createIndex('t', 't', { multiEntry: true });
      if (!contactsStore.indexNames.contains('lc')) contactsStore.createIndex('lc', 'lc');
      if (!contactsStore.indexNames.contains('su')) contactsStore.createIndex('su', 'su');
      if (!contactsStore.indexNames.contains('nd')) contactsStore.createIndex('nd', 'nd');

      if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_LOGS)) {
        db.createObjectStore(APP_CONSTANTS.STORE_LOGS, { autoIncrement: true });
      }
      const logsStore = event.target.transaction.objectStore(APP_CONSTANTS.STORE_LOGS);
      if (!logsStore.indexNames.contains('contactId')) logsStore.indexNames.contains('contactId') || logsStore.createIndex('contactId', 'contactId');
      if (!logsStore.indexNames.contains('timestamp')) logsStore.indexNames.contains('timestamp') || logsStore.createIndex('timestamp', 'timestamp');

      if (!db.objectStoreNames.contains(APP_CONSTANTS.STORE_SETTINGS)) {
        db.createObjectStore(APP_CONSTANTS.STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
}
