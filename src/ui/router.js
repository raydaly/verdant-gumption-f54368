import { renderPeople } from './people.js';
import { renderContactForm } from './contact-form.js';
import { renderHome } from './home.js';
import { renderJournal } from './journal.js';
import { renderTrunk } from './trunk.js';
import { renderSettings } from './settings.js';
import { renderAbout } from './about.js';
import { renderShareReview } from './share-review.js';

let _db = null;
const stack = [];

const TOP_LEVEL_TABS = new Set(['home', 'people', 'journal', 'backup']);

function updateTabActiveState(view) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = TOP_LEVEL_TABS.has(view) && btn.dataset.tab === view;
    btn.classList.toggle('tab-btn--active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
}

async function render(view, params) {
  switch (view) {
    case 'home':
      await renderHome(_db);
      break;
    case 'people':
      await renderPeople(_db);
      break;
    case 'journal':
      await renderJournal(_db, params);
      break;
    case 'backup':
      await renderTrunk(_db);
      break;
    case 'contact-form':
      await renderContactForm(_db, params.contactId);
      break;
    case 'settings':
      await renderSettings(_db);
      break;
    case 'about':
      renderAbout();
      break;
    case 'share-review':
      await renderShareReview(_db);
      break;
    default:
      break;
  }
  updateTabActiveState(view);
  
  // Apply a smooth transition
  app.classList.remove('view-fade-in');
  void app.offsetWidth; // Trigger reflow
  app.classList.add('view-fade-in');
}

export function initRouter(db) {
  _db = db;

  window.addEventListener('popstate', () => {
    if (stack.length > 1) {
      stack.pop();
      const prev = stack[stack.length - 1];
      render(prev.view, prev.params);
    }
  });
}

export async function navigate(view, params = {}) {
  stack.push({ view, params });
  if (!TOP_LEVEL_TABS.has(view)) {
    history.pushState({ view, params }, '');
  }
  await render(view, params);
}

export function goBack() {
  if (stack.length > 1) {
    stack.pop();
    const prev = stack[stack.length - 1];
    render(prev.view, prev.params);
  }
}

export function getCurrentRoute() {
  return stack[stack.length - 1];
}
