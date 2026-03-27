export const APP_CONSTANTS = Object.freeze({
  DB_NAME: 'greatuncle',
  DB_VERSION: 4,
  STORE_CONTACTS: 'contacts',
  STORE_LOGS: 'logs',
  STORE_SETTINGS: 'settings',
  OWNER_TAG: '&owner',
  CACHE_NAME: 'greatuncle-v46',
  STATIC_ASSETS: ['/', '/index.html', '/manifest.json', '/src/core/constants.js', '/src/storage/db.js', '/src/storage/settings.js', '/src/storage/contacts.js', '/src/storage/logs.js', '/src/ui/boot.js', '/src/ui/app.js', '/src/styles/main.css', '/src/ui/router.js', '/src/ui/people.js', '/src/ui/contact-form.js', '/src/ui/components/level-selector.js', '/src/ui/components/tag-input.js', '/src/core/outreach-engine.js', '/src/core/seedling.js', '/src/core/milestone-engine.js', '/src/ui/home.js', '/src/ui/journal.js', '/src/ui/trunk.js', '/src/ui/settings.js', '/src/ui/onboarding.js', '/src/ui/stewardship.js', '/src/ui/milestone-calendar.js', '/src/ui/components/bottom-sheet.js', '/src/ui/components/toast.js', '/src/ui/components/connected-sheet.js', '/src/ui/components/confirm-dialog.js', '/src/ui/about.js'],
  LS_LAST_EXPORTED_AT: 'lastExportedAt',
  LS_DELETED_SINCE_EXPORT: 'deletedSinceExport',
  LS_PENDING_IMPORT_NUDGE: 'pendingImportNudge',
});

export const DEFAULT_SETTINGS = Object.freeze({
  outreachGoal: 0,
  groundedLevel: null,
  theme: 'system',
  dateFormat: 'default', // 'default' (locale-aware), 'mdy', 'dmy', 'ymd'
  showAge: true,
  exportReminderDays: 30,
  eventRadarDays: 30,
  trackLegacy: false,
  skipDays: 7,
  gatheringRules: [],
});
