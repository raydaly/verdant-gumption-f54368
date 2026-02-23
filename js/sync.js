export class SyncManager {
    constructor(app) {
        this.app = app;
    }

    exportJson(silent = false) {
        const cleanReplacer = (key, value) => {
            if (value === null || value === undefined || value === "") return undefined;
            if (Array.isArray(value) && value.length === 0) return undefined;
            return value;
        };

        const data = {
            version: '1.3',
            timestamp: Date.now(),
            settings: this.app.settings,
            contacts: this.app.contacts
        };

        const isReadable = document.getElementById('toggle-readable-json')?.checked;
        const json = JSON.stringify(data, cleanReplacer, isReadable ? 2 : 0);
        const output = isReadable ? json : btoa(json);

        const box = document.getElementById('digital-seed-box');
        if (box) {
            box.value = output;

            if (!silent) {
                box.select();
                navigator.clipboard.writeText(output);

                // Update timestamp
                this.app.settings.lastExportTimestamp = Date.now();
                this.app.saveState(true);
                this.app.ui.updateBackupNudge();

                alert("Digital Seedling generated and copied to clipboard! Save this text in a safe place.");
            }
        }
        return output;
    }

    async shareBackup() {
        if (!navigator.share) {
            alert("Native sharing not supported in this browser. Please use Copy to Clipboard.");
            return;
        }

        const output = this.exportJson(true); // Generate but don't copy/alert
        if (!output) return;

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        try {
            await navigator.share({
                title: `Greatuncle Backup ${dateStr}`,
                text: output
            });

            // On success, still update the nudge
            this.app.settings.lastExportTimestamp = Date.now();
            this.app.saveState(true);
            this.app.ui.updateBackupNudge();
        } catch (err) {
            console.log("Sharing failed or canceled:", err);
        }
    }

    importJson() {
        const box = document.getElementById('digital-seed-box');
        const input = box ? box.value.trim() : "";
        if (!input) {
            alert("Please paste your Digital Seedling (data string) into the box first.");
            return;
        }

        try {
            let data;
            if (input.startsWith('{')) {
                // Handle raw JSON
                data = JSON.parse(input);
            } else {
                // Handle base64 encoded
                data = JSON.parse(atob(input));
            }

            if (!data.contacts || !Array.isArray(data.contacts)) {
                throw new Error("Invalid format: No contacts found.");
            }

            if (confirm(`Warning: This will OVERWRITE your current circle with ${data.contacts.length} people from the backup. Are you sure?`)) {

                // Keep the current user tags across the backup unless it's an initial restore
                this.app.contacts = data.contacts.map(c => ({
                    last_contacted: 0,
                    logs: [],
                    tags: [],
                    snooze_until: null,
                    is_user: false,
                    ...c
                }));

                if (data.settings) {
                    this.app.settings = { ...this.app.settings, ...data.settings };
                }
                this.app.saveState();
                this.app.refreshSuggestions();
                this.app.ui.render();
                alert("Circle restored successfully!");
                box.value = "";
            }
        } catch (err) {
            console.error("Import failed", err);
            alert("Invalid Digital Seedling. Please ensure you've pasted the exact data correctly.");
        }
    }

    mergeJson() {
        const box = document.getElementById('digital-seed-box');
        const input = box ? box.value.trim() : "";
        if (!input) {
            alert("Please paste your Digital Seedling (data string) into the box first.");
            return;
        }

        try {
            let data;
            if (input.startsWith('{')) {
                data = JSON.parse(input);
            } else {
                data = JSON.parse(atob(input));
            }

            if (!data.contacts || !Array.isArray(data.contacts)) {
                throw new Error("Invalid format: No contacts found.");
            }

            let addedAny = false;
            // Generate a merge tag specifically for this action
            const now = new Date();
            const batchTag = `@merge${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

            data.contacts.forEach(c => {
                const exists = this.app.contacts.find(existing => {
                    const nameMatch = existing.name.toLowerCase() === c.name.toLowerCase();
                    const phoneMatch = c.phone && this.app.normalizePhone(existing.phone) === this.app.normalizePhone(c.phone);
                    const emailMatch = c.email && existing.email && existing.email.toLowerCase() === c.email.toLowerCase();
                    return nameMatch || phoneMatch || emailMatch;
                });

                if (!exists) {
                    this.app.contacts.push({ // Direct push because saveState happens at end
                        id: crypto.randomUUID(),
                        name: c.name,
                        phone: c.phone || '',
                        email: c.email || '',
                        birthday: c.birthday || c.bday || null,
                        anniversary: c.anniversary || null,
                        last_contacted: 0,
                        logs: [],
                        tags: ['&share', batchTag, ...(c.tags || [])]
                    });
                    addedAny = true;
                } else if (exists.tags?.includes('&share')) {
                    // Already in queue
                } else {
                    this.app.contacts.push({
                        id: crypto.randomUUID(),
                        name: c.name,
                        phone: c.phone || '',
                        email: c.email || '',
                        birthday: c.birthday || c.bday || null,
                        anniversary: c.anniversary || null,
                        last_contacted: 0,
                        logs: [],
                        tags: ['&share', '&duplicate', batchTag, ...(c.tags || [])],
                        matchedId: exists.id
                    });
                    addedAny = true;
                }
            });

            if (addedAny) {
                this.app.saveState();
                box.value = "";
                // Switch back to home view to show the nudge clearly
                this.app.ui.switchView('home');
                this.app.ui.showShareReview();
            } else {
                alert("All contacts in the paste are already in your circle!");
            }
        } catch (err) {
            console.error("Merge failed", err);
            alert("Invalid Digital Seedling. Please ensure you've pasted the exact data correctly.");
        }
    }
}
