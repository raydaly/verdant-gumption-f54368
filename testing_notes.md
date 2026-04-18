# Greatuncle Stewardship Test Suite (v48.2)

This file tracks the manual testing procedures and data for the Greatuncle application.

## 1. Test Data: The "Primary Colors" Set
Use this JSON blob for initial imports to verify all levels and group overlaps.

```json
{
  "v": 5,
  "sn": "Azure",
  "g": "@family",
  "c": [
    { "n": "Azure",   "t": ["&owner", "@family"], "bd": "0000-01-15" },
    { "n": "Crimson", "t": ["&level5", "@family"], "bd": "0000-02-15", "zp": "90210" },
    { "n": "Indigo",  "t": ["&level15", "@family", "@paint"], "bd": "0000-03-15" },
    { "n": "Forest",  "t": ["&level50", "@family", "@paint"], "bd": "0000-04-15" },
    { "n": "Saffron", "t": ["&level150", "@paint"], "bd": "0000-05-15" },
    { "n": "Mauve",   "t": ["@paint"], "bd": "0000-06-15" },
    { "n": "Teal",    "t": ["@hobby"], "bd": "0000-07-15" },
    { "n": "Gold",    "t": ["@family"], "bd": "0000-08-15" },
    { "n": "Silver",  "t": ["@paint"], "bd": "0000-09-15" },
    { "n": "Bronze",  "t": ["@hobby"], "bd": "0000-10-15" },
    { "n": "Ruby",    "t": ["&level5"], "bd": "0000-11-15" },
    { "n": "Onyx",    "t": [], "bd": "0000-12-15" }
  ]
}
```

---

## 2. Test Cases

### Case A: The Clean Slate Reset
1.  **Action**: Go to Settings -> Danger Zone -> Clear All Data.
2.  **Verify**: People list is empty. Tab bar might be hidden until onboarding.
3.  **Note**: Hard refresh (Cmd+R) to ensure Service Worker/Cache doesn't hold old UI state.

### Case B: The Vision Dashboard Check
1.  **Action**: Import "Primary Colors" JSON.
    - *If using Nourish (Paste)*: You will see a "Review" banner. You must click **Review** and **Accept All** (or review individually) before they count towards your Vision.
2.  **Verify (Settings > Vision)**:
    - [ ] WEEKLY: 2 / 5 
    - [ ] MONTHLY: 1 / 10 
    - [ ] QUARTERLY: 7 / 35
    - [ ] ANNUALLY: 1 / 100 
    - [ ] AWAITING STEWARDSHIP: 
    - [ ] TOTAL CIRCLE: 11 / 150 (Azure excluded)

### Case C: Group Sharing & Overlap
1.  **Action**: Generate share link for `@family`. Open in Incognito.
2.  **Verify**: Guest sees only Azure, Crimson, Indigo, Forest.
3.  **Action**: Generate share link for `@paint`. Paste into SAME Incognito window.
4.  **Verify**: Guest now has 6 people. Indigo/Forest merged correctly (no dupes).

### Case D: Beta 2 Mode (Tester Workflow)
1.  **Action**: In a fresh Guest session (Incognito), go to Settings > Advanced.
2.  **Action**: Toggle "Beta 2 (Enable Editing)" ON. Page reloads.
3.  **Verify**: (+) FAB appears. User can edit "Forest" or Add someone new.
4.  **Action**: Add contact "Cobalt". Save.
5.  **Verify**: Success checkmark appears. Cobalt is in the list.

### Case E: Conflict Resolution (The Living Record)
1.  **Action**: In Guest session, edit **Crimson**'s phone number to `555-9999`.
2.  **Action**: Import the original "Primary Colors" JSON (or `@family` link) again.
3.  **Verify**: You should see a **"🌱 Review"** banner appear at the top of the People view.
4.  **Action**: Click **Review**.
5.  **Verify**: Confirm the system flags Crimson as a duplicate and shows the differences.

### Case F: The Milestone Radar
1.  **Preparation**: In the JSON test data, ensure **Indigo** has a birthday set within the next 21 days (Ex: `"bd": "0000-04-15"` if currently Late March).
2.  **Action**: Import the JSON.
3.  **Verify**: Scroll to the bottom of the People view. 
4.  **Success**: An "Upcoming Milestones" section should appear showing Indigo's upcoming birthday.

### Case G: Journal Persistence (History)
1.  **Action**: Open **Forest's** profile. Click "Log Connection".
2.  **Action**: Add a note "Verified stewardship metrics with color test." Save.
3.  **Action**: Export a full backup (Trunk -> Download JSON).
4.  **Action**: Delete all data (Settings -> Danger Zone).
5.  **Action**: Re-import that backup file.
6.  **Success**: Open Forest's profile. Confirm the "Verified stewardship..." note is visible in the logs.

### Case H: The Collaborative Sync (Bi-Directional Edits)
1.  **Preparation**: Originator shares `@family` link with Guest (Incognito).
2.  **Guest Action**: Import the link. Edit **Crimson**. Change **Phone** to `555-0000`.
3.  **Originator Action**: In main browser, edit **Crimson**. Change **Email** to `crimson@new.com`.
4.  **The Sync**: Originator generates a NEW `@family` link. Guest opens it.
5.  **Verify**: Guest sees a **"🌱 Review"** banner. Clicking it shows:
    - **Smart Sync**: Auto-merges the new **Email**.
    - **Conflict**: Shows **Phone** differences; Guest chooses "Keep Mine" (555-0000).
6.  **Success**: After updating, Crimson has both the **New Email** and the **Guest's New Phone**.

### Case I: The Pruning Test (Deletions)
1.  **Action**: Originator sends link for **@paint** (Indigo, Forest, Saffron, Mauve).
2.  **Action**: Guest imports it. All four show up.
3.  **Action**: Originator **DELETES** **Saffron** from their own circle.
4.  **Action**: Originator sends a NEW link for **@paint** to the Guest.
5.  **Guest Action**: Open the link. Only 3 people are in the preview.
6.  **Success**: After importing, **Saffron** is NOT deleted from the Guest's circle. (Greatuncle is additive—once they are in your circle, you are the sovereign owner of their record).

### Case J: The "Field-Level Sovereignty" (Azure Scenario)
1.  **Action**: Import updated "Primary Colors" (Crimson with Zip).
2.  **Action**: Edit **Azure**. Delete Phone. Add Address: "123 Main St", Zip: "55555". Save.
3.  **Action**: Simulate User A update. Create a JSON with:
    - Azure's **Anniversary** (`av`: "0000-01-20") set.
    - One previous contact (e.g., **Bronze**) **REMOVED** from the list.
    - A **New Contact** (e.g., "Silver") added.
4.  **Verify**: "🌱 Review" banner appears.
5.  **Success**: After Review, Azure has B's Address/Zip AND A's Anniversary. Bronze is still in B's list (Additive Rule).

### Case K: The "Zombie Field" (Crimson Deletion)
1.  **Action**: Edit **Crimson**. Delete the Zip code ("90210"). Save.
2.  **Action**: Re-import the original JSON (which still has Crimson's Zip).
3.  **Verify**: System flags the difference.
4.  **The Test**: If you click "Apply All", does the Zip return? 
5.  **Desired Result**: B must see a choice to "Keep My Empty Field" or "Accept Originator's Data."

### Case L: The Two Paths of Entry
1.  **Preparation**: Start from Case A (Clean Slate) but do NOT onboarding.
2.  **Action 1 (Nourish/Link)**: Paste the JSON into the "Nourish" area in Trunk.
3.  **Verify**: People view shows 12 people with **Review** badges. This is a "Gift" from a friend.
4.  **Action 2 (File Restore)**: Hard Reset (Case A), then save the JSON as `test.json` and use **"Choose Seedling File"** to import.
5.  **Verify**: People view is populated immediately with NO review badges. This is a "Restore" from your own backup.

---

## 3. Results Log

| Date | Version | Case | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| 2026-03-30 | v48.1 | A, B, C | PASS | Logic aligned with 5, 10, 35, 100 math. |
| | | | | |
