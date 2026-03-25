GREATUNCLE_SPECS.md
1. Vision & Philosophy
Goal: Strengthen relationships with a maximum of 150 people (Dunbar’s Number) to combat loneliness.
Core Logic: Suggest 1–3 specific people to contact daily based on user-defined frequency (Daily, Weekly, Monthly, Yearly).
Privacy First: Zero cloud storage. All data persists locally via IndexedDB or localStorage. No tracking of message content.
2. Technical Stack
Architecture: Single Page Application (SPA).
Format: Progressive Web App (PWA) with Service Worker for offline access.
Frontend: Vanilla JavaScript, HTML5, CSS3.
Persistence: Local-only storage (No cloud syncing).
3. Data Model (Contact Schema)
JSON
{
  "id": "uuid",
  "name": "String",
  "relationship": "Family/Friend/Community",
  "frequency_target": "Daily/Weekly/Monthly/Yearly",
  "last_contacted": "Timestamp",
  "snooze_until": "Timestamp or null",
  "preferred_methods": ["Email", "Phone", "Lunch", "Social"],
  "notes": "Non-sensitive context"
}

4. UI/UX Design ("Earth & Hearth")
Theme: Warm, organic, and personal—avoiding a "clinical" task manager feel.
Colors:
Background: #F9F7F2 (Parchment).
Primary Text: #2C2C2C (Soft Charcoal).
Action Green: #4A6741 (Sage/Forest Green for "Completed").
Snooze Amber: #D4A373 (Muted Sand).
Typography: Serif headers (Playfair Display) and 18px Sans-serif body (Inter).
Components: Polaroid-style cards for daily suggestions with soft diffused shadows and 12px rounded edges.
Empty State: When all 150 are caught up, display one of 12 seasonal photos (e.g., Christmas in December, Summer in July).
5. Interaction Logic
The Engine: Prioritize suggestions based on "Overdue Status" (Current Date - Last Contacted > Frequency Target).
Completed: Set last_contacted to current Unix timestamp, clear any active snoozes, and move the person to the bottom of the priority stack.
Snooze: Set snooze_until to +24 hours. Hide the card for today but ensure it returns tomorrow without updating last_contacted.
The 150 Guardrail: Disable the "Add" button if contacts.length >= 150 to maintain meaningful connection limits.
6. Native Bridges
Contact Import: Use navigator.contacts.select() to allow private, single-contact selection of names and phone/email.
Calendar Export: Generate a .ics file for planned events (e.g., "Lunch at Mayor's Walk") to open in the native calendar app.
Privacy Note: Every native bridge action must be triggered by a physical user click.
7. Method Library & Prompt Generator
When a person is suggested, the UI provides context-aware starters:
Low Stakes: "Saw this [Photo/Link/Memory] and thought of you.".
Request for Help: "I’m working on [Project] and remembered you’re an expert. Could I pick your brain?".
Community (Vienna Focus): "I'm planning to take a stroll down Mayor's Walk/attend the NEVCA meeting. Will I see you there?".
Family Legacy: "I found this old photo. Does anyone remember the story behind this?".
8. Onboarding Flow: "Your Community"
Philosophy: Explain Dunbar’s Number (150 people).
Privacy Handshake: Explain local-only storage with an "I Understand" button.
Inner Circle: Prompt for the first 5 core contacts.
Local Connection: Toggle for "Vienna Mode" to enable Mayor's Walk and NEVCA prompts.
8. Design Language & UI (styles.css)
A. The Color Palette: "Earth & Hearth"
Avoid "App Blue" or "Alert Red." Use tones that feel organic and steady:
Background: #F9F7F2 (Warm Paper/Parchment).
Primary Text: #2C2C2C (Soft Charcoal—easier on senior eyes than pure black).
Action Green: #4A6741 (Sage/Forest Green—for "Completed" actions).
Snooze Amber: #D4A373 (Muted Sand—for "Snooze" actions).
B. Typography
Headers: A classic Serif font (like Playfair Display or Georgia) to give it a "Great Uncle's Journal" feel.
Body: A clean, high-legibility Sans-Serif (like Inter or system-ui) at a minimum size of 18px for comfort.
C. Card Design: "The Snapshot"
Instead of rows, use Polaroid-style cards for the daily suggestions.
Shadows: Soft, diffused shadows to create depth (the "Figure/Ground" relationship).
Corner Radius: 12px (Soft, rounded edges feel friendlier than sharp corners).
Empty State: If all 150 are caught up, show a calming image of a park bench or a trail in the Blue Ridge Mountains with the text: "The circle is strong. Enjoy the quiet today."
D. Mobile-First Layout
Thumb-Zone Actions: Place the "Snooze" and "Connect" buttons at the bottom of the card for easy one-handed use on a Pixel phone.
PWA Polish: Use user-select: none on buttons to make it feel like a native app.

Implementation Instructions for Antigravity
Agent Note: Use CSS Variables for the color palette to allow for an easy "Dark Mode" (Dark Slate and Gold) toggle later. Ensure all touch targets are at least 44px to maintain accessibility.


9. Method Library & Prompt Generator
When a person is suggested, the UI should provide a "Pick a Prompt" button that generates a template based on the relationship and method.
Category: The "Thinking of You" (Low Stakes)
Method: SMS / Social Media
Prompt: "Saw this [Photo/Link/Memory] and thought of you. Hope your week is going well!"
Method: Email
Prompt: "It's been a while since we caught up. No need for a long reply, just wanted to send some good vibes your way."
Category: The "Request for Help" (Bonding)
Method: Phone / Lunch
Prompt: "I'm working on [Home Project/App Idea] and remembered you're an expert in this. Could I pick your brain for 5 minutes?"
Method: Email
Prompt: "Do you have any recommendations for [Book/Recipe/Travel Destination]? I trust your taste!"
Category: The "Community/Civic" (Local)
Method: Church / Neighborhood Walk
Prompt: "I'm planning to be at [Event/Location] this weekend. Will I see you there?"
Method: Social Media
Prompt: "Just saw the update on [Local Vienna Issue]. What’s your take on it?"
Category: The "Family Legacy"
Method: Group Chat / Email Newsletter
Prompt: "I found this old photo of [Relative/Event]. Does anyone remember the story behind this?"

Implementation Instructions for Antigravity
Agent Note: Create a prompts.js utility file that exports an object containing these templates. When the user clicks a specific contact method in the UI, use a randomizer to pick a relevant prompt and copy it to the clipboard or open it in the native app via mailto: or sms:


