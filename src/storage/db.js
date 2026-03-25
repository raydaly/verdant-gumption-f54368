import { APP_CONSTANTS } from '../core/constants.js';

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(APP_CONSTANTS.DB_NAME, APP_CONSTANTS.DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Wipe old stores if they exist (fresh start)
      for (const name of db.objectStoreNames) {
        db.deleteObjectStore(name);
      }

      const contacts = db.createObjectStore(APP_CONSTANTS.STORE_CONTACTS, { keyPath: 'id' });
      contacts.createIndex('em', 'em', { unique: false });
      contacts.createIndex('t', 't', { multiEntry: true });
      contacts.createIndex('lc', 'lc');
      contacts.createIndex('su', 'su');

      const logs = db.createObjectStore(APP_CONSTANTS.STORE_LOGS, { autoIncrement: true });
      logs.createIndex('contactId', 'contactId');
      logs.createIndex('timestamp', 'timestamp');

      db.createObjectStore(APP_CONSTANTS.STORE_SETTINGS, { keyPath: 'id' });
    };

    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
}
