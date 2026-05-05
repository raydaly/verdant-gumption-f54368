# Greatuncle Tag Protocol (Developer Reference)

Greatuncle uses a **flat string-based state engine**. The `t` array in each contact record stores both human-created groups and machine-created state markers.

To prevent collisions, we use a strict **Prefix Namespace** system.

---

## 1. The Namespaces

| Prefix | Name | Authority | Purpose |
| :--- | :--- | :--- | :--- |
| **`@`** | Circles | User / Shared | Group membership (e.g., `@family`, `@college`). Shared across devices. |
| **`#`** | Topics | User | Personal metadata or traits (e.g., `#parent`, `#expert`). Shared across devices. |
| **`&`** | **System** | **Local App ONLY** | Internal state markers. **STRICTLY STRIPPED** on import/export to prevent privilege escalation. |
| **`!`** | Actions | User | Ephemeral task markers (Planned for future release). |

---

## 2. System Tags (`&`)

These tags are managed by the app engine and should never be manually edited by users.

### Lifecycle: Identity & Stewardship
*   **`&owner`**: Identifies the record of the primary user on this device. Unlocks "Owner Mode" features.
*   **`&steward.[group]`**: Marks the user as a trusted steward for a specific circle. Grants authority to correct shared data.
*   **`&blocked-steward.[id]`**: Local override to revoke trust from a specific remote steward.

### Lifecycle: State & Sync
*   **`&dirty`**: Added to any record modified locally. Triggers the "Backup Needed" nudge in the Horizon Bar.
*   **`&share`**: Marks a contact that has been parsed from an incoming link but not yet accepted into the main circle. These contacts appear in the **Review** queue.
*   **`&duplicate`**: Added by the matching logic when an incoming record likely matches an existing one.

### Lifecycle: Intimacy Levels (Dunbar)
Every active contact should ideally have exactly one level tag.
*   **`&level5`**: Inner Circle (Weekly touchpoints).
*   **`&level15`**: Monthly touchpoints.
*   **`&level50`**: Quarterly touchpoints (The default for new imports).
*   **`&level150`**: Annual touchpoints (The Horizon).

---

## 3. Developer Implementation

**NEVER use raw string literals for system tags.** 

Always import the `TAGS` constant from `src/core/constants.js`:

```javascript
import { TAGS } from '../core/constants.js';

// GOOD
if (contact.t.includes(TAGS.SYSTEM.OWNER)) { ... }

// BAD
if (contact.t.includes('&owner')) { ... }
```

### Ingestion Security
The `sanitizeContact(c, isImport=true)` function in `sanitizer.js` is the primary firewall. It enforces the **Local Authority Only** policy by stripping any tag starting with `&` from incoming payloads.
