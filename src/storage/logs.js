import { APP_CONSTANTS } from '../core/constants.js';

export function getLogsForContact(db, contactId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_LOGS, 'readonly');
    const store = tx.objectStore(APP_CONSTANTS.STORE_LOGS);
    const index = store.index('contactId');
    const results = [];
    const req = index.openCursor(IDBKeyRange.only(contactId), 'prev');
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = (event) => reject(event.target.error);
  });
}

export function getAllLogs(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_LOGS, 'readonly');
    const store = tx.objectStore(APP_CONSTANTS.STORE_LOGS);
    const index = store.index('timestamp');
    const results = [];
    const req = index.openCursor(null, 'prev');
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = (event) => reject(event.target.error);
  });
}

export function addLog(db, contactId, timestamp, comment) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_LOGS, 'readwrite');
    const store = tx.objectStore(APP_CONSTANTS.STORE_LOGS);
    const req = store.add({ contactId, timestamp, comment });
    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
}

export function restoreLogsForContact(db, logs) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_LOGS, 'readwrite');
    const store = tx.objectStore(APP_CONSTANTS.STORE_LOGS);
    logs.forEach(log => {
      const { ...record } = log;
      store.add(record);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
  });
}

export function clearAllLogs(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_LOGS, 'readwrite');
    const store = tx.objectStore(APP_CONSTANTS.STORE_LOGS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = (event) => reject(event.target.error);
  });
}

export function deleteLogsForContact(db, contactId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(APP_CONSTANTS.STORE_LOGS, 'readwrite');
    const store = tx.objectStore(APP_CONSTANTS.STORE_LOGS);
    const index = store.index('contactId');
    const req = index.openCursor(IDBKeyRange.only(contactId));
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    req.onerror = (event) => reject(event.target.error);
    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
  });
}
