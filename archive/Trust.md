Trusting the Link: The Greatuncle Protocol

In an era of phishing and "link fatigue," asking a user to click a link in a message is a high-stakes request. To maintain the "Greatuncle" spirit of generosity, the entry point must be designed for maximum trust and minimum friction.

1. The Power of Personal Context

The most important security feature of Greatuncle is that the link is never unsolicited.

The High-Trust Source: The link arrives in a personal thread from a known family member or friend.

The "Plain Text" Guarantee: We encourage the sender to include a personal note: "Hey, I put all the family addresses in this private link so we can all have them for the holidays."

2. The Transparent Threshold (Open Graph Design)

When a link is pasted into a message, the "Preview" (Open Graph) should communicate security:

Title: "The [Family Name] Family Record"

Description: "A private, secure directory shared by [Sender Name]. No login required to view."

Visual: A simple, high-quality icon of a hearth or a cast-iron pan—symbolizing safety and home.

3. Gallery Mode as a Security Feature ("The Passive Collector")

The "Read-Only" state is our greatest trust-building tool. When the user clicks the link, they should encounter:

Zero Interstitial Barriers: No "Create Account," no "Accept Cookies" (since we don't track), and no "Allow Location" popups.

No Password Required: Because the data is local to the sender and shared directly with you, there is no central database to hack and no password to remember, lose, or have stolen.

Immediate Value: The names and birthdays they recognize appear instantly. Seeing the "gift" immediately validates that the link is legitimate.

The Simplified Address Book: The app hides complex features like Outreach Tracking or Journaling. It acts purely as a beautiful, private directory for viewing and sharing.

The "Stewardship Threshold" (Backup to Edit): When a Guest decides they want to become an Architect—to add a new contact or edit a name—we introduce the final trust mechanism: The Seedling Backup. To unlock editing, they must first download a backup of the current Address Book. This proves to them that *they* hold the data, not us, and ensures their data is preserved before they start making changes.

The "Zero-Permission" Promise: The app should explicitly state at the top: "This is a private view. Greatuncle does not track you, show ads, or store your data on a server."

4. Avoiding "App Fatigue"

Because the initial link opens in a browser, it feels low-stakes.

The "Bookmark" Phase: We don't ask them to "Install" or "Download" anything in the first thirty seconds.

The Transition: We only suggest "Adding to Home Screen" (PWA) once the user has performed a lookup or two, proving they find the tool useful.

5. Technical Safety: Data vs. Code

A common fear is that a shared link could contain "malware." Greatuncle is architected to make this functionally impossible:

The Passive Ledger: The data in a .uncle link is pure JSON—it is a list of strings and numbers. JSON is not "code" and cannot "run" or execute on your device.

Strict Schema Enforcement: Every field has a "Maximum Capacity." A "First Name" is limited to 100 characters; a "Phone Number" is limited to a standard string length. This prevents "Buffer Bloat" or attempts to hide large payloads in text fields.

Format Validation: Data is checked for its "Shape." A birthday must follow a date format; an email must follow a standard pattern. Anything that doesn't fit the expected structure is discarded at the gate.

Active Rejection of Executables: The app strictly rejects any HTML tags, <script> sequences, or executable code. Even within allowed fields, the app treats all inputs as literal text. If a bad actor attempts to inject code, the system strips the tags or ignores the entry entirely to protect the viewer.

Sandbox Isolation: Greatuncle runs in the browser's sandbox, with no permission to access your other files, photos, or system settings.

6. The Sovereign Verification

When a user eventually decides to move to Architect Mode, the "Stewardship Ritual" explains exactly why the link is safe:

"Your record is now moving from this link into your private, local vault. Because this data stays on your device, there is no need for a password. You are the sole keeper of the key."

7. Protocol Trust Pillars

Beyond the initial link, Greatuncle's entire architecture is built to reinforce trust continuously:

- The Agency at the Gate: We never "auto-merge" or dump data. When you click a shared link, Greatuncle holds those contacts in a temporary "Waiting Room." You have the final say on every entry before it touches your private Circle.
- Respect for Existing Data: Greatuncle is polite. If you import a group you already have, the app recognizes duplicates and skips them automatically.
- The "Clean Break" (Hard Reset): Complete Data Sovereignty means the "Delete Everything" button is real. Greatuncle provides a "Nuclear Option" that wipes the local IndexedDB and clears the cache entirely. We don't keep shadows of your data.
- Version Transparency: A visible version tag (e.g., v18) next to the Home title signals that the app is actively maintained and documented, building confidence.
- No-Tracker Guarantee: Greatuncle uses zero cookies and zero third-party analytics. There are no "invisible pings" to big tech servers.

Summary of Trust Indicators

Potential Fear

Greatuncle Solution

"Is this a scam?"

Link comes from a known contact with personal context.

"Will they sell my data?"

Zero-login requirement and clear local-first messaging.

"Is this a virus?"

Strict Schema & Size Limits. HTML and scripts are rejected at the gate.

"Can my account be hacked?"

No passwords. Data is stored locally; there is no central server to breach.

"Will I be spammed?"

No email or phone number required to view the "Gallery."