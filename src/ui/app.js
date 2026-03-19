import { boot } from './boot.js';
import { initRouter, navigate } from './router.js';
import { renderOnboarding } from './onboarding.js';
import { applyTheme } from './settings.js';
import { getSettings } from '../storage/settings.js';

function initApp(db, startView = 'home') {
  document.getElementById('tab-bar').removeAttribute('hidden');
  initRouter(db);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });

  navigate(startView);
}

document.addEventListener('DOMContentLoaded', async () => {
  const { db, hasOwner, hasNewImports } = await boot();

  applyTheme((await getSettings(db)).theme);

  if (!hasOwner) {
    renderOnboarding(db, () => initApp(db, hasNewImports ? 'share-review' : 'home'));
    return;
  }

  initApp(db, hasNewImports ? 'share-review' : 'home');
});
