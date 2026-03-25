# Greatuncle 🌿

**Greatuncle** is a human-scaled, local-first address book designed to help you stay connected with the people who matter most. It uses "smart reminders" and Dunbar-inspired levels to ensure your most important relationships never drift.

---

## 🌱 The Owner's Journey: From Belonging to Sustaining
Becoming an owner of your data is not a one-size-fits-all obligation. Greatuncle is designed to meet you exactly where you are in your social lifecycle, scaling from a quiet, private directory to a proactive generosity engine.

### For the Keeper (The Living Record)
Most people start here. Someone who loves you shares a link, and you open it to find a pre-populated record of the people who matter. You realize you belong to something bigger. If you only ever use Greatuncle to hold one or two groups—like a family, neighbors, or cousins—it remains a quiet, private spot. It ensures you never miss a birthday or anniversary, but it never demands your attention. The app doesn't ask you to be perfect; it just asks you to show up a little.

### For the Architect (Feeding the Roots)
As your world expands and friends scatter, you may realize a quiet truth: *relationships don't die, they just stop being fed.* If you are ready to step up, you can turn on Greatuncle's engine to actively manage up to 150 people across multiple circles.

- **Prevent the Drift**: Receive 1–3 daily suggestions to reach out to people before they become strangers.
- **Honor Your Circles**: Organize your people into intimate and wider rings based on how often they need a touchpoint.
- **Become the Source**: Create new groups and share them as a "First Gift" to others, passing on the legacy of connection.

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
1. **Privacy First**: All data lives strictly in your browser (IndexedDB). No cloud, no tracking, and no central database.
2. **Local-First**: The app is a PWA (Progressive Web App) that works offline and survives entirely as a "Digital Seedling" backup file.
3. **The Stewardship Ritual**: To unlock editing (adding people, changing names), a guest must perform a backup. This transition from "Viewing" to "Downloading" is how a Guest becomes an Owner.
4. **Zero-Permission**: No passwords, no accounts, and no "Log in with Google." You are the sole keeper of your data.

---

## 📁 Data Resiliency & Portability (Seedling Format)
Greatuncle is built for portability. The internal data structure and backup format (Seedling) are intentionally human-readable to ensure your community data is never trapped in a proprietary black box. 

To keep performance high and share URLs as short as possible, the contact schema uses the following abbreviated field names:

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

> [!NOTE] 
> **Automatic Migration**: If you are returning from an older version of Greatuncle, your data will be automatically migrated to this new optimized schema upon your first visit to ensure your share links and backups stay lean.

### Intimacy Layers (Dunbar Levels)
- `&level5`: Your Inner Circle (Daily/Weekly).
- `&level15`: Monthly touchpoints.
- `&level50`: Quarterly touchpoints (Dinner Party Friends).
- `&level150`: Annual touchpoints (Active Horizon).

---

## 📂 Project Structure
- `index.html`: The main entry point and "Glass Box" UI.
- `src/ui/`: All view-rendering logic (Home, People, Backup, etc.).
- `src/core/`: The "Engine" for social rotation, levels, and contact ingestion.
- `src/storage/`: IndexedDB wrappers for contacts, logs, and settings.
- `archive/`: Legacy specs and philosophy documents for historical reference.

---
*Version: v41 (Current)*
