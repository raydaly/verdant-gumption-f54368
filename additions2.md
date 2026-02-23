1. The "First 50" Require "Bandwidth" (Synchronous)
According to the Dunbar logic in the sources, the first three layers are defined by emotional intimacy, which requires real-time interaction to sustain.
• Layer 5 (Support Clique): These are the "shoulders to cry on". You cannot "cry" effectively via text. Research suggests we spend 60% of our total social time on just these 15 people. "Time" implies duration (calls, visits), not just data points (texts).
• Layer 15 (Sympathy Group): These are "core social partners" often maintained by the "Rotating Lunch" or "Phone Commute" strategies.
• Layer 50 (Affinity Group): Defined as "Dinner Party Friends". A dinner party is the definition of a synchronous, high-bandwidth event.
App Logic: For these contacts, the app should prioritize "High-Resolution" prompts:
• Prompts: "Schedule a Lunch," "Go for a Walk," "Call during your commute".
2. The "Outer 100" Require "Safety" (Asynchronous)
For the remaining 100 people (Layer 150), a phone call can actually be counter-productive because it feels intrusive or demanding ("Why is he calling me out of the blue?").
• The "Low-Stakes" Rule: The goal here is "Propinquity" (awareness), not deep intimacy.
• The "Digital Postcard": The specs explicitly introduce the "Digital Postcard" feature for the Outer Circle specifically because "a phone call might feel too intrusive".
• The Interaction: A text saying "Saw this and thought of you" allows the recipient to feel "seen" without the "burden of reply" or the "social debt" of a conversation.
App Logic: For these contacts, the app should prioritize "Low-Friction" prompts:
• Prompts: "Send a photo," "Share a link," "Digital Postcard".
Summary Table for Greatuncle Logic
Circle
Size
Connection Goal
Ideal Mode
App Feature
Inner
5-15
Intimacy / Support
Synchronous (Face/Voice)
"Schedule Lunch" (.ics) / Call
Affinity
50
Shared Activity
Synchronous (Events)
"Dinner Party" / "Walk"
Outer
150
Awareness / Memory
Asynchronous (Text/Mail)
"Digital Postcard" / "Snooze"
Recommendation: We should update the "Prompt Generator" logic in the specs to enforce this: if a contact is tagged #inner or #affinity, the app should suppress generic text templates and instead suggest specific times to meet or call.


1. The "Digital Postcard" Canvas Generator
Source: While we defined the concept of sending a low-stakes photo, we still need to implement the Image Processing Logic.
• The Task: We need a JavaScript function that takes a user's uploaded photo (e.g., a view from Mayor's Walk), overlays a simple, elegant "Greatuncle Frame" (CSS/Canvas), and attaches the caption "Saw this and thought of you."
• Implementation Detail: This must happen entirely in the browser using the HTML5 Canvas API so no image data is uploaded to a server.
2. The "Vitality Score" Algorithm
Source: We decided to replace the guilt-inducing "Overdue" count with a positive "Community Health" metric for the Outer Circle.
• The Task: Implement a function that calculates the percentage of the "Layer 150" that is not currently in a "Critical Decay" state.
• Visuals: Display this as a subtle "Garden Health" bar in the settings or footer, encouraging stewardship rather than task completion.
3. "Focus Modes" (Life Event Templates)
Source: We have the research on "Relational Turbulence" (Bereavement, New Parent, Retirement), but we haven't built the UI Selector to trigger these modes.
• The Task: Create a "Focus Mode" dropdown in Settings.
• The Logic:
    ◦ Bereavement Mode: Temporarily suppresses all #distant and #community notifications for 30 days.
    ◦ Retirement Mode: Scans for "Work" tags and promotes them to #active-nudge to prevent drift.
4. The "Sunday Review" (Batch Processing)
Source: We need to solve the data entry friction for natural interactions.
• The Task: Build a specific "Weekly Review" view (distinct from the Daily Dashboard).
• The Interaction: A grid view of people due for contact where the user can "Bulk Select" multiple faces and tap a single button: "Saw at Church/Park," instantly resetting their timers without individual note-taking.
5. "Fireworks" & Celebration Logic
Source: We added the user to the list of 150, but we need the visual payoff.
• The Task: Implement the "Anchor Date" visual override.
• The Visuals: On a birthday or anniversary (for the user or a contact), the card should feature a distinct animation (Fireworks or a "Warm Candle Glow" per the Earth & Hearth theme) to differentiate it from a standard chore.
6. The "Graceful Downshift" Detector
Source: The app needs to detect "Asymmetric Friendships" so it doesn't nag you about people you are naturally drifting from.
• The Task: A background logic check: If (User snoozes Contact X > 3 times in a row) -> Suggest: "Move to Yearly?"
• The Value: This keeps the "Ground" clean and prevents the user from ignoring the app entirely due to "Notification Guilt."
Suggested Prompt for Antigravity
To tackle the most complex remaining visual task, I recommend this prompt:
"Refer to GREATUNCLE_SPECS.md. We need to implement the Digital Postcard feature (Sprint 2). Please create a PostcardGenerator.js component using the HTML5 Canvas API. It should allow the user to select a local photo, overlay a 'Polaroid-style' white border with the text 'Saw this and thought of you,' and generate a shareable Blob for email/SMS. Ensure no image data is uploaded to the cloud."