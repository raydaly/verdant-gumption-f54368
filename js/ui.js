/**
 * Greatuncle UI Rendering Logic
 */
export class GreatuncleUI {
    constructor(app) {
        this.app = app;
        this.els = {
            suggestions: document.getElementById('daily-suggestions'),
            circleList: document.getElementById('circle-list-container'),
            journalList: document.getElementById('journal-container'),
            detailOverlay: document.getElementById('detail-overlay'),
            onboardingOverlay: document.getElementById('onboarding-overlay'),
            logOverlay: document.getElementById('log-overlay'),
            promptOverlay: document.getElementById('prompt-picker-overlay'),
            missingInfoOverlay: document.getElementById('missing-info-overlay'),
            shareReviewOverlay: document.getElementById('share-review-overlay'),
            calendarOverlay: document.getElementById('calendar-overlay'),
            fab: document.getElementById('fab-add'),
            views: {
                home: document.getElementById('daily-suggestions'),
                circle: document.getElementById('full-circle'),
                journal: document.getElementById('journal-view'),
                settings: document.getElementById('settings-view'),
                backup: document.getElementById('backup-view')
            },
            navs: {
                home: document.getElementById('nav-home'),
                circle: document.getElementById('nav-contacts'),
                journal: document.getElementById('nav-journal'),
                settings: document.getElementById('nav-header-settings'),
                backup: document.getElementById('nav-backup')
            },
            header: document.querySelector('.app-header')
        };
        this.currentDetailId = null;
        this.setupEasterEgg();
    }

    formatPhone(str) {
        if (!str) return '';
        const cleaned = str.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return str;
    }

    formatDateLabel(dateStr) {
        if (!dateStr || dateStr.length < 5) return "";
        const parts = dateStr.split('-');
        const monthIdx = parseInt(parts[1]) - 1;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[monthIdx];
        const day = parseInt(parts[2]);

        if (parts[0] === "1904") {
            return `${month} ${day}`;
        }

        const year = parseInt(parts[0]);
        const today = new Date();
        let age = today.getFullYear() - year;
        const m = today.getMonth() - monthIdx;
        if (m < 0 || (m === 0 && today.getDate() < day)) {
            age--;
        }

        return `${month} ${day}, ${parts[0]} (${age})`;
    }

    showToast(message, duration = 3000) {
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--color-action-green);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 600;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, duration);
    }

    switchView(viewName) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.add('view-fade-out');
            setTimeout(() => {
                Object.keys(this.els.views).forEach(key => {
                    if (key === viewName) {
                        this.els.views[key].classList.remove('hidden');
                        if (this.els.navs[key]) this.els.navs[key].classList.add('active');
                    } else {
                        this.els.views[key].classList.add('hidden');
                        if (this.els.navs[key]) this.els.navs[key].classList.remove('active');
                    }
                });
                mainContent.classList.remove('view-fade-out');
            }, 150); // Match CSS transition timing
        } else {
            Object.keys(this.els.views).forEach(key => {
                if (key === viewName) {
                    this.els.views[key].classList.remove('hidden');
                    if (this.els.navs[key]) this.els.navs[key].classList.add('active');
                } else {
                    this.els.views[key].classList.add('hidden');
                    if (this.els.navs[key]) this.els.navs[key].classList.remove('active');
                }
            });
        }

        this.app.isViewingHome = (viewName === 'home');
        if (viewName === 'home') {
            this.app.homeSuggestionsState = null;
        }

        // Update nav active state if renaming might have broken mapping
        if (viewName === 'circle') {
            this.els.navs.circle.classList.add('active');
        }

        // Hide the main "Greatuncle" header on all views except home
        if (this.els.header) {
            if (viewName !== 'home') {
                this.els.header.classList.add('hidden');
            } else {
                this.els.header.classList.remove('hidden');
            }
        }

        if (viewName === 'circle') {
            this.els.fab.classList.remove('hidden');
            this.renderCircleList();
            this.renderShareGroupDropdown();
        } else {
            this.els.fab.classList.add('hidden');
        }

        if (viewName === 'settings') {
            this.syncSettingsToUI();
            this.renderDunbarLayers();
        }

        if (viewName === 'journal') {
            this.renderJournal();
        }
    }

    syncSettingsToUI() {
        document.getElementById('rotation-limit').value = this.app.settings.rotationLimit || 3;
        const skipEl = document.getElementById('setting-skip-days');
        if (skipEl) skipEl.value = this.app.settings.skipDays || 1;
        document.getElementById('user-name').value = this.app.settings.userName || "";

        const bday = this.app.settings.userBirthday || "";
        document.getElementById('user-birthday').value = bday;
        document.getElementById('user-birthday-unknown').checked = bday.startsWith('1904');

        const anniv = this.app.settings.userAnniversary || "";
        document.getElementById('user-anniversary').value = anniv;
        document.getElementById('user-anniversary-unknown').checked = anniv.startsWith('1904');

        document.getElementById('user-phone').value = this.formatPhone(this.app.settings.userPhone || "");
        document.getElementById('user-email').value = this.app.settings.userEmail || "";
        document.getElementById('user-address').value = this.app.settings.userAddress || "";
        document.getElementById('user-postal-code').value = this.app.settings.userPostalCode || "";

        const themeEl = document.getElementById('setting-theme');
        if (themeEl) themeEl.value = this.app.settings.theme || 'system';

        const foresightEl = document.getElementById('setting-foresight-window');
        if (foresightEl) foresightEl.value = this.app.settings.foresightWindow || 7;

        if (this.app.settings.prompts) {
            document.getElementById('prompt-sms').value = this.app.settings.prompts.sms || "";
            document.getElementById('prompt-phone').value = this.app.settings.prompts.phone || "";
            document.getElementById('prompt-email').value = this.app.settings.prompts.email || "";
            document.getElementById('prompt-visit').value = this.app.settings.prompts.visit || "";
        }

        this.renderGatheringRules();
        this.updateStorageUI();
    }

    async updateStorageUI() {
        const textEl = document.getElementById('storage-status-text');
        const badgeEl = document.getElementById('storage-status-badge');
        const btnEl = document.getElementById('btn-persist-storage');

        if (!textEl) return;

        const storageStats = await this.app.db.checkStorage();
        if (!storageStats) {
            textEl.textContent = "Your browser does not support storage management APIs.";
            return;
        }

        const usageMB = (storageStats.usage / (1024 * 1024)).toFixed(2);
        const quotaMB = (storageStats.quota / (1024 * 1024)).toFixed(2);

        textEl.textContent = `Storage used: ${usageMB} MB of ${quotaMB} MB available.`;

        if (storageStats.isPersisted) {
            badgeEl.classList.remove('hidden');
            btnEl.classList.add('hidden');
        } else {
            badgeEl.classList.add('hidden');
            btnEl.classList.remove('hidden');
        }
    }

    renderGatheringRules() {
        const container = document.getElementById('gathering-rules-config');
        if (!container) return;

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        container.innerHTML = this.app.settings.gatheringRules.map((rule, index) => `
            <div class="gathering-rule-item" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <select class="rule-day" data-index="${index}">
                    ${days.map(d => `<option value="${d}" ${rule.day === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
                <input type="text" class="rule-tag" data-index="${index}" value="${rule.tag}" placeholder="#tag">
                <button class="btn-remove-rule" data-index="${index}" style="background: none; border: none; cursor: pointer;">❌</button>
            </div>
        `).join('');

        // Add listeners for changes
        container.querySelectorAll('select, input').forEach(el => {
            el.onchange = () => {
                const idx = el.dataset.index;
                if (el.classList.contains('rule-day')) {
                    this.app.settings.gatheringRules[idx].day = el.value;
                } else {
                    this.app.settings.gatheringRules[idx].tag = el.value;
                }
            };
        });

        container.querySelectorAll('.btn-remove-rule').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.dataset.index;
                this.app.settings.gatheringRules.splice(idx, 1);
                this.renderGatheringRules();
            };
        });
    }


    render() {
        const db = this.app.dashboard;
        if (!db) return;

        if (this.app.contacts.length === 0) {
            this.renderEmptyCircle();
            return;
        }

        const appendCards = (container, people, mode, meta = null) => {
            container.innerHTML = '';
            const frag = document.createDocumentFragment();
            people.forEach(p => frag.appendChild(this.createCardElement(p, mode, meta)));
            container.appendChild(frag);
        };

        // 1. Anchors
        const anchorContainer = document.getElementById('anchor-events');
        const anchorCards = document.getElementById('anchor-cards');
        if (db.anchors.length > 0) {
            anchorContainer.classList.remove('hidden');
            appendCards(anchorCards, db.anchors, 'anchor');
        } else {
            anchorContainer.classList.add('hidden');
        }

        // 2. Gathering
        const gatheringContainer = document.getElementById('gathering-events');
        const gatheringCards = document.getElementById('gathering-cards');
        const gatheringTagEl = document.getElementById('gathering-tag');
        if (gatheringContainer && gatheringCards) {
            if (db.gathering) {
                gatheringContainer.classList.remove('hidden');
                if (gatheringTagEl) gatheringTagEl.textContent = db.gathering.tag;
                appendCards(gatheringCards, db.gathering.people, 'gathering', db.gathering.tag);
            } else {
                gatheringContainer.classList.add('hidden');
            }
        }

        // 3. Outreach
        const outreachCards = document.getElementById('outreach-cards');
        if (outreachCards) {
            if (db.outreach.length > 0) {
                appendCards(outreachCards, db.outreach, 'outreach');
            } else {
                this.renderPerfectCircle();
            }
        }

        // 4. Foresight
        const foresightContainer = document.getElementById('upcoming-foresight');
        const foresightCards = document.getElementById('foresight-cards');
        if (foresightContainer && foresightCards) {
            if (db.foresight.length > 0) {
                foresightContainer.classList.remove('hidden');
                appendCards(foresightCards, db.foresight, 'foresight');
            } else {
                foresightContainer.classList.add('hidden');
            }
        }


        // Update total count globally removed in favor of static version

        // Ensure other views refresh if they are currently being viewed
        this.renderCircleList();
        this.renderJournal();
        this.renderGatheringRules();
        this.renderDunbarLayers();
        this.updateBackupNudge();
        this.updateShareReviewNudge();
    }

    updateShareReviewNudge() {
        const pending = this.app.contacts.filter(c => c.tags?.includes('&share'));
        let nudge = document.getElementById('share-review-nudge');

        if (pending.length > 0) {
            if (!nudge) {
                nudge = document.createElement('div');
                nudge.id = 'share-review-nudge';
                nudge.className = 'backup-info'; // Reuse styling
                nudge.style.marginBottom = 'var(--space-md)';
                nudge.style.cursor = 'pointer';
                nudge.style.background = 'rgba(74, 103, 65, 0.1)';
                nudge.style.borderLeft = '4px solid var(--color-action-green)';
                nudge.onclick = () => this.showShareReview();

                const container = document.getElementById('daily-suggestions');
                if (container) container.prepend(nudge);
            }
            nudge.innerHTML = `<strong>Shared People Pending!</strong> You have ${pending.length} people waiting for review. Tap here to process them.`;
            nudge.classList.remove('hidden');
        } else if (nudge) {
            nudge.classList.add('hidden');
        }
    }

    renderEmptyCircle() {
        // Instead of wiping out the whole suggestions container, we just show a specific state in the outreach area
        const outreachCards = document.getElementById('outreach-cards');
        if (!outreachCards) {
            console.error("Outreach container missing for empty state.");
            return;
        }

        const month = new Date().getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');

        outreachCards.innerHTML = `
            <div class="empty-state">
                <div class="seasonal-image" style="background-image: url('assets/images/seasonal/${monthStr}.png');"></div>
                <p>Your circle is empty. Start by adding someone you care about.</p>
                <button class="btn btn-primary" data-action="add-initial" style="margin-top: 20px; background: var(--color-action-green); color: white; padding: 12px 24px; border-radius: 8px;">
                    Begin Your Community
                </button>
            </div>
        `;

        // Hide other sections if they were showing
        ['anchor-events', 'gathering-events', 'upcoming-foresight'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    renderPerfectCircle() {
        const month = new Date().getMonth() + 1;
        const monthStr = month.toString().padStart(2, '0');
        const x = this.app.contacts.length;
        const adj = this.getCircleAdjective();

        document.getElementById('outreach-cards').innerHTML = `
            <div class="empty-state">
                <div class="seasonal-image" style="background-image: url('assets/images/seasonal/${monthStr}.png');"></div>
                <p style="font-family: var(--font-heading); font-size: 1.5rem;">Your circle is ${adj} (${x}/150)</p>
                <p>Enjoy the quiet today.</p>
                
                <button class="extra-slot" onclick="app.ui.switchView('circle')">
                    <span class="icon">🔍</span>
                    <span class="label">Want to call someone specific?</span>
                </button>
            </div>
        `;
    }

    getCircleAdjective() {
        const x = this.app.contacts.length;
        if (x === 0) return "waiting";

        if (x <= 10) return "starting";
        if (x <= 40) return "sprouting";
        if (x <= 80) return "growing";
        if (x <= 120) return "flourishing";
        return "magnificent";
    }

    createCardElement(person, mode = 'outreach', meta = null) {
        const tmpl = document.getElementById('tmpl-snapshot-card');
        const clone = tmpl.content.cloneNode(true);
        const card = clone.querySelector('.snapshot-card');

        card.dataset.id = person.id;
        if (meta) card.dataset.meta = meta;

        if (person.is_user) card.classList.add('is-user-card');
        if (mode === 'anchor') card.classList.add('anchor-card');

        const tags = person.tags || [];
        const isLegacy = tags.includes('&legacy') || tags.includes('#_legacy');
        if (isLegacy) card.classList.add('is-legacy-card');

        // Milestone badges
        let milestoneBadgeText = '';
        if (mode === 'anchor' && person.milestones) {
            milestoneBadgeText = person.milestones.join(', ');
        } else if (mode === 'foresight' && person.upcoming) {
            milestoneBadgeText = person.upcoming.map(u => `${u.label} in ${u.daysLeft}d`).join(', ');
        }

        const badgeContainer = card.querySelector('.milestone-badge-container');
        if (milestoneBadgeText) {
            badgeContainer.innerHTML = `<div class="milestone-badge">${milestoneBadgeText}</div>`;
        } else {
            badgeContainer.remove();
        }

        // Tag Chips
        const tagChipsHtml = tags
            .filter(t => t.startsWith('#') || t.startsWith('@'))
            .map(t => {
                const type = t.startsWith('#') ? 'tag' : 'group';
                const val = t.substring(1);
                return `<button class="tag-chip clickable-chip" data-action="filter-${type}" data-value="${val}">${t}</button>`;
            })
            .join('');
        card.querySelector('.tag-chips').innerHTML = tagChipsHtml;

        // Determine name prefix and suffix
        let namePrefix = '';
        let nameSuffix = '';
        if (mode === 'anchor' || mode === 'foresight') {
            const milestones = mode === 'anchor'
                ? (person.milestones || []).map(m => ({ label: m, daysLeft: 0 }))
                : (person.upcoming || []);

            const milestoneText = milestones.map(m => m.label).join(' ').toLowerCase();
            if (milestoneText.includes('birthday')) namePrefix = '🎂 ';
            else if (milestoneText.includes('anniversary')) namePrefix = '💍 ';

            const primary = milestones[0];
            if (primary) {
                if (primary.daysLeft === 0) {
                    nameSuffix = ` <span class="name-date-suffix">Today</span>`;
                } else if (primary.daysLeft === 1) {
                    nameSuffix = ` <span class="name-date-suffix">Tomorrow</span>`;
                } else if (primary.daysLeft > 1) {
                    const dateStr = primary.label === 'Birthday' ? person.birthday : person.anniversary;
                    if (dateStr) {
                        const parts = dateStr.split('-');
                        if (parts.length >= 3) {
                            nameSuffix = ` <span class="name-date-suffix">${parts[1]} ${parts[2]}</span>`;
                        }
                    }
                }
            }
        }

        let statusHtml = '';
        const hasLevel5 = person.tags && person.tags.includes('&level5');
        if (!person.is_user && !isLegacy && !hasLevel5) {
            const overdueDays = Math.floor((Date.now() - person.last_contacted) / (1000 * 60 * 60 * 24));
            const statusText = person.last_contacted === 0 ? 'Not Yet' :
                overdueDays === 0 ? 'Today' :
                    overdueDays === 1 ? 'Yesterday' :
                        overdueDays + ' days ago';
            statusHtml = `<span class="contact-last-status" style="font-size: 0.8rem; font-weight: normal; opacity: 0.6; margin-left: 8px;">${statusText}</span>`;
        }

        card.querySelector('.contact-name').innerHTML = `${namePrefix}${person.name}${nameSuffix}${statusHtml}`;

        const metaEl = card.querySelector('.contact-meta');
        if (person.is_user) {
            metaEl.textContent = 'Concentrate on your community today.';
        } else if (isLegacy) {
            metaEl.textContent = 'In Loving Memory';
        } else {
            metaEl.textContent = '';
        }

        // Handle Sections Visibility
        if (person.is_user) {
            const celUi = card.querySelector('.celebration-ui');
            celUi.classList.remove('hidden');
            celUi.textContent = `✨ Happy ${person.milestones ? person.milestones[0] : 'Day'}! ✨`;
            card.querySelector('.card-actions').remove();
        } else {
            if (mode === 'foresight') {
                const prepActs = card.querySelector('.prep-actions');
                prepActs.classList.remove('hidden');
                prepActs.querySelectorAll('button').forEach(b => b.dataset.id = person.id);
            }

            if (isLegacy) {
                card.querySelector('.btn-reflect').classList.remove('hidden');
                card.querySelector('.btn-reflect').dataset.id = person.id;

                card.querySelector('.btn-view-memory').classList.remove('hidden');
                card.querySelector('.btn-view-memory').dataset.id = person.id;
            } else {
                const dirActs = card.querySelector('.direct-actions');
                dirActs.classList.remove('hidden');
                dirActs.querySelectorAll('button').forEach(b => b.dataset.id = person.id);

                if (!person.phone) {
                    dirActs.querySelector('.btn-sms').classList.add('is-missing');
                    dirActs.querySelector('.btn-call').classList.add('is-missing');
                }
                if (!person.email) {
                    dirActs.querySelector('.btn-email').classList.add('is-missing');
                }

                if (!hasLevel5) {
                    card.querySelector('.btn-snooze').classList.remove('hidden');
                    card.querySelector('.btn-snooze').dataset.id = person.id;

                    let snoozeDays = this.app.settings.skipDays || 1;
                    if ((person.tags || []).includes('&level50')) snoozeDays = 7;
                    else if ((person.tags || []).includes('&level150')) snoozeDays = 14;
                    card.querySelector('.btn-snooze').textContent = `Snooze (${snoozeDays}d)`;

                    card.querySelector('.btn-complete').classList.remove('hidden');
                    card.querySelector('.btn-complete').dataset.id = person.id;
                }
            }
        }

        return clone;
    }

    renderCircleList() {
        if (!this.els.circleList) return;

        // Render Tag Cloud, Group Filters, Level Filters, and Sort Controls first so they always appear
        this.renderTagCloud();
        this.renderGroupFilters();
        this.renderLevelFilters();
        this.renderSortControls();

        if (this.app.contacts.length === 0) {
            this.els.circleList.innerHTML = '<p class="empty-list-note">Your circle is waiting to be filled.</p>';
            return;
        }

        let list = this.app.contacts.filter(c => !c.tags?.includes('&share'));

        // 1. Level Filter Stage (Selectively show layers 5, 15, 50, 150)
        // If NO levels are checked, we show everyone (respecting the tag/search filters).
        // If levels ARE checked, we show people who belong to ANY of those checked levels.
        if (this.app.currentLevelFilters && this.app.currentLevelFilters.length > 0) {
            list = list.filter(c => {
                if (!c.tags) return false;
                return this.app.currentLevelFilters.some(selectedLevelTag => c.tags.includes(selectedLevelTag));
            });
        }

        // 1.5 Group Filter Stage (OR logic: show anyone in ANY of the selected groups)
        if (this.app.currentGroupFilters && this.app.currentGroupFilters.length > 0) {
            list = list.filter(c => {
                const tags = c.tags || [];
                const groups = tags.filter(t => t.startsWith('@'));
                return this.app.currentGroupFilters.some(g => groups.includes(g));
            });
        }

        // 2. Tag Filter Stage (Filter by #topics, etc) - OR Logic
        if (this.app.currentTagFilters && this.app.currentTagFilters.length > 0) {
            list = list.filter(c => c.tags && this.app.currentTagFilters.some(t => c.tags.includes(t)));
        }

        const query = (this.app.searchQuery || '').trim();
        const isTagSearch = query.startsWith('@') || query.startsWith('#') || query.startsWith('$') || query.startsWith('!');

        const filtered = list.filter(c => {
            if (isTagSearch) {
                return c.tags && c.tags.some(t => t.toLowerCase().includes(query));
            } else {
                return (c.name || '').toLowerCase().includes(query);
            }
        });

        // 3. Sort Stage
        let sorted;
        if (this.app.currentSort === 'alpha') {
            sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (this.app.currentSort === 'due') {
            const INTERVALS = {
                '&level5': 14,
                '&level15': 30,
                '&level50': 90,
                '&level150': 365
            };

            const calculateScore = (contact) => {
                let interval = 90;
                if (contact.tags) {
                    if (contact.tags.includes('&level5')) interval = INTERVALS['&level5'];
                    else if (contact.tags.includes('&level15')) interval = INTERVALS['&level15'];
                    else if (contact.tags.includes('&level50')) interval = INTERVALS['&level50'];
                    else if (contact.tags.includes('&level150')) interval = INTERVALS['&level150'];
                }

                let daysSince;
                if (contact.last_contacted === 0) {
                    daysSince = interval * 1.1;
                } else {
                    daysSince = (Date.now() - contact.last_contacted) / (1000 * 60 * 60 * 24);
                }
                return daysSince / interval;
            };

            sorted = [...filtered].sort((a, b) => calculateScore(b) - calculateScore(a));
        } else {
            sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        const tmpl = document.getElementById('tmpl-contact-row');
        this.els.circleList.innerHTML = '';
        if (tmpl) {
            const fragment = document.createDocumentFragment();
            const INTERVALS = {
                '&level5': 14,
                '&level15': 30,
                '&level50': 90,
                '&level150': 365
            };

            sorted.forEach(person => {
                const clone = tmpl.content.cloneNode(true);
                const row = clone.querySelector('.contact-row');
                row.dataset.id = person.id;

                let nameSuffix = '';
                if (this.app.currentSort === 'due') {
                    let interval = 90;
                    if (person.tags) {
                        if (person.tags.includes('&level5')) interval = INTERVALS['&level5'];
                        else if (person.tags.includes('&level15')) interval = INTERVALS['&level15'];
                        else if (person.tags.includes('&level50')) interval = INTERVALS['&level50'];
                        else if (person.tags.includes('&level150')) interval = INTERVALS['&level150'];
                    }

                    if (person.last_contacted !== 0) {
                        const daysSince = (Date.now() - person.last_contacted) / (1000 * 60 * 60 * 24);
                        if (daysSince > interval) {
                            const overdue = Math.floor(daysSince - interval);
                            nameSuffix = ` (${overdue} days)`;
                        }
                    } else {
                        nameSuffix = ' (Not Yet)';
                    }
                }

                clone.querySelector('.name-display').innerHTML = `${person.name}${nameSuffix ? `<span class="name-date-suffix">${nameSuffix}</span>` : ''}`;
                clone.querySelector('.tags-display').textContent = (person.tags || []).filter(t => t.startsWith('#') || t.startsWith('@')).join(' ');

                clone.querySelector('.action-complete').dataset.id = person.id;

                fragment.appendChild(clone);
            });
            this.els.circleList.appendChild(fragment);
        }

        this.renderShareGroupDropdown();
    }

    renderCircleListWithAnimation() {
        if (!this.els.circleList) return;
        this.els.circleList.classList.add('list-hidden');
        setTimeout(() => {
            this.renderCircleList();
            this.els.circleList.classList.remove('list-hidden');
        }, 200);
    }

    renderSortControls() {
        const container = document.getElementById('sort-controls');
        if (!container) return;

        const options = [
            { id: 'alpha', label: 'Name' },
            { id: 'due', label: 'Overdue' }
        ];

        container.innerHTML = options.map(opt => {
            const isActive = this.app.currentSort === opt.id;
            return `
                <button class="circle-tab-btn sort-tab-btn ${isActive ? 'active' : ''}" data-sort="${opt.id}">
                    ${opt.label}
                </button>
            `;
        }).join('');
    }

    renderLevelFilters() {
        const container = document.getElementById('level-filter-container');
        if (!container) return;

        const levels = [
            { id: '&level5', label: '5' },
            { id: '&level15', label: '10' },
            { id: '&level50', label: '35' },
            { id: '&level150', label: '100' }
        ];

        container.innerHTML = levels.map(opt => {
            const isActive = this.app.currentLevelFilters.includes(opt.id);
            return `
                <button class="circle-tab-btn level-tab-btn ${isActive ? 'active' : ''}" data-level="${opt.id}">
                    ${opt.label}
                </button>
            `;
        }).join('');
    }

    renderShareGroupDropdown() {
        const select = document.getElementById('share-group-select');
        if (!select) return;

        // Find all unique @groups
        const allGroups = new Set();
        this.app.contacts.filter(c => !c.tags?.includes('&share')).forEach(c => {
            if (c.tags) {
                c.tags.forEach(t => {
                    if (t.startsWith('@')) allGroups.add(t);
                });
            }
        });

        const sortedGroups = Array.from(allGroups).sort();
        const currentVal = select.value;

        // Only rebuild if options changed
        const hash = sortedGroups.join(',');
        if (select.dataset.optionsHash === hash) return;

        let html = '<option value="none">None (App Link + Profile Only)</option>';
        sortedGroups.forEach(group => {
            const label = group.substring(1);
            html += `<option value="${group}">${label} group</option>`;
        });

        select.innerHTML = html;
        select.dataset.optionsHash = hash;
        if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
            select.value = currentVal;
        }

        if (!select.dataset.listenerAttached) {
            select.addEventListener('change', () => this.handleShareGroupChange());
            select.dataset.listenerAttached = "true";
        }
        this.handleShareGroupChange();
    }

    renderGroupFilters() {
        const container = document.getElementById('group-filter-container');
        if (!container) return;

        // Find all unique @groups
        const allGroups = new Set();
        this.app.contacts.filter(c => !c.tags?.includes('&share')).forEach(c => {
            if (c.tags) {
                c.tags.forEach(t => {
                    if (t.startsWith('@')) allGroups.add(t);
                });
            }
        });

        const sortedGroups = Array.from(allGroups).sort();

        let html = sortedGroups.map(group => {
            const isActive = this.app.currentGroupFilters.includes(group);
            return `
                <button class="circle-tab-btn group-tab-btn ${isActive ? 'active' : ''}" data-group="${group}">
                    ${group.substring(1)}
                </button>
            `;
        }).join('');
        container.innerHTML = html;
    }

    renderTagCloud() {
        const cloud = document.getElementById('tag-cloud');
        if (!cloud) return;

        const allTags = new Set();
        this.app.contacts.filter(c => !c.tags?.includes('&share')).forEach(c => {
            if (c.tags) {
                c.tags.forEach(t => {
                    if (t.startsWith('#')) {
                        allTags.add(t);
                    }
                });
            }
        });

        const activeTags = this.app.currentTagFilters || [];

        let tagsHtml = `
            <button class="circle-tab-btn ${activeTags.includes('&legacy') ? 'active' : ''}" data-tag="&legacy" style="margin-right: 15px;">
                &legacy
            </button>
        `;

        tagsHtml += Array.from(allTags).sort().filter(t => t.startsWith('#')).map(tag => {
            const isActive = activeTags.includes(tag);
            return `
                <button class="circle-tab-btn ${isActive ? 'active' : ''}" data-tag="${tag}">
                    ${tag}
                </button>
            `;
        }).join('');

        cloud.innerHTML = tagsHtml;
    }

    renderJournal() {
        if (!this.els.journalList) return;

        const allLogs = [];
        const uniqueContacts = new Set();
        const activeDays = new Set();

        this.app.contacts.filter(c => !c.tags?.includes('&share')).forEach(contact => {
            if (contact.logs) {
                contact.logs.forEach(log => {
                    allLogs.push({
                        ...log,
                        contactName: contact.name,
                        contactId: contact.id,
                        ring: contact.ring
                    });
                    uniqueContacts.add(contact.id);
                    activeDays.add(new Date(log.timestamp).toDateString());
                });
            }
        });

        allLogs.sort((a, b) => b.timestamp - a.timestamp);

        // Render Stats
        const statsEl = document.getElementById('journal-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card">
                    <span class="stat-value">${allLogs.length}</span>
                    <span class="stat-label">Total Logs</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${uniqueContacts.size}</span>
                    <span class="stat-label">Connections</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${activeDays.size}</span>
                    <span class="stat-label">Days Active</span>
                </div>
            `;
        }

        if (allLogs.length === 0) {
            this.els.journalList.innerHTML = '<p class="empty-list-note">Your journal is empty. Connections you log will appear here.</p>';
            return;
        }

        const tmpl = document.getElementById('tmpl-journal-entry');
        this.els.journalList.innerHTML = '';
        if (tmpl) {
            const fragment = document.createDocumentFragment();
            allLogs.forEach(log => {
                const date = new Date(log.timestamp);
                const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                const clone = tmpl.content.cloneNode(true);
                clone.querySelector('.journal-name').textContent = log.contactName;
                clone.querySelector('.journal-date').textContent = dateStr;

                const commentEl = clone.querySelector('.journal-comment');
                if (log.comment) {
                    commentEl.textContent = `"${log.comment}"`;
                } else {
                    commentEl.textContent = "Connected";
                    commentEl.classList.add('italic');
                }

                fragment.appendChild(clone);
            });
            this.els.journalList.appendChild(fragment);
        }
    }

    showContactDetail(id) {
        const person = this.app.contacts.find(c => c.id === id);
        if (!person) return;

        document.getElementById('detail-name').textContent = person.name;
        document.getElementById('detail-meta').textContent = `${(person.tags || []).filter(t => !t.startsWith('&') && !t.startsWith('#_') && !t.startsWith('!')).join(' ')}`;

        const phoneEl = document.getElementById('detail-phone');
        const emailEl = document.getElementById('detail-email');
        const addressEl = document.getElementById('detail-address');

        phoneEl.innerHTML = person.phone ? this.formatPhone(person.phone) : '';
        emailEl.innerHTML = person.email ? person.email : '';

        addressEl.innerHTML = '';
        if (person.address || person.zip_code) {
            const addrText = [person.address, person.zip_code].filter(Boolean).join(' ');
            addressEl.innerHTML = addrText;
            addressEl.classList.remove('hidden');
        } else {
            addressEl.classList.add('hidden');
        }

        // Add Birthday/Anniversary display to Detail view
        let milestonesHtml = '';
        if (person.birthday) milestonesHtml += `<p class="detail-milestone">🎂 Birthday: ${this.formatDateLabel(person.birthday)}</p>`;
        if (person.anniversary) milestonesHtml += `<p class="detail-milestone">💍 Anniversary: ${this.formatDateLabel(person.anniversary)}</p>`;

        const infoContainer = document.getElementById('detail-contact-info');
        // Clear previous milestones if any
        infoContainer.querySelectorAll('.detail-milestone').forEach(el => el.remove());
        if (milestonesHtml) {
            infoContainer.insertAdjacentHTML('beforeend', milestonesHtml);
        }

        if (!person.phone) phoneEl.classList.add('hidden');
        else phoneEl.classList.remove('hidden');

        if (!person.email) emailEl.classList.add('hidden');
        else emailEl.classList.remove('hidden');

        phoneEl.onclick = null;
        emailEl.onclick = null;

        const directActions = document.getElementById('detail-direct-actions');
        const cardActions = document.getElementById('detail-card-actions');

        if (directActions) {
            directActions.querySelectorAll('button').forEach(b => b.dataset.id = id);

            directActions.querySelector('.btn-sms')?.classList.toggle('is-missing', !person.phone);
            directActions.querySelector('.btn-call')?.classList.toggle('is-missing', !person.phone);
            directActions.querySelector('.btn-email')?.classList.toggle('is-missing', !person.email);
        }
        if (cardActions) {
            cardActions.querySelectorAll('button').forEach(b => b.dataset.id = id);
        }

        const historyContainer = document.getElementById('detail-history');
        const hasLevel5 = person.tags && person.tags.includes('&level5');

        if (hasLevel5) {
            historyContainer.innerHTML = '<p class="empty-list-note">Interactions are not tracked for your Inner 5.</p>';
        } else if (!person.logs || person.logs.length === 0) {
            historyContainer.innerHTML = '<p class="empty-list-note">No history yet.</p>';
        } else {
            const sortedLogs = [...person.logs].sort((a, b) => b.timestamp - a.timestamp);
            historyContainer.innerHTML = sortedLogs.map(log => {
                const date = new Date(log.timestamp);
                const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                return `
                    <div class="history-item">
                        <div class="journal-entry-meta">
                            <span class="history-label">Connected</span>
                            <span class="history-date">${dateStr}</span>
                        </div>
                        ${log.comment ? `<p class="history-comment">"${log.comment}"</p>` : ''}
                    </div>
                `;
            }).join('');
        }

        const snoozeBtn = document.querySelector('#detail-overlay .btn-snooze');
        if (snoozeBtn) {
            let snoozeDays = this.app.settings.skipDays || 1;
            if ((person.tags || []).includes('&level50')) snoozeDays = 7;
            else if ((person.tags || []).includes('&level150')) snoozeDays = 14;
            snoozeBtn.textContent = `Snooze (${snoozeDays}d)`;
            snoozeBtn.dataset.id = id;
            if (!person.is_user && !(person.tags || []).some(t => t.includes('legacy')) && !hasLevel5) {
                snoozeBtn.classList.remove('hidden');
            } else {
                snoozeBtn.classList.add('hidden');
            }
        }

        if (cardActions) {
            const completeBtn = cardActions.querySelector('.btn-complete');
            if (completeBtn) {
                if (hasLevel5) completeBtn.classList.add('hidden');
                else completeBtn.classList.remove('hidden');
            }
        }

        this.currentDetailId = id; // Track for edit flow
        this.els.detailOverlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    showEditContact(id) {
        const person = this.app.contacts.find(c => c.id === id);
        if (!person) return;

        const overlay = document.getElementById('edit-overlay');
        document.getElementById('edit-id').value = person.id;
        document.getElementById('edit-name').value = person.name;
        document.getElementById('edit-phone').value = this.formatPhone(person.phone || '');
        document.getElementById('edit-email').value = person.email || '';
        document.getElementById('edit-zip').value = person.zip_code || '';
        document.getElementById('edit-address').value = person.address || '';
        document.getElementById('edit-tags').value = (person.tags || []).filter(t => !t.startsWith('&') && !t.startsWith('#_') && !t.startsWith('!')).join(' ');

        const bday = person.birthday || '';
        document.getElementById('edit-birthday').value = bday;
        document.getElementById('edit-birthday-unknown').checked = bday.startsWith('1904');

        const anniv = person.anniversary || '';
        document.getElementById('edit-anniversary').value = anniv;
        document.getElementById('edit-anniversary-unknown').checked = anniv.startsWith('1904');

        document.getElementById('edit-legacy').value = (person.tags && (person.tags.includes('&legacy') || person.tags.includes('#_legacy'))) ? 'true' : 'false';

        // Pre-select Level
        const levelTag = (person.tags || []).find(t => t.startsWith('&level'));
        if (levelTag) {
            const radio = document.querySelector(`input[name="edit-contact-level"][value="${levelTag}"]`);
            if (radio) radio.checked = true;
        } else {
            // Default to 50 if no tag found
            const radio50 = document.querySelector('input[name="edit-contact-level"][value="&level50"]');
            if (radio50) radio50.checked = true;
        }

        overlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    hideEditContact() {
        document.getElementById('edit-overlay').classList.add('hidden');
        this._checkOverlayStack();
    }

    hideContactDetail() {
        this.els.detailOverlay.classList.add('hidden');
        this._checkOverlayStack();
    }

    _checkOverlayStack() {
        // Only remove body lock if NO overlays are visible
        const anyVisible = document.querySelector('.overlay:not(.hidden)');
        if (!anyVisible) {
            document.body.classList.remove('overlay-open');
        }
    }

    getRingLabel(person) {
        if (!person || !person.tags) return 'Circle';
        if (person.tags.includes('&level5')) return 'Intimate (Level 5)';
        if (person.tags.includes('&level15')) return 'Core (Level 15)';
        if (person.tags.includes('&level50')) return 'Friends (Level 50)';
        if (person.tags.includes('&level150')) return 'Circle (Level 150)';
        if (person.tags.includes('#community')) return 'Community';
        return 'Circle';
    }

    showMethodPicker(id) {
        const contact = this.app.contacts.find(c => c.id === id);
        if (!contact) return;

        this.app.currentPromptId = id;
        const overlay = this.els.promptOverlay;
        const intentTabs = overlay.querySelectorAll('.intent-tabs .tab-btn');

        this.app.currentCategory = 'lowStakes';
        if (contact.ring === 'inner') this.app.currentCategory = 'familyLegacy';
        if (contact.ring === 'neighborhood') this.app.currentCategory = 'community';

        intentTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.intent === this.app.currentCategory);
            btn.onclick = () => {
                this.app.currentCategory = btn.dataset.intent;
                intentTabs.forEach(b => b.classList.toggle('active', b === btn));
                if (this.app.currentMethod) this.app.generatePrompt(this.app.currentCategory, this.app.currentMethod, contact);
                this.renderMethodButtons(contact);
            };
        });

        this.app.currentMethod = null;
        this.renderMethodButtons(contact);
        document.getElementById('generated-prompt-display').innerHTML = '';
        overlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    renderMethodButtons(contact) {
        const list = document.getElementById('method-list');
        const methods = [
            { id: 'sms', label: 'Send Text', icon: '📱' },
            { id: 'phone', label: 'Call Phone', icon: '📞' },
            { id: 'email', label: 'Send Email', icon: '📧' },
            { id: 'postcard', label: 'Postcard', icon: '🖼️' },
            { id: 'visit', label: 'Drop Visit', icon: '🏠' },
            { id: 'social', label: 'Social', icon: '💬' },
            { id: 'other', label: 'Other', icon: '✨' }
        ];

        list.innerHTML = methods.map(m => `
            <button class="method-btn ${this.app.currentMethod === m.id ? 'active' : ''}" data-method="${m.id}">
                <span class="icon">${m.icon}</span>
                <span class="label">${m.label}</span>
            </button>
        `).join('');

        list.onclick = (e) => {
            const btn = e.target.closest('.method-btn');
            if (!btn) return;
            const method = btn.dataset.method;

            if (method === 'postcard') {
                this.hidePromptPicker();
                this.showPostcard(contact.id);
                return;
            }

            this.app.currentMethod = method;
            document.querySelectorAll('.method-btn').forEach(b => b.classList.toggle('active', b === btn));
            this.app.generatePrompt(this.app.currentCategory, this.app.currentMethod, contact);
        };
    }

    hidePromptPicker() {
        if (this.els.promptOverlay) this.els.promptOverlay.classList.add('hidden');
        document.getElementById('generated-prompt-display').innerHTML = '';
        this._checkOverlayStack();
    }

    showLogOverlay(id) {
        const contact = this.app.contacts.find(c => c.id === id);
        if (!contact) return;

        this.app.currentLogId = id;
        document.getElementById('log-contact-name').textContent = `Record connection with ${contact.name}`;
        document.getElementById('log-comment').value = '';
        this.els.logOverlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    hideLogOverlay() {
        this.els.logOverlay.classList.add('hidden');
        this._checkOverlayStack();
    }

    showMissingInfo(id, method, person) {
        const overlay = this.els.missingInfoOverlay;
        document.getElementById('missing-info-id').value = id;
        document.getElementById('missing-info-method').value = method;

        const phoneGroup = document.getElementById('group-missing-phone');
        const emailGroup = document.getElementById('group-missing-email');
        const phoneInput = document.getElementById('missing-phone');
        const emailInput = document.getElementById('missing-email');
        const textEl = document.getElementById('missing-info-text');

        phoneGroup.classList.add('hidden');
        emailGroup.classList.add('hidden');
        phoneInput.value = person.phone || '';
        emailInput.value = person.email || '';

        if (method === 'sms' || method === 'phone') {
            phoneGroup.classList.remove('hidden');
            textEl.textContent = `Please add a phone number for ${person.name}.`;
        } else if (method === 'email') {
            emailGroup.classList.remove('hidden');
            textEl.textContent = `Please add an email address for ${person.name}.`;
        }

        overlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    hideMissingInfo() {
        if (this.els.missingInfoOverlay) this.els.missingInfoOverlay.classList.add('hidden');
        this._checkOverlayStack();
    }

    showCalendarPlanner(id, defaultActivity = null) {
        const contact = id === 'gathering-group' ? { name: 'Group Gathering', id: 'gathering-group' } : this.app.contacts.find(c => c.id === id);
        if (!contact) return;

        const overlay = this.els.calendarOverlay;
        document.getElementById('calendar-contact-id').value = id;
        document.getElementById('calendar-contact-name').textContent = id === 'gathering-group' ? `Group: ${defaultActivity}` : `With ${contact.name}`;

        // Default to 2 hours from now
        const now = new Date();
        now.setHours(now.getHours() + 2);
        now.setMinutes(0); // Round to hour for cleanliness

        // Format for datetime-local: YYYY-MM-DDTHH:MM
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const defaultValue = `${year}-${month}-${day}T${hours}:${minutes}`;
        document.getElementById('calendar-datetime').value = defaultValue;

        const activitySelect = document.getElementById('calendar-activity');
        if (defaultActivity) {
            // Check if activity exists in dropdown, if not add it
            let exists = false;
            for (let i = 0; i < activitySelect.options.length; i++) {
                if (activitySelect.options[i].value === defaultActivity) {
                    activitySelect.selectedIndex = i;
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = defaultActivity;
                opt.text = defaultActivity;
                activitySelect.add(opt);
                activitySelect.value = defaultActivity;
            }
        } else {
            activitySelect.selectedIndex = 0;
        }

        overlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    hideCalendarPlanner() {
        if (this.els.calendarOverlay) this.els.calendarOverlay.classList.add('hidden');
        this._checkOverlayStack();
    }

    showOnboarding() {
        if (this.els.onboardingOverlay) {
            document.getElementById('contact-birthday').value = '';
            document.getElementById('contact-anniversary').value = '';

            // Check for Contact Picker support
            const hasPicker = 'contacts' in navigator && 'ContactsManager' in window;
            const importBtn = document.getElementById('btn-import-contact');
            if (importBtn) importBtn.classList.toggle('hidden', !hasPicker);

            this.els.onboardingOverlay.classList.remove('hidden');
            document.body.classList.add('overlay-open');
        }
    }

    hideOnboarding() {
        if (this.els.onboardingOverlay) this.els.onboardingOverlay.classList.add('hidden');
        this._checkOverlayStack();
    }

    // Digital Postcards
    showPostcard(id) {
        const contact = this.app.contacts.find(c => c.id === id);
        if (!contact) return;

        this.app.currentPostcardId = id;
        document.getElementById('postcard-contact-name').textContent = contact.name;
        document.getElementById('postcard-image').classList.add('hidden');
        document.querySelector('.postcard-placeholder').classList.remove('hidden');
        document.getElementById('postcard-message').value = '';
        document.getElementById('postcard-text-preview').textContent = 'Your message here...';
        document.getElementById('postcard-overlay').classList.remove('hidden');
        document.body.classList.add('overlay-open');

        // Setup upload trigger
        document.getElementById('postcard-preview').onclick = () => {
            document.getElementById('postcard-upload').click();
        };

        document.getElementById('postcard-upload').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.getElementById('postcard-image');
                    img.src = ev.target.result;
                    img.classList.remove('hidden');
                    document.querySelector('.postcard-placeholder').classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById('close-postcard').onclick = () => {
            document.getElementById('postcard-overlay').classList.add('hidden');
        };

        document.getElementById('postcard-message').oninput = (e) => {
            document.getElementById('postcard-text-preview').textContent = e.target.value || 'Your message here...';
        };

        document.getElementById('send-postcard').onclick = async () => {
            const msg = document.getElementById('postcard-message').value;
            const contact = this.app.contacts.find(c => c.id === id);

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Greatuncle Digital Postcard',
                        text: `${msg} — Shared via Greatuncle`,
                        url: window.location.origin
                    });
                    this.app.markCompleted(id, `Shared digital postcard: ${msg}`);
                    document.getElementById('postcard-overlay').classList.add('hidden');
                    this._checkOverlayStack();
                } catch (err) {
                    console.log('Share failed', err);
                    if (confirm("Share canceled. Still mark as connected?")) {
                        this.app.markCompleted(id, `Sent digital postcard: ${msg}`);
                        document.getElementById('postcard-overlay').classList.add('hidden');
                        this._checkOverlayStack();
                    }
                }
            } else {
                this.app.markCompleted(id, `Sent digital postcard: ${msg}`);
                document.getElementById('postcard-overlay').classList.add('hidden');
                this._checkOverlayStack();
                alert('Postcard shared (Browser share not supported, connection logged).');
            }
        };
    }

    showReflection(id) {
        const contact = this.app.contacts.find(c => c.id === id);
        if (!contact) return;

        const overlay = document.getElementById('reflection-overlay');
        const nameEl = document.getElementById('reflection-contact-name');
        const promptEl = document.getElementById('reflection-prompt-text');
        const noteEl = document.getElementById('reflection-note');

        nameEl.textContent = `Reflect on ${contact.name}`;
        noteEl.value = '';

        // Get a reflection prompt
        const prompts = [
            "What is one lesson they taught you that you carry today?",
            "Describe a favorite memory of a simple day spent with them.",
            "What was their unique 'superpower' or way of making people feel?",
            "If you could tell them one thing about your life right now, what would it be?",
            "What object or place always brings them to mind?",
            "Write a note of gratitude for their presence in your life."
        ];
        promptEl.textContent = prompts[Math.floor(Math.random() * prompts.length)];

        overlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');

        document.getElementById('save-reflection').onclick = () => {
            const note = noteEl.value.trim();
            if (note) {
                this.app.markCompleted(id, `Reflection: ${note}`);
                overlay.classList.add('hidden');
                this._checkOverlayStack();
            } else {
                alert("Please record a brief reflection.");
            }
        };

        document.getElementById('close-reflection').onclick = () => {
            overlay.classList.add('hidden');
            this._checkOverlayStack();
        };
    }

    renderDunbarLayers() {
        const container = document.getElementById('dunbar-layers-container');
        if (!container) return;

        const layers = this.app.getConnectionLayers();

        container.innerHTML = `
            <h3 class="font-heading" style="margin-top: var(--space-lg); font-size: 1.1rem;">Connection Health</h3>
            <p class="setting-desc" style="margin-bottom: var(--space-md);">Dunbar's Layers define how we distribute our social energy. Are your circles balanced?</p>
            ${layers.map(layer => {
            const percent = Math.min(100, (layer.count / layer.limit) * 100);
            const isWarning = layer.count >= layer.limit;
            return `
                    <div class="layer-item">
                        <div class="layer-header">
                            <span class="layer-name">${layer.name}</span>
                            <span class="layer-count">${layer.count} / ${layer.add}</span>
                        </div>
                        <div class="layer-bar-bg">
                            <div class="layer-bar-fill ${isWarning ? 'at-capacity' : ''}" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
        }).join('')}
        `;
    }

    updateBackupNudge() {
        const nudge = document.getElementById('backup-nudge');
        if (!nudge) return;

        const isDirty = this.app.settings.isDirty;
        const dirtySince = this.app.settings.dirtySince || Date.now();
        const lastExport = this.app.settings.lastExportTimestamp || 0;
        const now = Date.now();
        const daysSinceDirty = Math.floor((now - dirtySince) / (1000 * 60 * 60 * 24));

        if (lastExport === 0) {
            nudge.innerHTML = `<strong>Seedling not saved!</strong> You haven't backed up your community yet. Generate a Digital Seedling to keep your 150 safe.`;
            nudge.classList.remove('hidden');
        } else if (isDirty && daysSinceDirty >= 7) {
            nudge.innerHTML = `<strong>Stale Seedling!</strong> You've made changes starting ${daysSinceDirty} days ago. It's time to generate a new Digital Seedling.`;
            nudge.classList.remove('hidden');
        } else {
            nudge.classList.add('hidden');
        }
    }

    showShareReview() {
        const pending = this.app.contacts.filter(c => c.tags?.includes('&share'));
        this._reviewBatchTotal = pending.length;
        this.renderShareReviewList();
        this.els.shareReviewOverlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    renderShareReviewList() {
        const list = document.getElementById('share-review-list');
        if (!list) return;

        const pending = this.app.contacts.filter(c => c.tags?.includes('&share'));

        // Update Bulk Import button text with count
        const total = this._reviewBatchTotal || pending.length;
        const currentCount = pending.length;
        const reviewedCount = total - currentCount;
        const bulkBtn = document.getElementById('bulk-import-shared');
        const pauseBtn = document.getElementById('pause-review-btn');
        const bulkTagArea = document.querySelector('.bulk-tag-actions');

        if (bulkBtn) {
            bulkBtn.textContent = `Import All Selected (${reviewedCount}/${total})`;
            bulkBtn.disabled = currentCount === 0;
            bulkBtn.style.opacity = currentCount === 0 ? '0.5' : '1';
        }

        if (pauseBtn) {
            if (currentCount === 0) {
                pauseBtn.textContent = "All Finished";
                pauseBtn.style.fontWeight = "700";
                pauseBtn.style.opacity = "1";
            } else {
                pauseBtn.textContent = "Pause Reviewing for Now";
                pauseBtn.style.fontWeight = "400";
            }
        }

        if (bulkTagArea) {
            bulkTagArea.classList.toggle('hidden', currentCount === 0);
        }

        if (pending.length === 0) {
            list.innerHTML = '<p class="empty-list-note">No more people to review.</p>';
            return;
        }

        const tmpl = document.getElementById('tmpl-share-review-item');
        list.innerHTML = '';
        if (tmpl) {
            const fragment = document.createDocumentFragment();
            pending.forEach((item) => {
                const batchTag = item.tags.find(t => t.startsWith('@')) || '@received';
                const isDuplicate = item.tags.includes('&duplicate');

                const clone = tmpl.content.cloneNode(true);
                const reviewItem = clone.querySelector('.share-review-item');
                reviewItem.id = `share-item-${item.id}`;

                clone.querySelector('.sr-name').textContent = item.name;

                if (isDuplicate) {
                    clone.querySelector('.sr-duplicate-warning').classList.remove('hidden');
                    clone.querySelector('.sr-duplicate-text').classList.remove('hidden');
                    clone.querySelector('.sr-btn-merge').classList.remove('hidden');
                }

                if (item.phone) {
                    clone.querySelector('.sr-phone').textContent = `📱 ${this.formatPhone(item.phone)}`;
                }
                if (item.email) {
                    clone.querySelector('.sr-email').textContent = `📧 ${item.email}`;
                }

                const tagInput = clone.querySelector('.share-tag-input');
                tagInput.id = `tag-item-${item.id}`;
                tagInput.value = batchTag;

                const btnAddNew = clone.querySelector('.sr-btn-add-new');
                btnAddNew.onclick = () => this.app.ui.importSingleShared(item.id);

                const btnMerge = clone.querySelector('.sr-btn-merge');
                btnMerge.onclick = () => this.app.ui.mergeShared(item.id);

                const btnSkip = clone.querySelector('.sr-btn-skip');
                btnSkip.onclick = () => this.app.ui.skipShared(item.id);

                fragment.appendChild(clone);
            });
            list.appendChild(fragment);
        }
    }

    mergeShared(id) {
        const pendingContact = this.app.contacts.find(c => c.id === id);
        if (!pendingContact || !pendingContact.matchedId) return;

        const originalContact = this.app.contacts.find(c => c.id === pendingContact.matchedId);
        if (!originalContact) {
            this.importSingleShared(id);
            return;
        }

        const tagInput = document.getElementById(`tag-item-${id}`);
        const userTagValue = tagInput ? tagInput.value.trim() : null;

        // Detect conflicts
        const conflicts = [];
        const check = (field, label, formatFn) => {
            const val1 = originalContact[field];
            const val2 = pendingContact[field];
            if (val1 && val2 && val1 !== val2) {
                // If phone, check normalization
                if (field === 'phone' && this.app.normalizePhone(val1) === this.app.normalizePhone(val2)) return;

                conflicts.push({ field, label, original: val1, shared: val2, format: formatFn });
            }
        };

        check('phone', 'Phone', (v) => this.formatPhone(v));
        check('email', 'Email', (v) => v);
        check('birthday', 'Birthday', (v) => v);
        check('anniversary', 'Anniversary', (v) => v);

        if (conflicts.length > 0) {
            this.showMergeConflict(originalContact, pendingContact, conflicts, userTagValue);
        } else {
            // No conflicts, auto-merge missing fields and finish
            this.finishMerge(originalContact, pendingContact, {}, userTagValue);
        }
    }

    showMergeConflict(original, shared, conflicts, userTag) {
        const body = document.getElementById('merge-conflict-body');
        const overlay = document.getElementById('merge-conflict-overlay');
        const confirmBtn = document.getElementById('confirm-merge-btn');

        body.innerHTML = `
            <p style="margin-bottom: 16px; font-size: 0.9rem;">Information for <strong>${original.name}</strong> differs from the shared version. Which would you like to keep?</p>
            <div class="conflict-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
        `;

        const conflictList = body.querySelector('.conflict-list');
        const tmpl = document.getElementById('tmpl-conflict-item');

        if (tmpl) {
            const fragment = document.createDocumentFragment();
            conflicts.forEach(c => {
                const clone = tmpl.content.cloneNode(true);
                clone.querySelector('.conflict-field-label').textContent = c.label;

                const radios = clone.querySelectorAll('input[type="radio"]');
                radios.forEach(r => r.name = `conflict-${c.field}`);

                clone.querySelector('.co-val-original').textContent = c.format(c.original);
                clone.querySelector('.co-val-shared').textContent = c.format(c.shared);

                fragment.appendChild(clone);
            });
            conflictList.appendChild(fragment);
        }

        confirmBtn.onclick = () => {
            const choices = {};
            conflicts.forEach(c => {
                const choice = document.querySelector(`input[name="conflict-${c.field}"]:checked`).value;
                choices[c.field] = choice === 'original' ? c.original : c.shared;
            });
            this.finishMerge(original, shared, choices, userTag);
            overlay.classList.add('hidden');
            this._checkOverlayStack();
        };

        overlay.classList.remove('hidden');
        document.body.classList.add('overlay-open');
    }

    finishMerge(original, shared, choices, userTag) {
        // 1. Apply choices OR defaults
        const fields = ['phone', 'email', 'birthday', 'anniversary'];
        fields.forEach(f => {
            if (choices[f]) {
                original[f] = choices[f];
            } else if (!original[f] && shared[f]) {
                original[f] = shared[f];
            }
        });

        // 2. Merge tags
        let tags = original.tags || [];
        if (!tags.includes('&shared')) tags.push('&shared');

        if (userTag) {
            const prefix = userTag.startsWith('@') || userTag.startsWith('#') || userTag.startsWith('&') || userTag.startsWith('!') ? '' : '@';
            const formattedTag = prefix + userTag;
            if (!tags.includes(formattedTag)) tags.push(formattedTag);
        }
        original.tags = [...new Set(tags)];

        // 3. Delete the pending record
        this.app.deleteContact(shared.id);

        this.app.saveState();
        this.app.refreshSuggestions();
        this.renderShareReviewList();
        this.render();
        this.showToast(`Merged details into ${original.name}`);
    }

    importSingleShared(id) {
        const contact = this.app.contacts.find(c => c.id === id);
        if (!contact) return;

        const tagInput = document.getElementById(`tag-item-${id}`);
        const userTag = tagInput ? tagInput.value.trim() : '@received';

        // Update tags: remove &share and &duplicate, add &shared and the user-specified group tag
        let tags = (contact.tags || []).filter(t => t !== '&share' && t !== '&duplicate');
        tags.push('&shared');

        if (userTag) {
            // Remove old batch tag if present
            const oldBatch = tags.find(t => t.startsWith('@'));
            if (oldBatch) tags = tags.filter(t => t !== oldBatch);

            const prefix = userTag.startsWith('@') || userTag.startsWith('#') || userTag.startsWith('&') || userTag.startsWith('!') ? '' : '@';
            tags.push(prefix + userTag);
        }

        contact.tags = [...new Set(tags)]; // Unique
        this.app.saveState();
        this.app.refreshSuggestions();
        this.renderShareReviewList();
        this.render(); // Update counts and nudges
    }

    skipShared(id) {
        if (confirm("Skip this person? They will be removed from the pending review list.")) {
            this.app.deleteContact(id);
            this.renderShareReviewList();
            this.render();
        }
    }

    handleShareGroupChange() {
        const select = document.getElementById('share-group-select');
        const preview = document.getElementById('share-group-preview');
        const namesEl = document.getElementById('share-group-names');
        if (!select || !preview || !namesEl) return;

        const val = select.value;
        if (val === 'none') {
            preview.classList.add('hidden');
            return;
        }

        const groupPeople = this.app.contacts.filter(c => c.tags?.includes(val));
        const names = groupPeople.map(p => p.name).join(', ');

        namesEl.textContent = names || 'No one in this group yet.';
        preview.classList.remove('hidden');
    }

    applyBulkTag() {
        const val = document.getElementById('bulk-share-tag')?.value.trim();
        if (!val) return;

        const inputs = document.querySelectorAll('.share-tag-input');
        inputs.forEach(input => {
            input.value = val;
        });
    }

    bulkImportSelected() {
        const pending = this.app.contacts.filter(c => c.tags?.includes('&share'));
        pending.forEach(c => {
            this.importSingleShared(c.id);
        });

        setTimeout(() => {
            this.els.shareReviewOverlay.classList.add('hidden');
            this._checkOverlayStack();
        }, 300);
    }

    setupEasterEgg() {
        const trigger = document.getElementById('easter-egg-trigger');
        if (trigger) {
            trigger.addEventListener('click', () => {
                this.showToast("Thanks Mike! ❤️", 3000);
            });
        }
    }
}
