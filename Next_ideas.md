GREATUNCLE_SPECS.md: The Master Blueprint

1. Vision & Philosophy

Goal: Strengthen relationships with a maximum of 150 people (Dunbar’s Number) to thrive in your community.

Core Logic: Relationships are managed via "Smart Hashtags" (Tags-as-Circles).

Privacy First: Local-first storage (localStorage) with optional encrypted Cloud Sync for phone/laptop parity.

The "User as Figure": The user is included in the 150 count to allow the app to celebrate the user's own milestones.

2. Technical Stack

Platform: PWA (Vanilla JS, HTML5, CSS3).

Integrations: Contact Picker, Google Keep (#hashtags), Web Share API (Postcards), .ics Export.

3. Data Model

A. Contact Object

{
  "id": "uuid",
  "is_user": "Boolean",
  "name": "String",
  "phone": "String",
  "email": "String",
  "tags": ["#church", "#specialevent", "#inner"],
  "last_contacted": "Timestamp",
  "snooze_until": "Timestamp | null",
  "birthday": "YYYY-MM-DD | null",
  "anniversary": "YYYY-MM-DD | null",
  "date_of_passing": "YYYY-MM-DD | null", 
  "notes": "String"
}


Note: A date of 1970-01-01 signifies "Date Known, Year Unknown."

B. Smart Hashtag Metadata (Reserved System Tags)

#daily: Hidden from suggestions (Silent Capacity) unless a milestone occurs.

#specialevent: Triggers 7-day foresight for gifts, cards, flowers, or donations.

#legacy: Used for deceased elders; switches card to "Memory/Reflection" mode on anniversaries.

4. UI/UX Design ("Earth & Hearth")

Theme: Warm, organic (Parchment, Charcoal, Sage Green).

User Celebration: Fireworks or warm glow animation on user's birthday/anniversary.

Digital Postcard: UI to snap/upload a photo, overlay a Greatuncle-branded frame/stamp, and share via Email/SMS.

Dashboard Logic:

Anchor Events: Today's milestones (Overrides hiding rules).

Daily Outreach: Standard or Gathering Mode (n-1) cards based on daily_goal.

Upcoming Milestones: Preparation shelf for #specialevent contacts within the foresight window.

5. Interaction & Suggestion Engine

The Gathering Rule: Trigger tags (e.g., #church on Sunday) show a list of 5-10 people and reduce standard daily cards by one.

Milestone Override: Birthday/Anniversary logic surfaces even "hidden" #daily contacts.

Selective Foresight: Advanced prep (Gift, Card, Flowers, Donation) is exclusive to #specialevent.

6. Onboarding & Lifecycle

Warm Start: Initialize with #inner, #community, #distant, #walkers.

Setup Flow: Create User Profile -> Add 5 Aspirational contacts -> Identify 2 #specialevent contacts.

Maintenance: 90-day "Garden Review" for inactive contacts.

7. Features & Maintenance

Bulk Add: Rapid entry for groups (e.g., #piegroup 🥧).

Merge Tool: UI to combine tags/notes/history of duplicate records.

Share Logic: URL-encoded "Add to Greatuncle" links for sharing contacts/groups.

8. Future Roadmap

Virtual Gathering: FaceTime/Zoom/Google Meet integration.

Group Broadcast: SMS/Email blast to entire hashtag groups.

9. Development Sprints

Sprint 1: PWA Shell, Theme, & LocalStorage.

Sprint 2: Smart Hashtag Logic (Frequency & Triggers).

Sprint 3: Dashboard with Anchor Date Overrides & Comm-links.

Sprint 4: Milestone Foresight (Gifts/Flowers/Donations) & Celebration UI.

Sprint 5: Digital Postcard & Web Share implementation.

Sprint 6: Onboarding Flow & User Profile.

Sprint 7: Cloud Sync, Sharing, Merging, & Legacy Garden.