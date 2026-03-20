import { renderPeople } from './people.js';
import { renderContactForm } from './contact-form.js';
import { renderHome } from './home.js';
import { renderJournal } from './journal.js';
import { renderTrunk } from './trunk.js';
import { renderSettings } from './settings.js';
import { renderAbout } from './about.js';
import { renderShareReview } from './share-review.js';
import { renderMilestoneCalendar } from './milestone-calendar.js';

let _db = null;
let _version = 'v-router-start';
const stack = [];

export function initRouter(db, version = 'v?') {
  _db = db;
  _version = version;

  window.addEventListener('popstate', (e) => {
    if (e.state) {
      navigate(e.state.view, e.state.params, true);
    }
  });
}

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
  const app = document.getElementById('app');
  switch (view) {
    case 'home':
      await renderHome(_db, _version);
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
    case 'milestone-calendar':
      await renderMilestoneCalendar(_db);
      break;
    default:
      break;
  }
  updateTabActiveState(view);
  
  if (app) {
    app.classList.remove('view-fade-in');
    void app.offsetWidth; // Trigger reflow
    app.classList.add('view-fade-in');
  }
}

export async function navigate(view, params = {}, isPop = false) {
  if (!isPop) {
    stack.push({ view, params });
    if (!TOP_LEVEL_TABS.has(view)) {
      history.pushState({ view, params }, '');
    }
  }
  await render(view, params);
}

export function goBack() {
  window.history.back();
}

export function getCurrentRoute() {
  return stack[stack.length - 1];
}
