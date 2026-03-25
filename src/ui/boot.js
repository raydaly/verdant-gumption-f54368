import { openDB } from '../storage/db.js';
import { getOwner, getAllContacts, saveContact } from '../storage/contacts.js';
import { setPendingImportNudge } from '../storage/settings.js';
import { decodeShareParam, ingestContacts } from '../core/seedling.js';

async function parseAndWriteImport(db, params) {
  const inviteRaw = params.get('invite');
  const groupRaw = params.get('importGroup');

  if (!inviteRaw && !groupRaw) return false;

  const existingContacts = await getAllContacts(db);
  const queue = [];

  const addPayload = (raw) => {
    if (!raw) return;
    const payload = decodeShareParam(raw);
    const { contacts } = ingestContacts(payload, existingContacts);
    
    // Stash metadata for a warm welcome screen
    if (payload.senderName || payload.group || payload.contact) {
      sessionStorage.setItem('lastImportMeta', JSON.stringify({
        senderName: payload.senderName || 'Someone',
        recipientName: payload.recipientName || '',
        groupName: payload.group || (payload.contact ? payload.contact.name : ''),
        hasMilestones: !!payload.hasMilestones
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
