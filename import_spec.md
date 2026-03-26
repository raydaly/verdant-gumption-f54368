# Greatuncle AI Import Specification (v43)

Use this guide to transform raw contact data (CSV, JSON, or text) into a properly structured JSON file for import into the **Greatuncle** app.

## 1. Top-Level Structure
Greatuncle imports can be either:
- A flat **JSON Array** of contact objects.
- A **Seedling Object** with a `"c"` (contacts) and `"l"` (logs) array.

```json
[
  { "n": "Alice Smith", "t": ["&level15", "@family"] },
  { "n": "Bob Jones", "t": ["&level50", "@college"] }
]
```

## 2. Contact Field Definition (Abbreviated Keys)
Greatuncle uses short keys to keep URLs small and performance high.

| Key | Human Field | Description | Format / Example |
| :--- | :--- | :--- | :--- |
| **`id`** | ID | Unique identifier | UUID or any unique string |
| **`n`** | Name | **Required.** Full display name | `"John Denver"` |
| **`ph`** | Phone | Phone number | `"555-012-3456"` |
| **`em`** | Email | Email address | `"john@example.com"` |
| **`ad`** | Address | Physical street address | `"123 Heritage Lane"` |
| **`zp`** | Zip Code | Postal/Zip code | `"12345"` |
| **`bd`** | Birthday | Birth date | `"YYYY-MM-DD"` or `"MM-DD"` |
| **`av`** | Anniversary | Anniversary date | `"YYYY-MM-DD"` or `"MM-DD"` |
| **`dp`** | Date of Passing | Legacy date for tracking milestones | `"YYYY-MM-DD"` or `"MM-DD"` |
| **`t`** | Tags | **CRITICAL.** Smart Tags array | `["@group", "&level", "#topic"]` |
| **`no`** | Notes | Private contextual notes | Max 1,000 chars |
| **`lc`** | Last Contact | Last interaction timestamp | Unix MS (e.g. `1711456312000`) |
| **`su`** | Snooze | Silence reminders until | Unix MS |
| **`ca`** | Created At | Record creation date | Unix MS |
| **`ua`** | Updated At | Record last edit date | Unix MS |

## 3. The Power of Tags (`t`)
Tags determine how the app treats the person. 

### A. Dunbar Levels (`&level`)
Every contact should ideally have ONE `&level` tag to feed the outreach engine.
- `&level5`: **Inner Circle** (Weekly/Daily).
- `&level15`: **Stable Friends** (Monthly).
- `&level50`: **Active Community** (Quarterly).
- `&level150`: **Outer Horizon** (Annually).

### B. Grouping (`@`)
Use the `@` prefix for contexts or circles (Shared groups).
- Examples: `@family`, `@college`, `@neighbors`, `@nba-fans`.

### C. Meta Topics (`#`)
Use the `#` prefix for interest-based metadata or traits.
- Examples: `#parent`, `#runner`, `#expert-gardener`.

## 4. AI Ingestion Instructions
When mapping legacy data to Greatuncle:
1. **Sanitize Names**: Strip HTML/Script tags.
2. **Normalize Dates**: Convert dates to `YYYY-MM-DD`. If the year is unknown, use `0000-MM-DD`.
3. **Handle Missing Levels**: If no level is obvious, default to `&level150` (Active Horizon/Yearly) if it's a cold import, or `&level50` for active people.
4. **Phone Numbers**: Keep as strings; do not force integer format.
5. **Deduplication**: If an ID is not provided, the app will match by `n` (name) upon import.

---
*Version: v43 (Current Spec)*
