import { openDB } from '../storage/db.js';
import { getOwner, getAllContacts, saveContact } from '../storage/contacts.js';
import { setPendingImportNudge } from '../storage/settings.js';
import { decodeShareParam, ingestContacts } from '../core/seedling.js';
import { normalizePhone } from '../core/sanitizer.js';

async function parseAndWriteImport(db, params) {
  const inviteRaw = params.get('invite');
  const groupRaw = params.get('importGroup');

  if (!inviteRaw && !groupRaw) return false;

  const existingContacts = await getAllContacts(db);
  const isFreshInstall = existingContacts.length === 0;
  const queue = [];

  const payloads = [];

  const addPayload = (raw) => {
    if (!raw) return;
    const payload = decodeShareParam(raw);
    if (!payload) return;
    payloads.push(payload);
    
    const { contacts } = ingestContacts(payload, existingContacts, isFreshInstall);
    
    // Stash metadata for a warm welcome screen
    if (payload.sn || payload.g || payload.c) {
      const contacts = Array.isArray(payload.c) ? payload.c : (payload.c ? [payload.c] : []);
      const firstContactName = contacts.length > 0 ? contacts[0].n : 'Someone';
      const containsMilestones = contacts.some(c => c.bd || c.av || c.dp);

      sessionStorage.setItem('lastImportMeta', JSON.stringify({
        senderName: payload.sn || 'Someone',
        recipientName: payload.rn || '',
        groupName: payload.g || (contacts.length > 1 ? `${firstContactName}'s Group` : firstContactName),
        hasMilestones: !!(payload.hm || containsMilestones)
      }));
    }

    queue.push(...contacts);
  };

  addPayload(inviteRaw);
  addPayload(groupRaw);

  if (queue.length === 0) {
    history.replaceState(null, '', window.location.pathname);
    return false;
  }

  for (const record of queue) {
    await saveContact(db, record);
  }

  // --- Phase 1: Stewardship Handshake ---
  // After saving, check if any payload carried a steward volunteer flag.
  // If so, find the sender in our local DB and tag them as a steward for the group.
  const allAfterSave = await getAllContacts(db);
  for (const payload of payloads) {
    if (!payload.sv || !payload.g) continue;  // Only process volunteer payloads
    const groupName = payload.g.replace(/^@/, '');  // "@family" -> "family"
    const stewardTag = `&steward.${groupName}`;
    const tombstoneTag = `&blocked-steward.${groupName}`;

    // Find sender in local DB by phone or email
    const sender = allAfterSave.find(c => {
      const tags = c.t || [];
      if (tags.includes(tombstoneTag)) return false; // Respect explicit opt-out
      if (payload.sp) {
        const sp = payload.sp.replace(/\D/g, '');
        const cp = (c.ph || '').replace(/\D/g, '');
        if (sp && cp && sp === cp) return true;
      }
      if (payload.se && c.em && payload.se.toLowerCase() === c.em.toLowerCase()) return true;
      if (payload.sn && c.n && payload.sn.toLowerCase() === c.n.toLowerCase()) return true;
      return false;
    });

    if (sender && !(sender.t || []).includes(stewardTag)) {
      const updatedTags = [...(sender.t || []), stewardTag];
      await saveContact(db, { ...sender, t: updatedTags, ua: Date.now() });
      console.log(`Greatuncle: Tagged ${sender.n} as ${stewardTag}`);
    }
  }

  setPendingImportNudge(true);
  history.replaceState(null, '', window.location.pathname);
  return true;
}

export async function boot() {
  const db = await openDB();

  const params = new URLSearchParams(window.location.search);
  const hasUrlParams = params.has('invite') || params.has('importGroup');

  let hasNewImports = false;
  if (hasUrlParams) {
    hasNewImports = await parseAndWriteImport(db, params);
  }

  const owner = await getOwner(db);
  
  let version = 'v-boot-start';
  try {
    const res = await fetch('/manifest.json?cb=' + Date.now());
    if (res.ok) {
      const manifest = await res.json();
      version = manifest.version || 'v-missing';
      console.log('Manifest version:', version);
    } else {
      console.warn('Manifest fetch failed:', res.status);
      version = 'v-res-' + res.status;
    }
  } catch (err) {
    console.error('Manifest error:', err);
    version = 'v-err';
  }

  const allContacts = await getAllContacts(db);
  const hasContacts = allContacts.length > 0;
  return { db, hasOwner: !!owner, hasNewImports, version, hadParams: hasUrlParams, hasContacts };
}
