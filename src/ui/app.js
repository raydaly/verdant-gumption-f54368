import { boot } from './boot.js';
import { initRouter, navigate } from './router.js';
import { renderOnboarding } from './onboarding.js';
import { applyTheme } from './settings.js';
import { getSettings } from '../storage/settings.js';
import { updateHorizonBar } from './components/horizon-bar.js';

let appVersion = 'v-app-start';

function initApp(db, startView = 'home', isGallery = false) {
  document.getElementById('tab-bar').removeAttribute('hidden');
  
  if (isGallery) {
    document.querySelector('[data-tab="home"]').style.display = 'none';
    document.querySelector('[data-tab="journal"]').style.display = 'none';
  } else {
    document.querySelector('[data-tab="home"]').style.display = '';
    document.querySelector('[data-tab="journal"]').style.display = '';
  }

  initRouter(db, appVersion);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });

  navigate(startView);
}

document.addEventListener('DOMContentLoaded', async () => {
  const { db, hasOwner, hasNewImports, version, hadParams, hasContacts } = await boot();
  appVersion = version;

  applyTheme((await getSettings(db)).theme);
  
  // Initial status update
  if (db) {
    updateHorizonBar(db);
  }

  const isGallery = !hasOwner && hasContacts;
  let startView = isGallery ? 'people' : 'home';

  if (hasNewImports) {
    startView = 'share-review';
  } else if (hadParams && isGallery) {
    startView = 'people';
  }

  if (!hasOwner && !hasContacts) {
    renderOnboarding(db, () => initApp(db, 'home', false));
    return;
  }

  initApp(db, startView, isGallery);
});
