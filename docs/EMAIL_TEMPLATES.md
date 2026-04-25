# Greatuncle Communication Templates

This document tracks all user-facing messaging used for sharing, updates, and stewardship. Greatuncle uses a "Hearth" aesthetic, prioritizing warmth and clarity over technical jargon.

## 🎁 Sharing ("Pass on the Gift")
Used when a user initiates a share from the main Trunk interface.

### 1. Group / Circle Invite
- **Location**: `src/ui/trunk.js`
- **Trigger**: User selects a group/tag and clicks "Email".
- **Subject**: `Sharing Greatuncle Circle: [Group Name]`
- **Body**:
  > I'm using Greatuncle to stay connected with the people who matter most. When you click, you'll get instant access to the address book and shared birthday calendar for our ([Group Name]) group. No login, no cloud, just connection.
  >
  > 🌿 Greatuncle Update 🌿
  > Rooted: [Date] · [Time]
  > [Invite Link]
  > 🌱 End of Update 🌱

### 2. Individual Contact Share
- **Location**: `src/ui/trunk.js`
- **Trigger**: User selects a specific person and clicks "Email".
- **Subject**: `Greatuncle Contact: [Contact Name]`
- **Body**:
  > I'd like to share [Contact Name]'s contact info with you on Greatuncle. When you click, you'll get instant access to their details and milestones.
  >
  > 🌿 Greatuncle Update 🌿
  > Rooted: [Date] · [Time]
  > [Invite Link]
  > 🌱 End of Update 🌱

---

## 🛠️ Stewardship & Updates
Used by "Greatuncles" (stewards) to maintain data accuracy across the family.

### 3. Circle Update (Publishing Desk)
- **Location**: `src/ui/trunk.js`
- **Trigger**: A steward clicks "Publish Update" for a group they curate.
- **Subject**: `Updated [Group Name] Circle`
- **Body**:
  > Hi! Here is the latest [Group Name] address book.
  >
  > 🌿 Greatuncle Update 🌿
  > [Update Link]
  > 🌱 End of Update 🌱

### 4. Forwarding a Correction
- **Location**: `src/ui/contact-form.js`
- **Trigger**: A user edits a contact and is prompted to forward the fix to that group's steward.
- **Subject**: `Contact Update: [Contact Name]`
- **Body (Email)**:
  > Hi [Steward Name], here is an updated contact record: [Correction Link]
- **Body (SMS)**:
  > Hi [Steward Name], here is an updated contact record: [Correction Link]
