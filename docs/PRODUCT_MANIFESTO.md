# Greatuncle: Product Manifesto & UX Specification

## 1. The Core Constraints (The "Antigravity" Guardrails)

To maintain the Greatuncle brand, the following technical constraints are non-negotiable. Every feature build must pass this "friction check":

- **Zero-Auth Architecture**: No sign-up, sign-in, or forgot password flows. The user is identified solely by the possession of a unique, shareable link or key.
- **Local-First Persistence**: Data must be stored on the device. Syncing is peer-to-peer or via manual export/import. No central cloud database should ever hold family PII (Personally Identifiable Information).
- **Zero-Onboarding Friction**: The transition from "Clicking a Link" to "Seeing the Family List" must be under 2 seconds. No "intro carousels" or "tutorial overlays" unless they are contextual and non-blocking.

## 2. The Steward/Guest Dichotomy

The app logic must distinguish between two roles without requiring a login system:

- **The Steward**: Has "Write" access. They are the guardian of the record. They manage the backup/export and "own" the integrity of the data.
- **The Guest**: Has "Read-only" access. They are the beneficiaries of the Steward’s work. They can view, but not alter, the master list.

## 3. UI/UX "Voice" Requirements

The interface should feel like a utility that turned into a heirloom.

- **Typography**: Clear, legible, and warm. Avoid "tech-heavy" or overly modern aesthetics.
- **State Management**: Use the "Steward's Pledge" logic to confirm high-stakes actions (like creating a group or resetting data).
- **Empty States**: When a Steward first opens the app, the UI shouldn't feel "empty"; it should feel "waiting." Use the "How to be a Greatuncle" logic to guide the first entry.

## 4. Feature Implementation Specs (Derived from Marketing)

### The "Aha!" Invite Flow
- **Technical Requirement**: Generate a lightweight, URL-safe payload that carries group metadata so the recipient sees the group name and a few names immediately upon landing.
- **Emotional Goal**: Instant recognition. "Oh, this is my family."

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
