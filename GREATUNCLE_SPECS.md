# GREATUNCLE_SPECS.md: The Master Blueprint

## 1. Vision & Philosophy
**Goal**: Strengthen relationships with a maximum of 150 people (**Dunbar’s Number**) to thrive in your community.

**Core Logic**: Relationships are managed via "Smart Hashtags" (Tags-as-Circles) and **Dunbar Layers** of intimacy.

**Privacy First**: Local-first storage (localStorage) ensures all data remains on the device. No cloud processing of personal contacts.

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
- **Invitation & Import System**: Share URL-encoded groups for instant intake with robust duplicate detection and conflict resolution.

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
- **`!` (Actions)**: Behavioral triggers (e.g., !daily for manual outreach control).

### C. Reserved System Tags
- **`&level5`, `&level15`, `&level50`, `&level150`**: Dunbar Layers. Level 5 and 15 receive a **2x frequency boost** in outreach suggestions.
- **`&previewdays`**: Triggers foresight preparation (Gifts, Flowers, etc.) within the user-defined window.
- **`&legacy`**: For deceased contacts. Switches card to "Reflect" mode on anniversaries and displays "In Loving Memory."

---

## 4. UI/UX Design ("Earth & Hearth")
**Theme**: Warm, organic (Parchment, Charcoal, Sage Green, "Snooze" Amber).

**Tabbed About/Settings View**:
1. **The Vision**: Mission statement and Dunbar Layer visual breakdown ("Connection Health").
2. **App Settings**: Profile management, theme toggle, and engine calibration (Foresight Window, Rotation Limit).
3. **Garden Shed**: The utility hub for data resiliency.
4. **People & Review**: Management view for all 150 contacts and a **Share Review Queue** for merging/importing shared groups with manual conflict resolution.

**Grounded Level Selection**: Horizontal segment controls for Dunbar Layer assignment (5, 15, 50, 150) during contact addition, ensuring intimacy level is considered at the point of "Your Community."

**Merge Tool**: Intelligent data reconciliation that detects conflicts (phone/email/milestones) and prompts the user to choose between existing and incoming data while preserving interaction logs.

**Digital Postcard**: Interface to upload/snap a photo, apply a Greatuncle frame/stamp, and share via system share sheet.

**Journal**: A chronological timeline of all connection logs across the entire circle.

---

## 5. Interaction & Suggestion Engine

**Dashboard Sections**:
1. **Anchor Events**: Today's milestones (Birthdays/Anniversaries).
2. **Gathering Mode**: Triggered by rules (e.g., `#church` on Sunday). Surfaces everyone in that tag.
3. **Daily Outreach**: Priority-scored cards based on "days since last contact" and intimacy level boost.
4. **Upcoming Milestones**: Prep shelf for `&previewdays` contacts.

**Smart Search**:
- Start search with `#`, `@`, `$`, or `!` to instantly filter by tags.
- Otherwise, searches by Name.

---

## 6. Onboarding & Lifecycle
**Warm Start**: Initialize with setup flow: Create User Profile -> Add Aspirational contacts ("Your Community") -> Assign Dunbar Layers via UI radio buttons.

**Maintenance & The Garden Shed**: 
- **Backup Nudge**: UI notification if the "Seedling" hasn't been exported in >30 days.
- **Seedling Export**: Generates a Base64 JSON "Seedling" (or raw JSON) for clipboard backup.
- **Restore Logic**: Re-hydrates the circle from a pasted Seedling data string.

**Calibrations**:
- **Foresight Window**: Configurable setting (default 7 days) for upcoming preparations.
- **Rotation Limit**: Controls how many standard outreach cards appear daily.

---

## 7. Future Roadmap
- **Physical Ledger (Paper)**: Print-ready PDF generation with human-readable 150-person logs and machine-readable data QR codes.
- **Cloud Sync**: Optional encrypted phone/laptop parity.
- **90-day Garden Review**: Automated audit of inactive contacts.
- **Digital Postcard**: Interface to upload/snap a photo, apply a Greatuncle frame/stamp, and share via system share sheet.
- **Sustain Groups**: Quick-action buttons for `@group` broadcast messaging (Text/Email).
- **Google Keep Integration**
 
