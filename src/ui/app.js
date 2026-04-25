import { boot } from './boot.js';
import { initRouter, navigate } from './router.js';
import { renderOnboarding } from './onboarding.js';
import { applyTheme } from './settings.js';
import { getSettings } from '../storage/settings.js';
import { getAllContacts, saveContact } from '../storage/contacts.js';
import { updateHorizonBar } from './components/horizon-bar.js';
import { parseAnyInput, IMPORT_TYPE } from '../core/parser.js';

let appVersion = 'v-app-start';

// ─── Clipboard Magic (Phase 3) ─────────────────────────────────────────────

let lastClipboardHash = null; // Prevent showing the same nudge twice

function showClipboardNudge() {
  // Remove any existing nudge
  document.getElementById('gu-clipboard-nudge')?.remove();

  const nudge = document.createElement('div');
  nudge.id = 'gu-clipboard-nudge';
  nudge.style.cssText = [
    'position:fixed', 'bottom:5rem', 'left:50%', 'transform:translateX(-50%)',
    'background:var(--color-bg-card,#1e1e2e)', 'color:var(--color-text,#fff)',
    'border:1px solid var(--color-bg-accent,#333)', 'border-radius:14px',
    'padding:0.75rem 1rem', 'box-shadow:0 4px 24px rgba(0,0,0,0.3)',
    'display:flex', 'align-items:center', 'gap:0.75rem',
    'font-size:0.9rem', 'z-index:9999', 'max-width:90vw',
    'animation:gu-slide-up 0.3s ease',
  ].join(';');

  const msg = document.createElement('span');
  msg.textContent = '\uD83D\uDCCB Greatuncle link detected in clipboard';

  const btn = document.createElement('button');
  btn.textContent = 'Review Import';
  btn.style.cssText = 'background:var(--color-primary,#7c6af7);color:#fff;border:none;border-radius:8px;padding:0.4rem 0.75rem;cursor:pointer;font-size:0.85rem;white-space:nowrap;';
  btn.onclick = () => { navigate('trunk'); nudge.remove(); };

  const dismiss = document.createElement('button');
  dismiss.textContent = '✕';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.style.cssText = 'background:transparent;border:none;color:var(--color-text-muted,#888);cursor:pointer;font-size:1rem;padding:0;';
  dismiss.onclick = () => nudge.remove();

  nudge.appendChild(msg);
  nudge.appendChild(btn);
  nudge.appendChild(dismiss);
  document.body.appendChild(nudge);

  // Auto-dismiss after 8 seconds
  setTimeout(() => nudge.remove(), 8000);
}

async function checkClipboardForInvite() {
  // Clipboard API requires the document to be focused and permission to be granted
  if (!navigator.clipboard?.readText) return;
  if (document.visibilityState !== 'visible') return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text || text.length < 20) return;

    // Cheap hash: first 50 chars. Avoids re-showing for the same content.
    const hash = text.slice(0, 50);
    if (hash === lastClipboardHash) return;

    const result = await parseAnyInput(text);
    if (result.type === IMPORT_TYPE.INVITE || result.type === IMPORT_TYPE.FULL_BACKUP) {
      lastClipboardHash = hash;
      showClipboardNudge();
    }
  } catch {
    // Permission denied or clipboard unavailable — fail silently
  }
}

function initClipboardMonitor() {
  // Check when the user returns to this tab (cross-device Universal Clipboard scenario)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Small delay to let the browser settle after tab switch
      setTimeout(checkClipboardForInvite, 500);
    }
  });
}

// ─── Keyframe for nudge animation ──────────────────────────────────────────
const nudgeStyle = document.createElement('style');
nudgeStyle.textContent = `
  @keyframes gu-slide-up {
    from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(nudgeStyle);

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
  const app = document.getElementById('app');
  
  try {
    const { db, hasOwner, hasNewImports, version, hadParams, hasContacts, redirectToRepair } = await boot();
    appVersion = version;

    applyTheme((await getSettings(db)).theme);
    
    // Initial status update
    if (db) {
      updateHorizonBar(db);
    }

    // If boot detected a mangled link, take the user straight to the Backup/Import page
    if (redirectToRepair) {
      initApp(db, 'trunk', !hasOwner && hasContacts);
      // Show a repair banner after a brief delay so the page has rendered
      setTimeout(() => {
        const repairBanner = document.createElement('div');
        repairBanner.style.cssText = 'margin:0.75rem 1rem;padding:0.75rem 1rem;background:#fffbeb;border:1px solid #f59e0b;border-radius:10px;font-size:0.9rem;color:#92400e;';
        repairBanner.innerHTML = '<strong>\u26A0\uFE0F Your invite link looks like it was cut off.</strong> Copy the full message and paste it in the box below to import your circle.';
        const content = document.querySelector('.view-content');
        if (content) content.prepend(repairBanner);
      }, 300);
      initClipboardMonitor();
      return;
    }

    const isGallery = !hasOwner && hasContacts;
    let startView = isGallery ? 'people' : 'home';

    // Option H: No owner but have contacts (either just imported or from a previous attempt)
    // We force them into Onboarding to "Claim their seat"
    if (!hasOwner && hasContacts && !redirectToRepair) {
      // Clear hash immediately if it's still there to prevent re-imports
      if (hadParams) {
        history.replaceState(null, '', window.location.pathname);
      }
      
      const autoAcceptAndLaunch = async () => {
        // Auto-accept all pending imports (strip &share so they become full circle members)
        const all = await getAllContacts(db);
        let acceptedAny = false;
        for (const c of all) {
          if ((c.t || []).includes('&share')) {
            const newTags = c.t.filter(t => t !== '&share' && t !== '&dirty');
            newTags.push('&dirty');
            await saveContact(db, { ...c, t: newTags, ua: Date.now() });
            acceptedAny = true;
          }
        }
        // If we just accepted people, land on the people page
        initApp(db, 'people', false);
        initClipboardMonitor();
      };
      renderOnboarding(db, autoAcceptAndLaunch);
      return;
    }

    if (hasNewImports) {
      startView = 'share-review';
    } else if (hadParams && isGallery) {
      startView = 'people';
    }
    
    if (!hasOwner && !hasContacts && !redirectToRepair) {
      renderOnboarding(db, () => initApp(db, 'home', false));
      return;
    }

    initApp(db, startView, isGallery);
    initClipboardMonitor();

    // Clear the URL hash after a delay to ensure it's been processed and the app is stable
    if (hadParams) {
      setTimeout(() => {
        history.replaceState(null, '', window.location.pathname);
      }, 2000);
    }
  } catch (err) {
    console.error('CRITICAL BOOT ERROR:', err);
    if (app) {
      app.innerHTML = `
        <div style="padding: 2rem; color: #b91c1c; font-family: sans-serif;">
          <h2 style="margin-top: 0;">App failed to start</h2>
          <pre style="background: #fee2e2; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.8rem;">${err.stack || err.message || err}</pre>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem;">Retry</button>
        </div>
      `;
    }
  }
});
