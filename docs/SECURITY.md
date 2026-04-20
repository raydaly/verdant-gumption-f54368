# Greatuncle Security Model

> "Your data is a sacred trust, not a product."

Greatuncle is built on a philosophy we call **Antigravity**: private family data should never touch the ground. It belongs where it lives — *on the devices of the people who care about each other.*

This document explains the specific technical decisions we have made to honour that promise.

---

## 1. The Server Log Vulnerability (and why we use `#`)

### The Problem
In a standard web application, when a user clicks a link like:

```
https://greatuncle.app/?invite=eJxVj...
```

The entire URL — including the `?invite=` data — is sent to the hosting server as part of the HTTP request. Every major web host (Netlify, GitHub Pages, Vercel, Nginx) logs this by default. If a bad actor gained access to those server logs, they would have access to the names, emails, phone numbers, and birthdays of every family that has ever shared a Greatuncle link.

For a family address book, this could represent a massive PII (Personally Identifiable Information) leak, hidden in plain sight.

### The Fix: URL Fragments (`#`)
Browsers have a built-in protection mechanism called the **URL Fragment** — the part of a URL after the `#` symbol.

**A critical property of fragments: they are never sent to the server.**

The browser handles them entirely in client-side memory. When a user clicks:

```
https://greatuncle.app/#invite=eJxVj...
```

The hosting server only ever sees a request for `index.html`. The `#invite=...` data is processed entirely within the user's own browser.

### Our Implementation
All Greatuncle sharing links use the `#` fragment format. Legacy `?` links (from before this fix) remain backward-compatible for existing family threads.

---

## 2. DEFLATE Compression for Large Families

### The Problem
A family circle of 100 people, encoded as raw JSON and Base64, can produce a URL several thousand characters long. Many messaging apps (SMS, WhatsApp, email clients) silently truncate URLs beyond ~2,000 characters, causing a "silent failure" where the recipient clicks perfectly good link — but only gets partial data.

### The Fix: Native Browser Compression
We use the browser's native **`CompressionStream` API** (DEFLATE algorithm) to compress the contact payload before encoding it as a URL-safe Base64 string.

The pipeline is:
```
JSON payload → CompressionStream (DEFLATE) → Base64URL → URL Fragment
```

For typical address book data (which contains a lot of repeated patterns like city names, area codes, and tags), DEFLATE achieves ~80–90% compression. A 15,000-character JSON payload becomes ~2,000 characters — comfortably within the safe URL limit.

**Browser Support**: `CompressionStream` is available in Chrome 80+, Safari 15.4+, Firefox 113+. No external libraries are required.

---

## 3. The Universal Doorway (Resilient Import)

### The Problem
Even with compression, extreme edge cases exist: very large families, older devices, or messaging apps with aggressive truncation limits. A truncated link produces a corrupted Base64 string that fails to decode — leaving the recipient with a broken experience.

### The Fix: The "Repair" Mechanic
Sharing messages are wrapped in visual delimiters:

```
--- START GREATUNCLE LINK ---
https://greatuncle.app/#invite=eJxVj...
--- END GREATUNCLE LINK ---
```

If Greatuncle detects a corrupt fragment on load, it automatically redirects the user to the **Universal Import** screen — a single text area that accepts *any* Greatuncle data, regardless of format:

| Input Type | Detection Method | Action |
|---|---|---|
| Full URL (fragment) | Finds `#invite=` or `#importGroup=` | Extracts and decodes |
| Delimited text block | Finds `--- START GREATUNCLE LINK ---` | Extracts URL from block |
| Raw Base64 code | Long string, no `{` prefix | Attempts decode |
| Backup JSON | Starts with `{`, contains `"v":` key | Full restore or merge |
| CSV/VCard | Detected column headers | Redirects to Contact Convertor |

This approach turns a potential "crash" into a "handshake" — the user is never stranded.

---

## 4. What Greatuncle Never Does

| Practice | Greatuncle |
|---|---|
| Central database of contacts | ❌ Never |
| Cloud sync | ❌ Never |
| Ad tracking or analytics | ❌ Never |
| Selling data to third parties | ❌ Never |
| Requiring a login or account | ❌ Never |
| Storing data outside your device | ❌ Never |

Your circle lives in your browser's local `IndexedDB`. You hold the only key. When you save a backup, you are making a copy for yourself — not uploading to a server.

---

## 5. What Data Travels in a Sharing Link

When you share a group or contact, only the following fields are included. Sensitive internal fields are **intentionally omitted**.

| Field | Included? |
|---|---|
| Name (`n`) | ✅ Yes |
| Phone (`ph`) | ✅ Yes |
| Email (`em`) | ✅ Yes |
| Address (`ad`) | ✅ Yes |
| Birthday (`bd`) | ✅ Yes |
| Anniversary (`av`) | ✅ Yes |
| Private Notes (`no`) | ❌ **Never** |
| Interaction History (logs) | ❌ **Never** |
| Internal tags (`&owner`, `&dirty`) | ❌ **Never** |

The code that enforces this is in `src/core/seedling.js`, in the `cleanMember()` function.

---

## 6. Reporting a Security Concern

Greatuncle is an open-source, family-first project. If you identify a security concern, please raise it as a GitHub issue or contact the project directly. We take this seriously.

*Stay rooted. Stay connected.*
