# Greatuncle: Core Identity

*Decided 2026-07-05. This document settles what Greatuncle is. Every feature decision should be tested against it. If a proposal conflicts with this document, the proposal changes or this document is deliberately revised — never silently drifted past.*

---

## The identity, in one sentence

**Greatuncle is a generosity engine: one person runs it, and its value radiates outward to people who may never touch the app.**

---

## The question this settles

The app grew up torn between two identities:

- **The Keeper** — a private, calm address book and milestone calendar. A place you *visit*.
- **The Engine** — a system that proactively tells you who to reach out to. A thing that *acts on you*.

The answer: **the Engine is the core identity. The Keeper is the front door.**

They are not rivals — the Engine contains the Keeper. The choice is about the center of gravity: what the app optimizes for, whose experience gets design effort first, and what story we tell. That center is the steward running the engine.

But the *entry* experience is the Keeper, because the Keeper requires no philosophy. "What's Mike's address?" and "when is Sarah's birthday?" are reasons to open the app that demand zero buy-in. The Engine is a worldview — being told who to contact — and worldviews must be earned, never forced on day one.

## Why the Keeper is not "a worse Google Contacts"

Because for most users **the address book is a shared resource, maintained by someone else** — their family's greatuncle. It arrives pre-populated via a link. The calendar has birthdays in it the moment the app opens. A solo address book is a chore you owe yourself; a stewarded one is a **gift you receive**, kept current by the person in your family who does that work.

That person is who the app is named for. Every family has one.

## The operating principle: intention

**The app never decides who matters; it holds the user to their own decision.** People keep using Greatuncle because it makes them *intentional* about the people in their address book — a phone's contact list accumulates, but a circle is drawn. The 150 cap, the "how often do you want to stay in touch?" question, the refusal to auto-assign defaults or auto-switch modes: all of it is the same principle. Daily suggestions are not an algorithm's opinion — they are the user's own intentions, echoed back. This is also the standing defense against the nag-machine failure mode: the app only ever reminds you of what you yourself chose.

(In user-facing copy, render this in plain registers — "on purpose," "you choose," "you decide" — and use the word "intentional" sparingly. Register ladder: *your people* → *your circle* → *@groups*.)

## The Four Rings

Value radiates outward from one active user:

| Ring | Who | Touches the app? | What they get |
|---|---|---|---|
| 1. **The Steward** | The greatuncle — runs the Engine | Daily | Suggestions, milestone radar, the tools of the role |
| 2. **The Keepers** | Family/friends who imported the circle | Occasionally | A shared address book + milestone calendar, maintained for them |
| 3. **The Readers** | Newsletter recipients | Maybe never | A useful, warm email — and a standing invitation |
| 4. **The Beneficiaries** | People who get contacted | Never | More calls, remembered birthdays, relationships that don't drift |

Everything in rings 2–4 exists only because someone in ring 1 runs the engine. The Engine is not the "advanced mode" of an address book; it is the sun the system orbits.

## How people arrive: the newsletter is the front door

Most people will never meet Greatuncle as software. They will meet it as **correspondence from their greatuncle** — an email listing the birthdays coming up in `@family` this month, with an import link riding along as a soft invitation.

This inverts normal app acquisition. The first touch is useful *in itself*, requires no install, and comes from a person you trust, about people you love. Consequences:

- **The newsletter must be excellent as an email.** For ring-3 people, that email *is* the product — possibly forever. It is not a side feature; it is the public face.
- **The growth loop**: steward shares a group/newsletter → relatives become Keepers → a few Keepers eventually become Stewards of their *own* circles (the Guest → Owner journey) → repeat.

## Value exits the software

Ring 4 is the rarest property in the design and the reason "generosity engine" is literal. Grandma installs nothing and knows nothing about Dunbar layers — and her phone rings more often. Most apps' value is trapped inside engagement; Greatuncle's lands on non-users.

Two consequences:

1. **Success is measured off-device** — calls made, cards sent, drift prevented. The privacy architecture (no telemetry, no server) means we *couldn't* count users even if we wanted to. The app that can't measure its users is the one whose value lands on non-users. The constraint and the mission agree.
2. **The reward loop closes offline.** The steward's payoff is "it was so good to hear from you" — not a streak badge. The app never needs gamification because life provides it.

## What this identity is *not*

- **Not a solo productivity tool.** If a feature only makes sense for a user with no one to share with, it is off-identity.
- **Not a social network.** Rings never interact through the app. All communication is native (call, SMS, email). There are no feeds, no profiles, no in-app messages.
- **Not live sync.** With no server, the shared resource is *periodically re-gifted snapshots* — the steward reshares, recipients re-import, merge logic reconciles. Promise "kept current by your greatuncle," never "always in sync." The architecture cannot honor the latter.
- **Not a nag machine.** The Engine invites; it does not guilt. A user who ignores suggestions for a month should feel welcomed back, not shamed.

## The mode model, settled

The **Guest → Owner (Stewardship) model in the code and README is canonical.** The older four-mode spec (Guest / Address Book / Editor / Active) is legacy and should be read as history, not instruction. `outreachGoal = 0` is the Keeper posture; `outreachGoal > 0` turns on the Engine. The transition is always user-initiated and should be *offered* at the moment the circle is established enough for suggestions to be trustworthy — never forced at onboarding.

## The feature test

Before building anything, ask:

1. **Which ring does this serve?**
2. **Does it cost ring 1 anything?** (The steward's attention is the scarcest resource in the system. Features that tax the steward to serve outer rings need extraordinary justification.)
3. **Does it respect the boundary?** (No servers, no accounts, no sync, no telemetry — see the manifesto's Antigravity guardrails.)

A feature that serves no ring, or serves an outer ring by burdening the steward, does not get built — however clever it is.

---

*Related: [PRODUCT_MANIFESTO.md](PRODUCT_MANIFESTO.md) for constraints and UX voice; CLAUDE.md (repo root) for implementation status.*
