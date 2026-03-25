# GREATUNCLE_SPECS.md: The Master Blueprint

## 1. Vision & Philosophy
**Goal**: Strengthen relationships with a maximum of 150 people (**Dunbar’s Number**) to thrive in your community.

**Core Logic**: Relationships are managed via "Smart Hashtags" (Tags-as-Circles) and **Dunbar Layers** of intimacy.

**Privacy First**: Local-first storage (IndexedDB) ensures all data remains on the device. No cloud processing of personal contacts.

**The "User as Figure"**: The user is included in the 150 count to allow the app to celebrate the user's own milestones.

---

## 2. Technical Stack
**Platform**: Progressive Web App (Vanilla JS, HTML5, CSS3).
**Integrations**: 
- **Contact Picker API**: Import from native device contacts.
- **Web Share API**: Share Digital Postcards and logs.
- **Canvas API**: Overlay frames and stamps onto shared photos.
- **.ics Export**: Generate calendar events for milestones.
- **Digital Seedling (JSON/Base64)**: Proprietary text-based format for local-first backup and restoration. Supports both encoded strings and human-readable JSON.
- **Invitation & Import System**: Share URL-encoded groups for instant intake with robust duplicate detection, per-field conflict resolution, and Intelligent Auto-Match for automatically categorizing incoming contacts natively.

---

## 3. Data Model

### A. Contact Object
```json
{
  "id": "uuid",
  "is_user": "Boolean",
  "name": "String",
  "phone": "String",
  "email": "String",
  "zip_code": "String",
  "address": "String",
  "tags": ["#church", "@daly", "&level5", "!daily"],
  "last_contacted": "Timestamp",
  "snooze_until": "Timestamp | null",
  "birthday": "YYYY-MM-DD | null",
  "anniversary": "YYYY-MM-DD | null",
  "date_of_passing": "YYYY-MM-DD | null", 
  "logs": [{"timestamp": 0, "method": "sms", "comment": ""}]
}
```

### B. Standardized Tag Prefixes (System Logic)
- **`#` (Topics)**: User-defined categories (e.g., #politics, #hobby).
- **`@` (Groups)**: Broadcast circles for bulk SMS/Email actions.
- **`&` (System)**: Logic-driving tags (e.g., &level5, &legacy). Abstracted from use unless explicitly advanced.
- **`!` (Actions)**: Behavioral triggers (e.g., !daily to exclude from standard automatic rotation).

### C. Reserved System Tags
- **`&level5`, `&level15`, `&level50`, `&level150`**: Dunbar Layers mapping to Inner (5), Sympathy (10), Affinity (35), and Active (100). 
    - **&level5** acts as the Inner Circle and is completely excluded from algorithmic outreach suggestions, though interactions can still be logged functionally. 
    - The other layers have automatic target intervals of 30, 90, and 365 days respectively to surface in the outreach rotation.
- **`&previewdays`**: Triggers Event Radar preparation (Gifts, Flowers, etc.) within the user-defined window for an individual contact.
- **`&legacy`**: For deceased contacts. Switches card to "Reflect" mode on anniversaries and displays "In Loving Memory."
- **`&origin:[date]`**: Automatically generated during group imports to track the source batch silently without cluttering the user's UI.
- **`&shared`**: Applied automatically to denote that a contact was imported or updated via a shared link.

---

## 4. UI/UX Design ("Earth & Hearth")
**Theme**: Warm, organic (Parchment, Charcoal, Sage Green, "Snooze" Amber). Includes System, Dark, and Light mode toggles.

**Main Views**:
1. **Home (Dashboard)**: Daily suggestions, active anchors, radar events.
2. **People (Circle)**: Management view for all 150 contacts, filterable by tags, groups, and layers.
3. **Journal**: A chronological timeline of all connection logs across the entire circle, complete with a stats dashboard.
4. **Settings / About**: Configuration limits, prompt defaults, and profile info.
5. **Garden Shed (Backup)**: The utility hub for data resiliency (JSON extract/merge).

**Grounded Level Selection**: Horizontal segment controls for Dunbar Layer assignment (labeled 5, 10, 35, 100 for display, translating to the cumulative 150) during contact addition and editing.

**Action Interfaces**: Action buttons (📱, 📞, 📧) exist uniformly across contact cards, with conditional rendering of "Snooze" and "Connected" buttons.

---

## 5. Interaction & Suggestion Engine

**Dashboard Sections**:
1. **Anchor Events**: Today's milestones (Birthdays/Anniversaries).
2. **Gathering Mode**: Triggered by rules (e.g., `#church` on Sunday). Surfaces everyone with that tag instantly.
3. **Daily Outreach**: Priority-scored cards based on "days since last contact" relative to their layer intervals (Inner excluded). 
4. **Event Radar (Foresight)**: Prep shelf for milestones happening in the near future (configurable day limit). Populates automatically based on user-selected Layer checkboxes in settings, or individually by the `&previewdays` tag.

**Dynamic Snooze**:
- Contacts snoozed inherit dynamic skip durations based on their intimacy layer: Affinity = 7 days, Active = 14 days, Sympathy/Default = defined by user limit.

---

## 6. Onboarding & Lifecycle
**Warm Start**: Initialize with setup flow: Create User Profile -> Add Aspirational contacts ("Your Community") -> Assign Dunbar Layers via UI level buttons.

**Maintenance & The Garden Shed**: 
- **Backup Nudge**: UI notification if the "Seedling" hasn't been exported in >30 days.
- **Seedling Export**: Generates a Base64 JSON "Seedling" (or raw JSON) for clipboard backup. Group exports additionally bundle Address and Zip Code data.
- **Restore & Merge Logic**: Re-hydrates the circle from a pasted Seedling data string or URL invite. Employs Intelligent Auto-Match for bulk-applying group tags and silent auto-merging of non-conflicting data.

**Calibrations (Settings Control)**:
- **Days Preview**: Configurable window (default 7 days) for Event Radar.
- **Event Radar Layers**: Checkboxes to auto-preview all birthdays/anniversaries within designated Dunbar Layers.
- **Rotation Limit**: Controls how many standard outreach cards appear daily.
- **Skip Days**: The default base snooze duration.

---

## 7. Future Roadmap
- **Physical Ledger (Paper)**: Print-ready PDF generation with human-readable 150-person logs and machine-readable data QR codes.
- **Cloud Sync**: Optional encrypted phone/laptop parity.
- **90-day Garden Review**: Automated audit of inactive contacts.
- **Digital Postcard**: Interface to upload/snap a photo, apply a Greatuncle frame/stamp, and share via system share sheet.
- **Sustain Groups**: Quick-action buttons for `@group` broadcast messaging (Text/Email).
- **Google Keep Integration**
