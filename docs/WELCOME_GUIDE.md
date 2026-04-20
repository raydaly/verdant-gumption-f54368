# The Greatuncle Welcome Guide: From First Click to Family Tradition

## 1. The Entry Point: Meeting Your Greatuncle

Whether you clicked a link in a family email, searched for "private address books," or saw a review on a tech blog, your first moment with Greatuncle is designed to feel like stepping into a well-organized study—not a noisy digital square.

**The Greatuncle Promise**: We believe that your family’s data is a sacred trust, not a product. That’s why we’ve built a path that requires:
- **No Login**: No passwords to forget.
- **No Cloud**: Your data lives where it belongs—with you and your group.
- **No Noise**: Just the people who matter most.

## 2. The Voice of Greatuncle: Actual vs. Vision

To maintain the "trusted relative" voice, we track the gap between current implementation and our target experience.

### The Invitation (Shared Message)
- **Actual (v67)**: "I'm using Greatuncle to stay connected with the people who matter most. When you click, you'll get instant access to the address book and shared birthday calendar for our (@group) group. No login, no cloud, just connection."
- **Vision**: Matches perfectly. We may add more personalization based on the sender's name in the future.
- **Assessment**: **More.** While good, it could feel even more personal by including the sender's name (e.g., "Uncle Ray is using Greatuncle...") to reduce the "stranger link" friction.


### Accepted Invitation (Banner on landing)
- **Actual (v67)**: "🎁 You've been gifted access to the @group address book and birthday calendar by Ray Daly. Browse freely, call, text, or email anyone. To edit contacts or create groups, save a private backup first — it takes seconds and keeps your data 100% on your device."

### "Learn how it works" (Modal popup)
- **Actual (v67)**: 
  - "Your Gift Access: Someone who cares about you shared their address book with you."
  - "📒 Address Book — Browse, call, text, or email anyone in the list."
  - "🎂 Milestone Calendar — Birthdays and anniversaries for the whole year, at a glance."
  - "🔐 About your data: This address book lives only in your browser... Only you can save it."
  - "✏️ Save a backup to unlock editing... It unlocks adding contacts, editing, creating groups, and smart reminders."
  - "🎁 And once it's yours, you become a Greatuncle too — able to share the gift and pass groups on to anyone you choose."
- **Commentary**: **More.** This is the strongest "Voice" implementation in the app today. It successfully transitions from the technical "Backup" to the emotional "Becoming a Greatuncle."

### The Entry Point / Onboarding
- **Actual (v67)**: "Smart reminders to help you stay in touch." / "Your name and email stay strictly on your device."
- **Vision (Roadmap)**: Add a more character-driven "Handshake" or the **Steward's Pledge**: *"You are the steward of this group. You aren't just managing data; you're tending to the roots of your family tree. Keep it accurate, keep it private, and keep it growing."*
- **Assessment**: **Different.** The actual copy is functional/technical. The vision is emotional and aspirational. We need to transition from "telling them it's private" to "making them feel like a guardian."

### The Greeting (Home Screen)
- **Actual (v67)**: Basic header: `Home`
- **Vision (Roadmap)**: *"Welcome back. Here is what's happening in the [Group Name] circle."*
- **Assessment**: **More.** "Home" is a generic UI tab name; it doesn't build a ritual. The vision greeting adds the warmth of recognition.

### The Metadata (Link Preview)
- **Actual (v67)**: Default: `Greatuncle`
- **Vision (Roadmap)**: 
  - **Title**: *Join the [Group Name] Group on Greatuncle*
  - **Description**: *A private space for our family's addresses and birthdays. Local, secure, and shared only with us.*
- **Assessment**: **More.** Previews are currently "under-saying" it. We need the group name in the title to trigger the "Aha!" moment before the user even clicks.

### The "About" Philosophy
- **Actual (v67)**: "Dedicated to all the great-uncles... who remember your birthday... and make you feel like you belong somewhere." (Found in `about.js`)
- **Assessment**: **Different.** This matches the tone well, but it's hidden. We should bring some of this warmth to the front of the app instead of burying it in a settings sub-page.

## 3. What Greatuncle Is (and Isn't)

To understand the value of Greatuncle, you have to understand what it is not.

- **It is NOT a Social Network**: There are no "likes," no "feeds," and no algorithms trying to keep you scrolling. It is not designed to steal your time.
- **It is NOT a Data Mine**: We don't track your location or sell your aunt’s birthday to advertisers. We don't even have a "database" in the traditional sense.
- **It IS a Digital Steward**: It is a shared, private, and permanent record of the people you love.
- **It IS a Ritual**: It is the reliable reminder that someone you care about is turning another year older. It’s an intentional act of connection.

## 4. The First Five Minutes: From Guest to Steward

The Greatuncle journey is a progression from "Receiving a Gift" to "Tending the Garden."

### Phase 1: The Gallery (Read-Only)
*Actual Implementation: Gallery Mode*
The first experience is zero-friction. A Guest clicks a link and immediately sees the circle.
- **The Experience**: A beautiful, clean list of family members. No setup, no forms.
- **The Banner**: A welcoming top-bar explains: *"You've been gifted access... To edit or create, save a backup first."*
- **The Constraint**: The Guest can read, call, and text, but they cannot "break" the data.

### Phase 2: The Stewardship Ritual (The Pivot)
*Actual Implementation: `performStewardshipRitual` / `trunk.js`*
When a user decides they want to add a name or correct an address, they must "Save a Backup."
- **The Act**: The user clicks "Save Backup." A JSON file is downloaded to their device. 
- **The Meaning**: This is the moment of ownership. By holding the file, they are no longer just a guest; they are a guardian of the legacy.
- **The Transformation**: The app detects the "Owner" status and instantly shifts the UI.

### Phase 3: Architect Mode (Unlocked)
Once the ritual is complete, the app "opens up":
- **Creation**: The FAB (Floating Action Button `+`) appears on the People page.
- **Editing**: The "Edit" pencil icons appear on every profile card.
- **Vision**: The Dunbar "Vision" dashboard (mapping levels of intimacy) becomes the primary steering tool for the Steward.

### Phase 4: Passing on the Gift
*Actual Implementation: `trunk.js` / "Share Group"*
The journey comes full circle when the Steward shares their work back with the family.
- **The Act**: The Steward generates a "Gift Link" (encoded URL) for a specific group (e.g., `@family`) and sends it via text or email.
- **The Magic**: This creates a "Gallery" for the next recipient, starting the cycle over again.
- **The Stewardship Legacy**: By passing on the gift, you ensure the "source of truth" survives. You aren't just sharing an address; you're sharing the work of connection you've already done.

### The Steward’s Quick-Start Checklist
1. **The Ritual**: Save your first backup to unlock editing.
2. **Name your Circle**: Give your group a name that resonates (e.g., The Gardner Clan).
3. **Assign Layers**: Move your "Hearth" members (the core 5) into the inner circle.
4. **Tag for Context**: Use the @ symbol to tag people by side of family or city.
5. **Pass on the Gift**: Share a group link to see the "Aha!" moment from the other side.

## 5. The Long Horizon: Benefits of Extended Use

Greatuncle is a "slow-burn" utility. The value compounds over time:

- **The Shared Memory**: As the years pass, Greatuncle becomes the "source of truth" for the group.
- **The Stewardship Legacy**: By maintaining the book, the steward ensures that the family "connective tissue" remains healthy even as the family grows and moves.
- **The Birthday Habit**: Over months, the shared calendar turns "missing a birthday" from a common guilt into a solved problem.

## 6. Future Rituals & Family Insights (The Roadmap)

We are building beyond simple utility toward features that deepen the family bond. These represent the "high-level" rewards for a diligent Steward.

- **The Overlap Matrix (@groups report)**: A visual map of your family’s connective tissue. By seeing where your maternal and paternal sides overlap, or which cousins share a specific hobby tag, you can identify the "Social Connectors" who bridge your family’s different worlds.
- **The Post Card Ritual (Digital & IRL)**: A dual-pathway for staying connected. Greatuncle will facilitate sending instant digital greetings for the immediate moment, and tangible, physical post cards for the mantle. It turns a digital record back into a physical keepsake.
- **The Gifting & Logistics Layer**: We want to make "being there" easier. The roadmap includes integrating with wish lists, flower delivery, candygrams, and even sending groceries. If a family member is sick or celebrating, the steward can trigger real-world care without leaving the family book.
- **The Venn View**: A roadmap feature that visualizes your family circles as overlapping circles, helping you understand the "weight" of different branches of your network at a glance.

---

## 8. The Stewardship Model: Leading through Care

Stewardship in Greatuncle is decentralized. Unlike a corporate directory, there is no "Admin" who controls everyone's data.

### Local Sovereignty
- **The Philosophy**: Every user is the absolute monarch of their own device. 
- **The Implementation**: When a Greatuncle shares a group, they are sending a "Seedling." You decide to plant it. If you edit a name locally, no "Cloud Sync" will revert your change. You own your reality.

### Collective Stewardship (The Greatuncle Network)
- **The Implementation**: The app identifies "Greatuncles" (Stewards) by the `&steward.*` system tags.
- **The Display**: On the Vision page, groups are sorted with their Stewards identified (e.g., `@family --Uncle Ray`). 
- **The Logic**: If Uncle Ray and Aunt Sarah both steward `@family`, the app sees both as valid sources of truth. Stewardship is a collaborative act of tending, not a hierarchical act of control.

### Micro-Stewardship
- **The Philosophy**: You don't have to manage 150 people to be useful.
- **The implementation**: You can be the "Greatuncle" for just a single tag (e.g., `@bookclub`). By maintaining that small list perfectly and "Passing on the Gift" to the other members, you have performed a high-value act of stewardship for that community.

---

## 9. More Resources

For the Greatuncle content roadmap, including the philosophical blog series and video subjects, see the [Content Strategy & Media Plan](CONTENT_STRATEGY.md).
