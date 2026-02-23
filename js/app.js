import { promptTemplates, getRandomPrompt } from './prompts.js';
import { GreatuncleUI } from './ui.js';
import { parseTags } from './tags.js';
import { exportToCalendar } from './calendar.js';
import { GreatuncleDB } from './db.js';
import { SyncManager } from './sync.js';

class GreatuncleApp {
    constructor() {
        this.contacts = [];
        this.suggestions = [];
        this.settings = {
            rotationLimit: 3,
            userName: "",
            userBirthday: "",
            userAnniversary: "",
            userPhone: "",
            userEmail: "",
            prompts: {
                sms: "Thinking of you! Hope your week is going well.",
                phone: "Just wanted to give you a quick ring and say hello!",
                email: "It's been a while since we caught up. Hope you're doing great.",
                visit: "I'd love to drop by or meet for coffee soon!"
            },
            gatheringRules: [
                { day: 'Sunday', tag: '#church' },
                { day: 'Saturday', tag: '#morningwalkers' }
            ],
            theme: 'system',
            foresightWindow: 7,
            lastExportTimestamp: 0
        };
        this.searchQuery = '';
        this.currentTagFilters = [];
        this.currentLevelFilters = [];
        this.currentGroupFilters = [];
        this.currentSort = 'alpha';
        this.currentCategory = 'lowStakes';
        this.dashboard = { anchors: [], outreach: [], foresight: [] };
        this.homeSuggestionsState = null;
        this.isViewingHome = true;
        this.pendingImports = []; // Store items currently being reviewed from a share link

        // Initialize UI helper
        this.ui = new GreatuncleUI(this);

        // Initialize Managers
        this.db = new GreatuncleDB();
        this.sync = new SyncManager(this);

        this.init();
    }

    async init() {
        console.log("Greatuncle initializing...");
        this.setupEventListeners();
        this.registerServiceWorker();

        try {
            await this.db.init();
            await this.loadState();
        } catch (e) {
            console.error("Failed to initialize database:", e);
        }

        this.handleInvitation(); // Check for incoming share link
        this.applyTheme();
        this.refreshSuggestions();
        this.ui.switchView('home');
        this.ui.render();

        // Hide share button if not supported
        if (!navigator.share) {
            const shareBtn = document.getElementById('btn-share-backup');
            if (shareBtn) shareBtn.style.display = 'none';
        }
    }

    applyTheme() {
        const theme = this.settings.theme || 'system';
        document.body.dataset.theme = theme;

        // Listen for system theme changes if in 'system' mode
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.removeEventListener('change', this._handleSystemThemeChange);
            this._handleSystemThemeChange = () => {
                if (this.settings.theme === 'system') {
                    document.body.dataset.theme = 'system';
                }
            };
            mediaQuery.addEventListener('change', this._handleSystemThemeChange);
        }
    }

    handleInvitation() {
        const urlParams = new URLSearchParams(window.location.search);

        // 1. Handle single user invite
        const inviteData = urlParams.get('invite');
        if (inviteData) {
            try {
                const data = JSON.parse(atob(inviteData));
                if (data.name) {
                    const exists = this.contacts.find(c => c.name === data.name || (data.phone && c.phone === data.phone));
                    if (!exists) {
                        this.addContact({
                            name: data.name,
                            phone: data.phone || '',
                            email: data.email || '',
                            tags: ['&level5']
                        });
                        alert(`Welcome to Greatuncle! ${data.name} has been added to your circle.`);
                    }
                    this.ui.showOnboarding();
                }
            } catch (err) {
                console.error("Failed to parse invitation data", err);
            }
        }

        // 2. Handle group import review
        const groupData = urlParams.get('importGroup');
        if (groupData) {
            try {
                const payload = JSON.parse(atob(groupData));
                const contacts = payload.contacts || [];
                const batchTag = payload.batchTag || '@received';

                let addedAny = false;
                contacts.forEach(c => {
                    // Robust duplicate check
                    const exists = this.contacts.find(existing => {
                        const nameMatch = existing.name.toLowerCase() === c.name.toLowerCase();
                        const phoneMatch = c.phone && this.normalizePhone(existing.phone) === this.normalizePhone(c.phone);
                        const emailMatch = c.email && existing.email && existing.email.toLowerCase() === c.email.toLowerCase();
                        return nameMatch || phoneMatch || emailMatch;
                    });

                    // Add to pending if they don't exist, OR if we want to flag them for merge
                    if (!exists) {
                        this.addContact({
                            name: c.name,
                            phone: c.phone || '',
                            email: c.email || '',
                            birthday: c.bday || null,
                            anniversary: c.anniversary || null,
                            tags: ['&share', batchTag]
                        });
                        addedAny = true;
                    } else if (exists.tags?.includes('&share')) {
                        // They are already in the share queue, skip
                    } else {
                        console.log("Found existing contact for", c.name, "ID:", exists.id);
                        this.addContact({
                            name: c.name,
                            phone: c.phone || '',
                            email: c.email || '',
                            birthday: c.bday || null,
                            anniversary: c.anniversary || null,
                            tags: ['&share', '&duplicate', batchTag],
                            matchedId: exists.id
                        });
                        addedAny = true;
                    }
                });

                if (addedAny) {
                    this.saveState();
                    this.ui.showShareReview();
                }
            } catch (err) {
                console.error("Failed to parse group import data", err);
            }
        }

        // Clean URL
        if (inviteData || groupData) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // navigator.serviceWorker.register('/sw.js');
            });
        }
    }

    // Persistence Layer
    async loadState() {
        // 1. Check for localStorage migration
        const migrationData = this.db.migrateFromLocalStorage();
        if (migrationData) {
            console.log("Migrating data from localStorage to IndexedDB...");
            this.contacts = migrationData.contacts || [];
            this.settings = { ...this.settings, ...(migrationData.settings || {}) };

            await this.db.saveContacts(this.contacts);
            await this.db.saveSettings(this.settings);
            this.db.markMigrated();
        } else {
            // Normal DB load
            const savedContacts = await this.db.loadContacts();
            this.contacts = savedContacts || [];

            const savedSettings = await this.db.loadSettings();
            if (savedSettings) {
                this.settings = { ...this.settings, ...savedSettings };
            }
        }

        // --- Data Migration Layer (Tag corrections) ---
        let migrated = false;
        const OLD_SPECIAL_TAGS = ['&preview7days', '&specialevents', '!special', '#_special'];
        const OLD_INNER = '#_inner';
        const OLD_LEGACY = '#_legacy';
        const OLD_DAILY = ['!daily', '#_daily'];

        this.contacts.forEach(c => {
            if (c.tags) {
                // 1. Migrate Special -> previewdays
                const hasOldSpecial = c.tags.some(t => OLD_SPECIAL_TAGS.includes(t));
                if (hasOldSpecial) {
                    c.tags = c.tags.filter(t => !OLD_SPECIAL_TAGS.includes(t));
                    if (!c.tags.includes('&previewdays')) c.tags.push('&previewdays');
                    migrated = true;
                }

                // 2. Remove Inner (User requested removal)
                if (c.tags.includes(OLD_INNER) || c.tags.includes('&inner') || c.tags.includes('#inner')) {
                    c.tags = c.tags.filter(t => t !== OLD_INNER && t !== '&inner' && t !== '#inner');
                    migrated = true;
                }

                // 3. Migrate Legacy -> &legacy
                if (c.tags.includes(OLD_LEGACY)) {
                    c.tags = c.tags.filter(t => t !== OLD_LEGACY);
                    if (!c.tags.includes('&legacy')) c.tags.push('&legacy');
                    migrated = true;
                }

                // 4. Migrate Daily -> !daily
                const hasOldDaily = c.tags.some(t => OLD_DAILY.includes(t));
                if (hasOldDaily) {
                    c.tags = c.tags.filter(t => !OLD_DAILY.includes(t));
                    if (!c.tags.includes('!daily')) c.tags.push('!daily');
                    migrated = true;
                }

                // 5. Migrate Broadcase Groups #_group_ -> @
                const oldGroupTags = c.tags.filter(t => t.startsWith('#_group_'));
                if (oldGroupTags.length > 0) {
                    oldGroupTags.forEach(oldTag => {
                        const newTag = '@' + oldTag.replace('#_group_', '');
                        c.tags = c.tags.filter(t => t !== oldTag);
                        if (!c.tags.includes(newTag)) c.tags.push(newTag);
                    });
                    migrated = true;
                }

                // 6. Fix prefix accumulation (e.g. #@daly -> @daly)
                const buggedTags = c.tags.filter(t => t.startsWith('#@') || t.startsWith('##') || t.startsWith('#&'));
                if (buggedTags.length > 0) {
                    c.tags = [...new Set(c.tags.map(t => (t.startsWith('#@') || t.startsWith('#&') || t.startsWith('##')) ? t.substring(1) : t))];
                    migrated = true;
                }
            }
        });

        if (migrated) {
            console.log("Migration complete: Unified system tags to new prefixes.");
            await this.saveState();
        }
        // --- End Migration ---
    }

    async saveState(isClean = false) {
        if (!isClean) {
            this.settings.isDirty = true;
            if (!this.settings.dirtySince) {
                this.settings.dirtySince = Date.now();
            }
        } else {
            this.settings.isDirty = false;
            this.settings.dirtySince = null;
        }

        try {
            await this.db.saveContacts(this.contacts);
            await this.db.saveSettings(this.settings);
        } catch (e) {
            console.error("Failed to save state to IndexedDB:", e);
        }
    }

    // Engine: Dashboard Logic
    refreshSuggestions() {
        if (this.homeSuggestionsState && this.isViewingHome) {
            const stateDate = new Date(this.homeSuggestionsState);
            const nowDate = new Date();

            // If the day hasn't changed, just drop folks who were contacted today or snoozed
            if (stateDate.getDate() === nowDate.getDate() && stateDate.getMonth() === nowDate.getMonth()) {
                const todayMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();

                const stillNeedsOutreach = (p) => {
                    if (p.is_user) return true; // Keep user milestones
                    const actual = this.contacts.find(c => c.id === p.id);
                    if (!actual) return false;
                    if (actual.last_contacted >= todayMidnight) return false;
                    if (actual.snooze_until && Date.now() < actual.snooze_until) return false;
                    return true;
                };

                this.dashboard.outreach = this.dashboard.outreach.filter(stillNeedsOutreach);
                this.dashboard.anchors = this.dashboard.anchors.filter(stillNeedsOutreach);

                return;
            }
        }

        this.homeSuggestionsState = Date.now();

        // Only operate on fully imported contacts
        const activeContacts = this.contacts.filter(c => !c.tags?.includes('&share'));

        const now = new Date();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const todayStr = `${mm}-${dd}`; // MM-DD

        this.dashboard = {
            anchors: [], // Today's milestones
            outreach: [], // Standard daily goal
            foresight: [] // Special events within 7 days
        };

        // Helper to check if a date string matches today (MM-DD)
        const isToday = (dateStr) => {
            if (!dateStr || dateStr.length < 5) return false;
            const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
            const monthIdx = parts.length === 3 ? 1 : 0;
            const dayIdx = parts.length === 3 ? 2 : 1;
            return parseInt(parts[monthIdx]) === (now.getMonth() + 1) && parseInt(parts[dayIdx]) === now.getDate();
        };

        // 1. Anchors: Milestones today
        activeContacts.forEach(contact => {
            const milestones = this.getMilestonesToday(contact);
            if (milestones.length > 0) {
                this.dashboard.anchors.push({ ...contact, milestones });
            }
        });

        // Add user milestones if applicable
        if (this.settings.userBirthday && isToday(this.settings.userBirthday)) {
            this.dashboard.anchors.unshift({
                id: 'user-id',
                name: this.settings.userName || "You",
                is_user: true,
                tags: ['&owner'],
                milestones: ['Your Birthday 🎂']
            });
        }

        if (this.settings.userAnniversary && isToday(this.settings.userAnniversary)) {
            // Look for contacts who share this anniversary
            const partners = this.contacts.filter(c => c.anniversary && isToday(c.anniversary));
            const milestoneText = partners.length > 0
                ? `Anniversary with ${partners.map(p => p.name).join(' & ')} 💍`
                : 'Your Anniversary 💍';

            this.dashboard.anchors.unshift({
                id: 'user-id-anniv',
                name: this.settings.userName || "You",
                is_user: true,
                tags: ['&owner'],
                milestones: [milestoneText]
            });
        }

        // 2. Gathering Rule: Check for triggered hashtags (e.g., #church on Sunday)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[now.getDay()];

        // Find if there's an active rule for today
        const activeRule = this.settings.gatheringRules.find(r => r.day === dayOfWeek);

        if (activeRule && activeRule.tag) {
            const gatheringList = activeContacts.filter(c => c.tags && c.tags.includes(activeRule.tag));
            if (gatheringList.length > 0) {
                this.dashboard.gathering = {
                    tag: activeRule.tag,
                    people: gatheringList.slice(0, 5)
                };
            }
        }

        // 3. Foresight: &previewdays and User within Window
        const foresightWindow = this.settings.foresightWindow || 7;

        // Check User Profile for upcoming milestones
        const userUpcoming = this.getUpcomingMilestones({
            birthday: this.settings.userBirthday,
            anniversary: this.settings.userAnniversary
        }, foresightWindow);

        if (userUpcoming.length > 0) {
            this.dashboard.foresight.push({
                id: 'user-foresight',
                name: this.settings.userName || "You",
                is_user: true,
                tags: ['&owner'],
                upcoming: userUpcoming
            });
        }

        activeContacts.forEach(contact => {
            const hasSpecial = contact.tags && contact.tags.includes('&previewdays');
            if (hasSpecial) {
                const upcoming = this.getUpcomingMilestones(contact, foresightWindow);
                if (upcoming.length > 0 && !this.dashboard.anchors.find(a => a.id === contact.id)) {
                    this.dashboard.foresight.push({ ...contact, upcoming });
                }
            }
        });

        // 4. Daily Outreach: n-1 if gathering is active
        const standardGoal = this.dashboard.gathering ? Math.max(1, this.settings.rotationLimit - 1) : this.settings.rotationLimit;

        const standardContacts = activeContacts.filter(contact => {
            if (this.dashboard.anchors.find(a => a.id === contact.id)) return false;
            if (this.dashboard.gathering && this.dashboard.gathering.people.find(p => p.id === contact.id)) return false;

            const isDaily = contact.tags && (contact.tags.includes('!daily') || contact.tags.includes('&daily'));
            if (isDaily) return false;
            if (contact.snooze_until && Date.now() < contact.snooze_until) return false;
            return true;
        });

        // Layer-Relative Priority Scoring
        const INTERVALS = {
            '&level5': 14,    // 2 weeks
            '&level15': 30,   // Monthly
            '&level50': 90,   // Quarterly
            '&level150': 365  // Yearly
        };

        this.dashboard.outreach = standardContacts
            .map(contact => {
                // 1. Determine Target Interval
                let interval = 90; // Default to level 50
                if (contact.tags) {
                    if (contact.tags.includes('&level5')) interval = INTERVALS['&level5'];
                    else if (contact.tags.includes('&level15')) interval = INTERVALS['&level15'];
                    else if (contact.tags.includes('&level50')) interval = INTERVALS['&level50'];
                    else if (contact.tags.includes('&level150')) interval = INTERVALS['&level150'];
                }

                // 2. Calculate Days Since
                let daysSince;
                if (contact.last_contacted === 0) {
                    // "Warm Start": Treat new people as slightly overdue (110% of their interval)
                    // This allows them to show up without blocking those who are severely overdue.
                    daysSince = interval * 1.1;
                } else {
                    daysSince = (Date.now() - contact.last_contacted) / (1000 * 60 * 60 * 24);
                }

                // 3. Normalized Score (Overdue Percentage)
                const score = daysSince / interval;

                return { ...contact, score, daysSince, interval };
            })
            .filter(c => c.daysSince >= c.interval)
            .sort((a, b) => b.score - a.score)
            .slice(0, standardGoal);

    }

    getSuggestionContext() {
        return this.dashboard;
    }

    getMilestonesToday(contact) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        const check = (dateStr) => {
            if (!dateStr || dateStr.length < 5) return false;
            const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
            const monthIdx = parts.length === 3 ? 1 : 0;
            const dayIdx = parts.length === 3 ? 2 : 1;

            return parseInt(parts[monthIdx]) === currentMonth && parseInt(parts[dayIdx]) === currentDay;
        };

        const milestones = [];
        if (contact.birthday && check(contact.birthday)) milestones.push('Birthday');
        if (contact.anniversary && check(contact.anniversary)) milestones.push('Anniversary');
        if (contact.date_of_passing && check(contact.date_of_passing)) milestones.push('Departure Anniversary');
        return milestones;
    }

    getUpcomingMilestones(contact, days) {
        const upcoming = [];
        const now = new Date();

        const check = (dateStr, label) => {
            if (!dateStr || dateStr.length < 5) return;

            const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
            const monthIdx = parts.length === 3 ? 1 : 0;
            const dayIdx = parts.length === 3 ? 2 : 1;

            const target = new Date(now.getFullYear(), parseInt(parts[monthIdx]) - 1, parseInt(parts[dayIdx]));
            const diff = (target - now) / (1000 * 60 * 60 * 24);
            if (diff > 0 && diff <= days) upcoming.push({ label, daysLeft: Math.ceil(diff) });
        };

        check(contact.birthday, 'Birthday');
        check(contact.anniversary, 'Anniversary');
        return upcoming;
    }

    // Actions
    normalizePhone(phone) {
        if (!phone) return null;
        return phone.replace(/\D/g, '');
    }

    isValidPostalCode(code) {
        if (!code) return false;
        const usZip = /^\d{5}(-\d{4})?$/;
        const caZip = /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ] ?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i;
        return usZip.test(code) || caZip.test(code);
    }

    getAddressForZip(zip) {
        if (!zip || !this.isValidPostalCode(zip)) return null;
        const contact = this.contacts.find(c => c.zip_code && c.zip_code.toUpperCase() === zip.toUpperCase() && c.address);
        return contact ? contact.address : null;
    }

    async handleAddressBulkUpdate(zip_code, new_address, current_contact_id = null) {
        if (!zip_code || !new_address) return;
        const matches = this.contacts.filter(c =>
            c.id !== current_contact_id &&
            c.zip_code && c.zip_code.toUpperCase() === zip_code.toUpperCase() &&
            c.address !== new_address
        );

        if (matches.length > 0) {
            if (confirm(`Do you want to update the address for all other people with the zip/postal code ${zip_code}?`)) {
                matches.forEach(c => c.address = new_address);
                this.saveState();
                this.refreshSuggestions();
                this.ui.render();
            }
        }
    }

    markCompleted(id, comment = '') {
        const index = this.contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            const timestamp = Date.now();
            this.contacts[index].last_contacted = timestamp;

            if (!this.contacts[index].logs) this.contacts[index].logs = [];
            this.contacts[index].logs.push({
                timestamp,
                comment: comment.trim()
            });

            this.saveState();
            this.refreshSuggestions();
            this.ui.hideContactDetail();
            this.ui.render();
        }
    }

    snooze(id) {
        const index = this.contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            this.contacts[index].snooze_until = Date.now() + (24 * 60 * 60 * 1000);
            this.saveState();
            this.refreshSuggestions();
            this.ui.hideContactDetail();
            this.ui.render();
        }
    }

    addContact(contact) {
        const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
        this.contacts.push({
            id: id,
            last_contacted: 0,
            snooze_until: null,
            logs: [],
            is_user: false,
            ...contact
        });
        this.saveState();
        this.refreshSuggestions();
        this.ui.render();
    }

    updateContact(id, updatedData) {
        const index = this.contacts.findIndex(c => c.id === id);
        if (index !== -1) {
            this.contacts[index] = { ...this.contacts[index], ...updatedData };
            this.saveState();
            this.refreshSuggestions();
            this.ui.render();
        }
    }

    deleteContact(id) {
        this.contacts = this.contacts.filter(c => c.id !== id);
        this.saveState();
        this.refreshSuggestions();
        this.ui.render();
    }

    async handleQuickAction(id, method, customPrompt = null) {
        const contact = this.contacts.find(c => c.id === id);
        if (!contact) return;

        // If data is missing, try to import it first
        const needsPhone = (method === 'sms' || method === 'phone') && !contact.phone;
        const needsEmail = (method === 'email') && !contact.email;

        if (needsPhone || needsEmail) {
            // Store custom prompt if provided so we can use it after saving missing info
            this._pendingCustomPrompt = customPrompt;
            this.ui.showMissingInfo(id, method, contact);
            return;
        }

        this.executeMethod(method, contact, customPrompt);
    }

    async importContactToExisting(id) {
        const props = ['name', 'tel', 'email'];
        try {
            const contacts = await navigator.contacts.select(props, { multiple: false });
            if (contacts.length > 0) {
                const c = contacts[0];
                const update = {};
                if (c.tel?.[0]) update.phone = this._cleanPhone(c.tel[0]);
                if (c.email?.[0]) update.email = c.email[0];
                this.updateContact(id, update);
            }
        } catch (err) {
            console.error('Picker failed', err);
        }
    }

    executeMethod(method, contact, customPrompt = null) {
        const prompt = customPrompt || this.settings.prompts[method] || "Thinking of you!";
        let url;
        if (method === 'sms') url = `sms:${contact.phone}?body=${encodeURIComponent(prompt)}`;
        if (method === 'phone') url = `tel:${contact.phone}`;
        if (method === 'email') url = `mailto:${contact.email}?subject=Thinking of you&body=${encodeURIComponent(prompt)}`;

        if (url) window.open(url, '_blank');
    }

    async shareApp() {
        const selectedGroup = document.getElementById('share-group-select')?.value || 'none';

        const userData = {
            name: this.settings.userName,
            phone: this.settings.userPhone,
            email: this.settings.userEmail
        };

        const encodedUser = btoa(JSON.stringify(userData));
        const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

        let shareBody = `I'm using Greatuncle to sustain my community of friends and family. \n\nClick here to join me and add me to your community:\n${baseUrl}?invite=${encodedUser}\n\n`;

        if (selectedGroup !== 'none') {
            const groupMembers = this.contacts.filter(c => c.tags && c.tags.includes(selectedGroup));
            if (groupMembers.length > 0) {
                // Generate a timestamped batch tag (e.g., @share20240214)
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const batchTag = `@share${yyyy}${mm}${dd}`;

                const groupExport = {
                    batchTag: batchTag,
                    contacts: groupMembers.map(c => ({
                        name: c.name,
                        phone: c.phone,
                        email: c.email,
                        bday: c.birthday,
                        anniversary: c.anniversary
                    }))
                };

                const encodedGroup = btoa(JSON.stringify(groupExport));
                shareBody += `I've also shared the contact info for our "${selectedGroup.substring(1)}" group. Click here to import them (they will be tagged as ${batchTag}):\n${baseUrl}?importGroup=${encodedGroup}\n\n`;
            }
        }

        const subject = encodeURIComponent("Join me on Greatuncle");
        const mailto = `mailto:?subject=${subject}&body=${encodeURIComponent(shareBody)}`;

        window.location.href = mailto;
    }



    _normalizeDateWithUnknown(dateVal, isUnknown) {
        if (!dateVal) return null;
        if (isUnknown) {
            const parts = dateVal.split('-');
            if (parts.length === 3) {
                return `1904-${parts[1]}-${parts[2]}`;
            }
        }
        return dateVal;
    }



    handleLevelFilterChange() {
        const checked = document.querySelectorAll('input[name="circle-level"]:checked');
        this.currentLevelFilters = Array.from(checked).map(cb => cb.value);

        this._syncFilterUI();
        this.ui.renderCircleListWithAnimation();
    }

    handleGroupFilterChange() {
        const checked = document.querySelectorAll('input[name="circle-group"]:checked');
        this.currentGroupFilters = Array.from(checked).map(cb => cb.value);

        this._syncFilterUI();
        this.ui.renderCircleListWithAnimation();
    }

    _syncFilterUI() {
        const isActive = this.currentTagFilters.length > 0 || this.currentLevelFilters.length > 0 || this.currentGroupFilters.length > 0;

        document.querySelectorAll('.circle-tab-btn[data-tag="all"]').forEach(b => {
            b.classList.toggle('active', !isActive);
        });
    }

    getConnectionLayers() {
        const layers = [
            { id: 'level5', tag: '&level5', name: 'Inner (5)', limit: 5, add: 5 },
            { id: 'level15', tag: '&level15', name: 'Sympathy (10)', limit: 15, add: 10 },
            { id: 'level50', tag: '&level50', name: 'Affinity (35)', limit: 50, add: 35 },
            { id: 'level150', tag: '&level150', name: 'Active (100)', limit: 150, add: 100 }
        ];

        return layers.map(layer => {
            const count = this.contacts.filter(c => !c.tags?.includes('&share') && c.tags && c.tags.includes(layer.tag)).length;
            return { ...layer, count };
        });
    }

    _cleanPhone(str) {
        if (!str) return '';
        // Keep only digits, or + for international
        return str.replace(/[^\d+]/g, '');
    }

    async importContact() {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: false };

        try {
            const contacts = await navigator.contacts.select(props, opts);
            if (contacts.length > 0) {
                const contact = contacts[0];
                document.getElementById('contact-name').value = contact.name?.[0] || '';
                document.getElementById('contact-phone').value = contact.tel?.[0] || '';
                document.getElementById('contact-email').value = contact.email?.[0] || '';
            }
        } catch (err) {
            console.error('Contact picker failed:', err);
        }
    }

    setupEventListeners() {
        this.setupActionListeners();
        this.setupFilterListeners();
        this.setupFormListeners();
    }

    setupActionListeners() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, [data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id;

            // alert(`Action: ${action}, ID: ${id}, Target: ${target.id}`); // Debugging

            if (action === 'complete') {
                e.stopPropagation();
                this.ui.showLogOverlay(id);
            }
            if (action === 'snooze') this.snooze(id);
            if (action === 'pick-prompt') this.ui.showMethodPicker(id);

            // Quick Actions
            if (action === 'quick-sms') this.handleQuickAction(id, 'sms');
            if (action === 'quick-call') this.handleQuickAction(id, 'phone');
            if (action === 'quick-email') this.handleQuickAction(id, 'email');

            if (action === 'add-initial') this.ui.showOnboarding();
            if (action === 'view-detail') this.ui.showContactDetail(id);
            if (action === 'edit-contact') this.ui.showEditContact(this.ui.currentDetailId);
            if (action === 'share-app') this.shareApp();

            if (action === 'delete-contact') {
                const deleteId = document.getElementById('edit-id').value;
                if (confirm('Are you sure you want to remove this person from your circle? This will delete all history.')) {
                    this.deleteContact(deleteId);
                    this.ui.hideEditContact();
                    this.ui.hideContactDetail();
                }
            }
            if (action === 'send-postcard-ui') this.ui.showPostcard(id);
            if (action === 'reflect') this.ui.showReflection(id);
            if (action === 'export-calendar') {
                const tag = target.closest('.card')?.dataset.meta;
                this.ui.showCalendarPlanner(id || this.ui.currentDetailId, tag);
            }
            if (action === 'plan-gathering') {
                const db = this.getSuggestionContext();
                if (db.gathering) {
                    this.ui.showCalendarPlanner('gathering-group', db.gathering.tag);
                }
            }


            if (action === 'export-json') this.sync.exportJson();
            if (action === 'share-backup') this.sync.shareBackup();
            if (action === 'import-json') this.sync.importJson();
            if (action === 'merge-json') this.sync.mergeJson();
            if (action === 'print-ledger') alert("PDF & QR Generation coming soon! This will create a printable Paper Ledger for your 150.");
            if (action === 'persist-storage') {
                this.db.requestPersistentStorage().then(granted => {
                    if (granted) {
                        this.ui.updateStorageUI();
                        alert("Storage persistence granted! Your contacts are now protected from auto-deletion.");
                    } else {
                        alert("Storage persistence requested but denied or unavailable.");
                    }
                });
            }

            if (action === 'bust-cache') {
                if (confirm("This will clear the app's cache and force a fresh download. Your contact data will NOT be affected. Continue?")) {
                    if ('serviceWorker' in navigator) {
                        caches.keys().then(names => {
                            for (let name of names) caches.delete(name);
                        });
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                            for (let registration of registrations) registration.unregister();
                        });
                    }
                    setTimeout(() => {
                        window.location.reload(true);
                    }, 500);
                }
            }

            if (target.id === 'bulk-import-shared') {
                this.ui.bulkImportSelected();
            }

            if (target.id === 'btn-import-contact') this.importContact();

            if (action === 'close-overlay') {
                const overlay = target.closest('.overlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                    // Special cleanup for prompt picker
                    if (overlay.id === 'prompt-picker-overlay') this.ui.hidePromptPicker();
                }
            }

            // Prep Actions (Milestone Foresight)
            if (action?.startsWith('prep-')) {
                const label = action.split('-')[1];
                if (confirm(`Mark ${label} preparation as done for this milestone?`)) {
                    this.markCompleted(id, `Prepared ${label} for upcoming milestone.`);
                }
            }

            // View Navigation
            if (target.id === 'nav-home') this.ui.switchView('home');
            if (target.id === 'nav-contacts') this.ui.switchView('circle');
            if (target.id === 'nav-journal') this.ui.switchView('journal');
            if (target.id === 'nav-settings') this.ui.switchView('settings');

            if (target.id === 'save-settings' || target.id === 'save-settings-profile' || action === 'save-settings-btn') {
                console.log("Save button clicked:", action);
                this.saveSettingsFromUI();
            }

            if (target.id === 'add-gathering-rule') {
                this.settings.gatheringRules.push({ day: 'Sunday', tag: '' });
                this.ui.renderGatheringRules();
            }

            // Circle View Filters (Unified Pill Buttons)
            if (target.classList.contains('circle-tab-btn')) {
                if (target.dataset.tag) {
                    const tag = target.dataset.tag;
                    if (tag === 'all') {
                        this.currentTagFilters = [];
                    } else {
                        // Toggle tag in array
                        const index = this.currentTagFilters.indexOf(tag);
                        if (index > -1) {
                            this.currentTagFilters.splice(index, 1);
                        } else {
                            this.currentTagFilters.push(tag);
                        }
                    }
                    this.ui.renderCircleListWithAnimation();
                } else if (target.dataset.sort) {
                    this.currentSort = target.dataset.sort;
                    this.ui.renderCircleListWithAnimation();
                } else if (target.dataset.level) {
                    const level = target.dataset.level;
                    const index = this.currentLevelFilters.indexOf(level);
                    if (index > -1) {
                        this.currentLevelFilters.splice(index, 1);
                    } else {
                        this.currentLevelFilters.push(level);
                    }
                    this.ui.renderCircleListWithAnimation();
                } else if (target.dataset.group) {
                    const group = target.dataset.group;
                    if (group === 'all') {
                        this.currentGroupFilters = [];
                    } else {
                        const index = this.currentGroupFilters.indexOf(group);
                        if (index > -1) {
                            this.currentGroupFilters.splice(index, 1);
                        } else {
                            this.currentGroupFilters.push(group);
                        }
                    }
                    this.ui.renderCircleListWithAnimation();
                }
            }

            // Tab Switching (Onboarding, About/Settings, etc)
            if (target.classList.contains('tab-btn')) {
                const targetTab = target.dataset.tab;
                const container = target.closest('.overlay') || target.closest('.view-section');
                if (container) {
                    container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === target));
                    container.querySelectorAll('.tab-content').forEach(content => {
                        content.classList.toggle('hidden', content.dataset.tab !== targetTab);
                    });
                }
            }
        });

    }

    setupFilterListeners() {
        // Dunbar Level/Group Checkbox Listener (Change event)
        document.addEventListener('change', (e) => {
            if (e.target.name === 'circle-level') {
                this.handleLevelFilterChange();
            }
            if (e.target.name === 'circle-group') {
                this.handleGroupFilterChange();
            }

            // Live toggle for backup format
            if (e.target.id === 'toggle-readable-json') {
                const box = document.getElementById('digital-seed-box');
                if (box && box.value.trim().length > 0) {
                    this.sync.exportJson(true);
                }
            }
        });

        const searchInput = document.getElementById('circle-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.ui.renderCircleList();
            });
        }

    }

    setupFormListeners() {
        const bulkForm = document.getElementById('bulk-add-form');
        if (bulkForm) {
            bulkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const namesText = document.getElementById('bulk-names').value;
                const tagStr = document.getElementById('bulk-tags').value;

                const names = namesText.split('\n')
                    .map(n => n.trim())
                    .filter(n => n.length > 0);

                const tags = parseTags(tagStr);
                const selectedLevel = document.querySelector('input[name="bulk-level"]:checked')?.value;
                if (selectedLevel && !tags.includes(selectedLevel)) {
                    tags.push(selectedLevel);
                }

                names.forEach(name => {
                    this.contacts.push({
                        id: crypto.randomUUID(),
                        last_contacted: 0,
                        snooze_until: null,
                        logs: [],
                        is_user: false,
                        name,
                        tags
                    });
                });

                this.saveState();
                this.refreshSuggestions();
                this.ui.render();
                bulkForm.reset();
                this.ui.hideOnboarding();
                alert(`Imported ${names.length} people.`);
            });
        }

        const attachZipAutofill = (zipInputId, addressInputId) => {
            const zipInput = document.getElementById(zipInputId);
            const addressInput = document.getElementById(addressInputId);
            if (zipInput && addressInput) {
                zipInput.addEventListener('blur', () => {
                    const zip = zipInput.value.trim();
                    if (this.isValidPostalCode(zip)) {
                        const existingAddress = this.getAddressForZip(zip);
                        if (existingAddress && !addressInput.value.trim()) {
                            addressInput.value = existingAddress;
                        }
                    } else if (zip) {
                        alert("Please enter a valid US zip code or Canadian postal code.");
                    }
                });
            }
        };

        attachZipAutofill('contact-zip', 'contact-address');
        attachZipAutofill('edit-zip', 'edit-address');

        const form = document.getElementById('add-contact-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('contact-name').value;
                const phone = this._cleanPhone(document.getElementById('contact-phone').value);
                const email = document.getElementById('contact-email').value;
                const tagsStr = document.getElementById('contact-tags').value;
                const zip_code = document.getElementById('contact-zip').value;
                const address = document.getElementById('contact-address').value;
                const bday = document.getElementById('contact-birthday').value;
                const bdayUnknown = document.getElementById('contact-birthday-unknown').checked;
                const anniversary = document.getElementById('contact-anniversary').value;
                const anniversaryUnknown = document.getElementById('contact-anniversary-unknown').checked;
                const isLegacy = document.getElementById('contact-legacy').value === 'true';

                let tags = parseTags(tagsStr);
                const selectedLevel = document.querySelector('input[name="contact-level"]:checked')?.value;
                if (selectedLevel && !tags.includes(selectedLevel)) {
                    tags.push(selectedLevel);
                }
                if (isLegacy && !tags.includes('&legacy')) tags.push('&legacy');

                this.addContact({
                    name,
                    phone,
                    email,
                    zip_code,
                    address,
                    tags,
                    birthday: this._normalizeDateWithUnknown(bday, bdayUnknown),
                    anniversary: this._normalizeDateWithUnknown(anniversary, anniversaryUnknown),
                    date_of_passing: isLegacy ? (bday || null) : null
                });

                this.handleAddressBulkUpdate(zip_code, address);

                form.reset();
                this.ui.hideOnboarding();
            });
        }

        const closeBtn = document.getElementById('close-onboarding');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.ui.hideOnboarding());
        }

        const closePromptBtn = document.getElementById('close-prompt-picker');
        if (closePromptBtn) {
            closePromptBtn.addEventListener('click', () => this.ui.hidePromptPicker());
        }

        const closeDetailBtn = document.getElementById('close-detail');
        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', () => this.ui.hideContactDetail());
        }

        const logForm = document.getElementById('log-connection-form');
        if (logForm) {
            logForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const comment = document.getElementById('log-comment').value;
                this.markCompleted(this.currentLogId, comment);
                this.ui.hideLogOverlay();
            });
        }

        const skipLogBtn = document.getElementById('skip-log');
        if (skipLogBtn) {
            skipLogBtn.addEventListener('click', () => {
                this.markCompleted(this.currentLogId);
                this.ui.hideLogOverlay();
            });
        }

        const missingInfoForm = document.getElementById('missing-info-form');
        if (missingInfoForm) {
            missingInfoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('missing-info-id').value;
                const method = document.getElementById('missing-info-method').value;
                const phone = this._cleanPhone(document.getElementById('missing-phone').value);
                const email = document.getElementById('missing-email').value;

                const update = {};
                if (phone) update.phone = phone;
                if (email) update.email = email;

                if (Object.keys(update).length > 0) {
                    this.updateContact(id, update);
                    const updatedContact = this.contacts.find(c => c.id === id);
                    this.ui.hideMissingInfo();
                    this.executeMethod(method, updatedContact, this._pendingCustomPrompt);
                    this._pendingCustomPrompt = null;
                } else {
                    alert("Please provide the required information.");
                }
            });
        }

        const calForm = document.getElementById('calendar-form');
        if (calForm) {
            calForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('calendar-contact-id').value;
                const dt = document.getElementById('calendar-datetime').value;
                const act = document.getElementById('calendar-activity').value;

                exportToCalendar(this, id, dt, act);
                this.ui.hideCalendarPlanner();
            });
        }

        // Edit Flow Listeners
        const editForm = document.getElementById('edit-contact-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('edit-id').value;
                const name = document.getElementById('edit-name').value;
                const email = document.getElementById('edit-email').value;
                const phone = this._cleanPhone(document.getElementById('edit-phone').value);
                const tagsStr = document.getElementById('edit-tags').value;
                const zip_code = document.getElementById('edit-zip').value;
                const address = document.getElementById('edit-address').value;
                const birthday = document.getElementById('edit-birthday').value;
                const bdayUnknown = document.getElementById('edit-birthday-unknown').checked;
                const anniversary = document.getElementById('edit-anniversary').value;
                const anniversaryUnknown = document.getElementById('edit-anniversary-unknown').checked;
                const isLegacy = document.getElementById('edit-legacy').value === 'true';
                const selectedLevel = document.querySelector('input[name="edit-contact-level"]:checked')?.value;

                let tags = parseTags(tagsStr);

                // Preserve hidden system tags that aren't &legacy or #_legacy (which are handled by toggle)
                // Also remove any existing &level tags because they are updated via radio buttons
                const existing = this.contacts.find(c => c.id === id);
                if (existing && existing.tags) {
                    const systemTags = existing.tags.filter(t =>
                        (t.startsWith('&') || t.startsWith('!') || t.startsWith('#_')) &&
                        t !== '&legacy' && t !== '#_legacy' && !t.startsWith('&level')
                    );
                    tags = [...new Set([...tags, ...systemTags])];
                }

                // Add selected level tag
                if (selectedLevel && !tags.includes(selectedLevel)) {
                    tags.push(selectedLevel);
                }

                // Keep legacy tag in sync with toggle
                if (isLegacy && !tags.includes('&legacy')) tags.push('&legacy');
                if (!isLegacy) tags = tags.filter(t => t !== '&legacy' && t !== '#_legacy');

                this.updateContact(id, {
                    name,
                    email,
                    phone,
                    zip_code,
                    address,
                    tags,
                    birthday: this._normalizeDateWithUnknown(birthday, bdayUnknown),
                    anniversary: this._normalizeDateWithUnknown(anniversary, anniversaryUnknown)
                });

                this.handleAddressBulkUpdate(zip_code, address, id);

                this.ui.hideEditContact();
                this.ui.hideContactDetail();
            });
        }

        const closeEditBtn = document.getElementById('close-edit');
        if (closeEditBtn) {
            closeEditBtn.addEventListener('click', () => this.ui.hideEditContact());
        }
    }

    saveSettingsFromUI() {
        try {
            const rotEl = document.getElementById('rotation-limit');
            const nameEl = document.getElementById('user-name');
            const bday = document.getElementById('user-birthday').value;
            const bdayUnknown = document.getElementById('user-birthday-unknown').checked;
            const anniv = document.getElementById('user-anniversary').value;
            const annivUnknown = document.getElementById('user-anniversary-unknown').checked;

            const phoneEl = document.getElementById('user-phone');
            const emailEl = document.getElementById('user-email');

            // 1. Core Profile
            if (nameEl) this.settings.userName = nameEl.value.trim();
            this.settings.userBirthday = this._normalizeDateWithUnknown(bday, bdayUnknown);
            this.settings.userAnniversary = this._normalizeDateWithUnknown(anniv, annivUnknown);
            if (phoneEl) this.settings.userPhone = this._cleanPhone(phoneEl.value);
            if (emailEl) this.settings.userEmail = emailEl.value.trim();

            // 2. Preferences
            const themeEl = document.getElementById('setting-theme');
            const foresightEl = document.getElementById('setting-foresight-window');
            if (themeEl) {
                this.settings.theme = themeEl.value;
                this.applyTheme();
            }

            if (foresightEl) this.settings.foresightWindow = parseInt(foresightEl.value) || 7;

            if (rotEl) this.settings.rotationLimit = parseInt(rotEl.value) || 3;

            // 3. Prompts
            this.settings.prompts = {
                sms: document.getElementById('prompt-sms')?.value || "",
                phone: document.getElementById('prompt-phone')?.value || "",
                email: document.getElementById('prompt-email')?.value || "",
                visit: document.getElementById('prompt-visit')?.value || ""
            };

            // 4. Gathering Rules
            const rows = document.querySelectorAll('.gathering-rule-item');
            this.settings.gatheringRules = Array.from(rows).map(row => {
                const dayEl = row.querySelector('.rule-day');
                const tagEl = row.querySelector('.rule-tag');
                return {
                    day: dayEl ? dayEl.value : 'Sunday',
                    tag: tagEl ? tagEl.value.trim().toLowerCase() : ''
                };
            }).filter(r => r.tag && r.tag.trim().length > 0);

            console.log("Saving Settings:", this.settings);

            this.saveState();
            this.refreshSuggestions();
            this.ui.render();
            alert('Settings saved successfully.');
        } catch (err) {
            console.error("Save failed:", err);
            alert("Sorry, there was an error saving your settings.");
        }
    }

    generatePrompt(category, method, contact) {
        let prompt = getRandomPrompt(category, method);
        if (!prompt) return;

        const formatted = prompt.replace('[Relative/Event]', 'family')
            .replace('[Photo/Link/Memory]', 'this photo')
            .replace('[Shared Memory]', 'our last talk');

        const displayArea = document.getElementById('generated-prompt-display');
        displayArea.innerHTML = `
            <div class="prompt-result">
                <p class="prompt-text">"${formatted}"</p>
                <div class="prompt-actions">
                    <button class="btn btn-secondary" id="copy-prompt">Copy</button>
                    ${method !== 'visit' && method !== 'other' ? `<button class="btn btn-primary" id="open-native">Open App</button>` : ''}
                    <button class="btn btn-secondary" id="trigger-postcard">Postcard</button>
                </div>
            </div>
        `;

        document.getElementById('copy-prompt').onclick = () => {
            navigator.clipboard.writeText(formatted);
            alert('Prompt copied!');
        };

        document.getElementById('trigger-postcard').onclick = () => {
            this.ui.hidePromptPicker();
            this.ui.showPostcard(contact.id);
        };

        const openBtn = document.getElementById('open-native');
        if (openBtn) {
            openBtn.onclick = () => {
                this.handleQuickAction(contact.id, method, formatted);
            };
        }
    }
}

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
    window.app = new GreatuncleApp();
});
