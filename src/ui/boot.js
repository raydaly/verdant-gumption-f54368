import { openDB } from '../storage/db.js';
import { getOwner, getAllContacts, saveContact, saveContactsBatch } from '../storage/contacts.js';
import { setPendingImportNudge } from '../storage/settings.js';
import { decodeShareParam, ingestContacts } from '../core/seedling.js';
import { parseHashForInvite, isHashMangled } from '../core/parser.js';
import { normalizePhone } from '../core/sanitizer.js';

async function parseAndWriteImport(db, params, hashParam) {
  // Prefer hash fragment (secure, not logged by server) over query string (legacy)
  const inviteRaw = hashParam?.paramName === 'invite' ? hashParam.encoded : params.get('invite');
  const groupRaw = hashParam?.paramName === 'importGroup' ? hashParam.encoded : params.get('importGroup');

  if (!inviteRaw && !groupRaw) return false;

  const existingContacts = await getAllContacts(db);
  const isFreshInstall = existingContacts.length === 0;
  const queue = [];

  const payloads = [];

  const addPayload = async (raw) => {
    if (!raw) return;
    const payload = await decodeShareParam(raw);
    if (!payload) return;
    payloads.push(payload);
    
    const { contacts } = ingestContacts(payload, existingContacts, isFreshInstall);
    
    // Stash metadata for a warm welcome screen
    if (payload.sn || payload.g || payload.c) {
      const rawContacts = Array.isArray(payload.c) ? payload.c : (payload.c ? [payload.c] : []);
      const firstContactName = rawContacts.length > 0 ? rawContacts[0].n : 'Someone';
      const containsMilestones = rawContacts.some(c => c.bd || c.av || c.dp);

      sessionStorage.setItem('lastImportMeta', JSON.stringify({
        senderName: payload.sn || 'Someone',
        recipientName: payload.rn || '',
        groupName: payload.g || (rawContacts.length > 1 ? `${firstContactName}'s Group` : firstContactName),
        hasMilestones: !!(payload.hm || containsMilestones)
      }));
    }

    queue.push(...contacts);
  };

  await addPayload(inviteRaw);
  await addPayload(groupRaw);

  if (queue.length === 0) {
    return false;
  }

  await saveContactsBatch(db, queue);

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
  return true;
}

export async function boot() {
  const db = await openDB();

  // Check for mangled hash first — before attempting to parse
  const mangledHash = isHashMangled();
  if (mangledHash) {
    // Don't attempt import; signal the app to show the Repair screen
    const owner = await getOwner(db);
    const allContacts = await getAllContacts(db);
    return { db, hasOwner: !!owner, hasNewImports: false, redirectToRepair: true, version: 'v-boot-repair', hadParams: true, hasContacts: allContacts.length > 0 };
  }

  // Try hash fragment first (new secure format), then query string (legacy)
  const hashParam = parseHashForInvite();
  const params = new URLSearchParams(window.location.search);
  console.log('Greatuncle Boot: Checking for params...', { hash: window.location.hash, hashParam, hasQueryInvite: params.has('invite') });
  const hasUrlParams = !!(hashParam) || params.has('invite') || params.has('importGroup');

  let hasNewImports = false;
  if (hasUrlParams) {
    hasNewImports = await parseAndWriteImport(db, params, hashParam);
    // Clear both the hash and query string to prevent re-importing on refresh
    if (hasNewImports) {
      // We used to clear the hash here, but now we wait until app.js ensures stability
    }
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
