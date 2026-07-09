# Greatuncle: Product Manifesto & UX Specification

## 0. Core Identity — The Four Rings

**Greatuncle is a generosity engine: one person runs it, and its value radiates outward to people who may never touch the app.** The Engine (proactive outreach suggestions) is the core identity; the Keeper (shared address book + milestone calendar) is the front door. Most people first meet Greatuncle not as software but as **correspondence** — a newsletter or group link from their family's greatuncle, with the circle pre-populated as a gift.

Value radiates through four rings: the **Steward** (runs the Engine, daily), the **Keepers** (hold the shared circle, occasionally), the **Readers** (receive the newsletter, maybe never install), and the **Beneficiaries** (never touch the app — they just get more calls and remembered birthdays). Everything in rings 2–4 exists because one person in ring 1 runs the engine.

Full reasoning, the feature test, and what this identity is *not*: see [CORE_IDENTITY.md](CORE_IDENTITY.md). Every feature below must name the ring it serves.

## 1. The Core Constraints (The "Antigravity" Guardrails)

To maintain the Greatuncle brand, the following technical constraints are non-negotiable. Every feature build must pass this "friction check":

- **Zero-Auth Architecture**: No sign-up, sign-in, or forgot password flows. The user is identified solely by the possession of a unique, shareable link or key.
- **Local-First Persistence**: Data must be stored on the device. Syncing is peer-to-peer or via manual export/import. No central cloud database should ever hold family PII (Personally Identifiable Information).
- **Server-Log Protection (Antigravity)**: Sharing links must use **URL Fragments (`#`)** rather than query strings (`?`). Fragments are handled entirely client-side and are never sent to the hosting server, ensuring that family PII never touches a server log.
- **Zero-Onboarding Friction**: The transition from "Clicking a Link" to "Seeing the Family List" must be under 2 seconds. No "intro carousels" or "tutorial overlays."

## 2. The Steward/Guest Dichotomy

The app logic must distinguish between two roles without requiring a login system. These are the in-app faces of rings 1 and 2 (see Core Identity above):

- **The Steward** (ring 1): Has "Write" access. They are the guardian of the record. They manage the backup/export and "own" the integrity of the data. Their attention is the scarcest resource in the system — design for them first.
- **The Guest** (ring 2, a Keeper): Has "Read-only" access. They are the beneficiaries of the Steward's work. They can view, but not alter, the master list. A Guest becomes a Steward of their own circle via the Stewardship Ritual (saving a backup) — this graduation is the growth loop.

## 3. UI/UX "Voice" Requirements

The interface should feel like a utility that turned into a heirloom.

- **Typography**: Clear, legible, and warm. Avoid "tech-heavy" or overly modern aesthetics.
- **State Management**: Use the "Steward's Pledge" logic to confirm high-stakes actions (like creating a group or resetting data).
- **Empty States**: The app must be **Adaptive**. When a Steward first opens the app, advanced features (Complete Backup, Share your circle) are hidden to reduce cognitive load. The UI should focus entirely on the "Universal Doorway"—inviting the user to bring their people in via a link, a backup, or an AI-assisted import.
- **Vocabulary**: One term per concept, everywhere — "backup"/"Seedling" (never Vault), "Share your circle" (never Bridge/Gift/Source), "Owner"/"Steward" (never Architect), "connection" as the logging noun (never interaction). Internal level tag numbers (15/50/150) never appear in the UI; tiers display as the frequency word plus display capacity (e.g. "Monthly · 10").

## 4. Feature Implementation Specs (Derived from Marketing)

### The "Aha!" Invite Flow
- **Technical Requirement**:
  - **Payload Design**: Use **DEFLATE compression** to pack 100+ contacts into a single URL-safe Base64 code within a `#` fragment.
  - **The Zero-Strand Philosophy (Universal Doorway)**: If a link is mangled or truncated by a messaging app, the app must provide a "Repair" mechanism (a universal text input) that can extract Greatuncle data from raw text, JSON blocks, or delimited messages.
- **Emotional Goal**: Instant recognition and total resilience. "It just works, even if I copy-paste it wrong."

### The "Legacy" Backup
- **Technical Requirement**: A simple, one-click export to a standard format (JSON or CSV) that is human-readable.
- **Emotional Goal**: Security through ownership. The user feels they "own" the book, not that they are "renting" it from a service.

### The "Smart Hashtag" System & Overlap Matrix
- **Technical Requirement**:
  - Implement additive tagging (array of strings) instead of folders.
  - Support "AND" and "OR" logic for filtering.
  - **Roadmap Feature**: An "@groups report" that generates a matrix showing how many contacts are shared between specific tags.
  - **Roadmap Feature**: Visual Venn diagram representation of the top 3 most active tags.
- **Emotional Goal**: Flexibility. Acknowledging that family members exist in multiple contexts (e.g., #smithfamily and #cousins).

### The Birthday "Nudge"
- **Technical Requirement**: Local notifications that don't rely on a server-side cron job.
- **Emotional Goal**: Ritual. Moving the user from "app user" to "thoughtful relative."

## 5. Success Metrics (Qualitative)

We aren't tracking "Daily Active Users" or "Engagement Time." Our success metrics are:

- **Time to First Connection**: How fast can a Steward get a link to a Guest?
- **Steward Retention**: Does the Steward feel a sense of pride and ease in maintaining the list?
- **Data Integrity**: Is the "Source of Truth" consistently accurate and accessible across the group?
