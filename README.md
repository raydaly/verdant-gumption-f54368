# Greatuncle 🌿

**Greatuncle** is a human-scaled, local-first address book designed to help you stay connected with the people who matter most. It uses "smart reminders" and Dunbar-inspired levels to ensure your most important relationships never drift.

---

## 🌱 The Owner's Journey: From Viewing to Sustaining
Becoming an owner of your data is a transition from belonging to building. Greatuncle is designed to meet you exactly where you are in your social lifecycle, scaling from a quiet, private directory to a proactive generosity engine.

### Phase 1: The Guest (Viewing)
Most people start here. Someone who loves you shares a link, and you open it to find a pre-populated record of the people who matter. You realize you belong to something bigger. If you only ever use Greatuncle to hold one or two groups—like a family, neighbors, or cousins—it remains a quiet, private spot in **Guest Mode**. It ensures you never miss a birthday, but it never demands your attention.

### Phase 2: The Owner (Sustaining)
Once you perform the **Stewardship Ritual** (saving a local backup), you transition into **Owner Mode**. You are no longer just a visitor in someone else's list; you are the sovereign keeper of your own data. You can now feed the roots of your world:

- **Active Management**: Turn on the engine to proactively manage up to 150 people across multiple circles.
- **Prevent the Drift**: Receive daily suggestions to reach out to people before they become strangers.
- **Become the Source**: Create your own new groups and share them as a "First Gift" to others, passing on the legacy of connection.

---

## 🧬 The Science of Connection
Each owner will use Greatuncle differently, but underneath this flexibility, the app's design is deeply rooted in years of university research into human social architecture—specifically around the **Rule of Three** and **Dunbar's Number**. This research demonstrates that human relationships naturally scale into distinct, nested layers of intimacy, capping out at a maximum of about 150 stable connections.

By organizing your network into scientifically-backed layers, the app helps you consciously manage your limited social energy. The engine uses four specific target frequencies:

- **Level 5: Your Inner Circle** - These are your closest connections. Because you naturally interact with these people so often, this layer largely takes care of itself, and the app remains quiet.
- **Level 15 (Monthly)**: Your good friends and "Sympathy Group" who need a touchpoint roughly every 30 days.
- **Level 50 (Quarterly)**: Your active community of close friends and neighbors.
- **Level 150 (Annually)**: The outer horizon of your casual but stable relationships that require at least a yearly connection.

By helping you consciously balance these levels, Greatuncle ensures your closest people stay warm and your distant friends stay remembered, all without burning you out.

---

## 🛡️ Core Philosophy
1. **Privacy First**: All data lives strictly in your browser (IndexedDB). No cloud, no tracking.
2. **Local-First**: The app is a PWA (Progressive Web App) that survives entirely as a "Seedling" backup file.
3. **The Stewardship Ritual**: To unlock editing (adding people, changing names), a guest must perform a backup. This transition from **Viewing** to **Sustaining** is how a Guest becomes an **Owner**.
4. **Zero-Permission**: No passwords, no accounts. You are the sole keeper of your data.

---

## 📁 Data Resiliency & Portability (Seedling Format)

Greatuncle is built for portability. The internal data structure and backup format (Seedling) are intentionally human-readable to ensure your community data is never trapped in a proprietary black box. 

You can feed your raw contact data to an AI like Claude or ChatGPT to automatically transform it into this format for easy importing.

> [!TIP]
> **View the full [AI Import Specification](import_spec.md)** for more details on mapping legacy data to Greatuncle's abbreviated JSON format.

### Contact Fields
- `id`: Unique identifier (UUID).
- `n`: Full Display Name.
- `ph`: Phone Number.
- `em`: Email Address.
- `ad`: Physical Address.
- `zp`: Zip / Postal Code.
- `bd`: Birthday (`YYYY-MM-DD` or `MM-DD`).
- `av`: Anniversary (`YYYY-MM-DD` or `MM-DD`).
- `dp`: Date of Passing (`YYYY-MM-DD` or `MM-DD`).
- `t`: Array of Smart Hashtags (`@group`, `#topic`, `&level`, `!action`).
- `no`: Private Notes (up to 1,000 characters).
- `lc`: Last contacted timestamp (Unix ms).
- `su`: Snooze until timestamp (Unix ms).
- `ca` / `ua`: Created at / Updated at timestamps.

### Intimacy Layers (Dunbar Levels)
- `&level5`: Your Inner Circle (Daily/Weekly).
- `&level15`: Monthly touchpoints.
- `&level50`: Quarterly touchpoints (Dinner Party Friends).
- `&level150`: Annual touchpoints (Active Horizon).

---

## 📂 Project Structure
- `src/ui/`: All view-rendering logic (One file per tab).
  - `home.js`: **Home** Dashboard.
  - `people.js`: **People** List & Filters.
  - `journal.js`: **Journal** / Interaction History.
  - `trunk.js`: **Backup** / Sharing Engine.
  - `contact-form.js`, `settings.js`, `milestone-calendar.js`: Sub-views.
- `src/core/`: The "Engine" (Rotation, Levels, Ingestion logic).
- `src/storage/`: IndexedDB wrappers for persistence.
- `archive/`: Legacy specs and philosophy documents.

---
*Version: v43 (Current)*
