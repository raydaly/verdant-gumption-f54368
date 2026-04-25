import { APP_CONSTANTS } from '../core/constants.js';

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
}

export function getAllContacts(db) {
  const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readonly');
  const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
  return promisifyRequest(store.getAll());
}

export function getContact(db, id) {
  const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readonly');
  const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
  return promisifyRequest(store.get(id));
}

export function saveContact(db, contact) {
  const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readwrite');
  const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
  return promisifyRequest(store.put(contact));
}

export function saveContactsBatch(db, contacts) {
  return new Promise((resolve, reject) => {
    if (!contacts || contacts.length === 0) return resolve();
    const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readwrite');
    const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
    
    for (const contact of contacts) {
      store.put(contact);
    }
    
    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
    tx.onabort = (event) => reject(event.target.error || new Error('Transaction aborted'));
  });
}

export function deleteContact(db, id) {
  const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readwrite');
  const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
  return promisifyRequest(store.delete(id));
}

export function clearAllContacts(db) {
  const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readwrite');
  const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
  return promisifyRequest(store.clear());
}

export function getOwner(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_CONTACTS, 'readonly');
    const store = tx.objectStore(APP_CONSTANTS.STORE_CONTACTS);
    const index = store.index('t');
    const req = index.openCursor(IDBKeyRange.only(APP_CONSTANTS.OWNER_TAG));
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      resolve(cursor ? cursor.value : undefined);
    };
    req.onerror = (event) => reject(event.target.error);
  });
}
