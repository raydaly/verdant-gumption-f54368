export class GreatuncleDB {
    constructor(dbName = 'GreatunclePWA', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error("Database error: ", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Store 1: Contacts (Key path is id)
                if (!db.objectStoreNames.contains('contacts')) {
                    db.createObjectStore('contacts', { keyPath: 'id' });
                }
                // Store 2: Settings (Key path is static string 'id')
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
            };
        });
    }

    async saveContacts(contacts) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['contacts'], 'readwrite');
            const store = transaction.objectStore('contacts');

            // clear first to handle deletes
            store.clear().onsuccess = () => {
                let successCount = 0;
                if (contacts.length === 0) return resolve();

                contacts.forEach(contact => {
                    const request = store.add(contact);
                    request.onsuccess = () => {
                        successCount++;
                        if (successCount === contacts.length) resolve();
                    };
                    request.onerror = (e) => reject(e.target.error);
                });
            };
            transaction.onerror = (e) => reject(e.target.error);
        });
    }

    async loadContacts() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['contacts'], 'readonly');
            const store = transaction.objectStore('contacts');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async saveSettings(settings) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');

            const payload = { id: 'core_settings', ...settings };
            const request = store.put(payload);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async loadSettings() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('core_settings');

            request.onsuccess = () => {
                if (request.result) {
                    const { id, ...actualSettings } = request.result;
                    resolve(actualSettings);
                } else {
                    resolve(null);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // Helper to migrate data from localStorage
    migrateFromLocalStorage() {
        const migratedFlag = localStorage.getItem('greatuncle_migrated_idb');
        if (migratedFlag === 'true') return null;

        const savedContacts = localStorage.getItem('greatuncle_contacts');
        const savedSettings = localStorage.getItem('greatuncle_settings');

        if (!savedContacts && !savedSettings) {
            // Nothing to migrate
            localStorage.setItem('greatuncle_migrated_idb', 'true');
            return null;
        }

        const data = {
            contacts: savedContacts ? JSON.parse(savedContacts) : [],
            settings: savedSettings ? JSON.parse(savedSettings) : {}
        };

        return data; // Caller should save this array to IndexedDB and then mark complete
    }

    markMigrated() {
        localStorage.setItem('greatuncle_migrated_idb', 'true');
        // Once confirmed, we could eventually clear localStorage contacts to free space
    }

    async checkStorage() {
        if (!navigator.storage || !navigator.storage.estimate) return null;
        try {
            const estimate = await navigator.storage.estimate();
            const isPersisted = await navigator.storage.persisted();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0,
                isPersisted
            };
        } catch (e) {
            console.error("Storage estimate error", e);
            return null;
        }
    }

    async requestPersistentStorage() {
        if (!navigator.storage || !navigator.storage.persist) return false;
        try {
            return await navigator.storage.persist();
        } catch (e) {
            console.error("Storage persist error", e);
            return false;
        }
    }
}
