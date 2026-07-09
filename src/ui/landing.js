import { renderOnboarding } from './onboarding.js';

// Landing page — shown ONLY to cold visitors: no hash fragment, no local data.
// Link-holders and returning users never reach this view (boot routes them first).
// Copy source of truth: docs/LANDING_PAGE_COPY.md — edit both together.
// The "Letters" section (4½) is intentionally absent until the Letters blog exists.

export function renderLanding(db, onStart) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'landing';

  page.innerHTML = `
    <!-- 1. Hero -->
    <section class="landing-hero">
      <p class="landing-kicker">No Cloud. No Ads. No Prying Eyes.</p>
      <h1 class="landing-headline">Stay close, on&nbsp;purpose.</h1>
      <p class="landing-subhead">
        Greatuncle is a private address book with a gentle memory.
        You choose who matters and how often to be in touch —
        it remembers what you chose, before the years slip past.
      </p>
      <button type="button" class="landing-cta" data-action="start">Start your circle</button>
      <p class="landing-cta-note">Free. No account. Takes about a minute.</p>
      <p class="landing-hatch">
        Someone sent you a Greatuncle link? Open it — your circle is already waiting.<br>
        Link won't open? <button type="button" class="landing-link" data-action="paste">Paste it here.</button>
      </p>
    </section>

    <!-- 2. The Problem -->
    <section class="landing-section">
      <h2 class="landing-h2">Nobody decides to lose touch.</h2>
      <p>
        Your phone holds hundreds of contacts — the plumber, an old landlord,
        three people named Dave from jobs you left years ago. Somewhere in there,
        filed between a dentist and a car dealership, are the people you love most.
      </p>
      <p>
        A contacts app remembers everyone. It helps you stay close to no one.
        So a year slips by between calls to your brother.
        Nobody chose that. It just happened.
      </p>
      <p><strong>Greatuncle is for choosing otherwise.</strong></p>
    </section>

    <!-- 3. How It Works -->
    <section class="landing-section">
      <h2 class="landing-h2">How it works</h2>
      <div class="landing-step">
        <h3 class="landing-h3">1. Choose your people.</h3>
        <p>
          Add the family and friends you mean to keep — up to 150, which is more
          than you'd think. For each one, answer a single question:
          <em>how often do you want to be in touch?</em> Weekly, monthly, quarterly,
          or once a year. That answer is a promise you make to yourself.
        </p>
      </div>
      <div class="landing-step">
        <h3 class="landing-h3">2. Greatuncle remembers.</h3>
        <p>
          Each day it quietly suggests a person or two who are due for a hello.
          No guilt, no streaks, no algorithm deciding who matters —
          you already decided. It just doesn't forget.
        </p>
      </div>
      <div class="landing-step">
        <h3 class="landing-h3">3. Reach out in one tap.</h3>
        <p>
          Call, text, or email straight from their card. Jot a note if you like —
          <em>"talked about the garden"</em> — so next time picks up right where you left off.
        </p>
      </div>
    </section>

    <!-- 4. The Gift -->
    <section class="landing-section">
      <h2 class="landing-h2">The whole family benefits — even the ones who never open an app.</h2>
      <p>
        Your circle isn't just yours. Share it with family through a simple link —
        no accounts, no sign-ups. Your sister opens it and the addresses and birthdays
        are simply <em>there</em>, kept current by you.
      </p>
      <p>Send the birthday letter each month, so nobody misses Aunt Ruth's 80th.</p>
      <p>
        And the people you call? They never install anything. They don't know what
        a Dunbar layer is. Their phone just rings more often.
      </p>
      <p><strong>That's the whole idea.</strong></p>
    </section>

    <!-- 5. The Privacy Promise -->
    <section class="landing-section">
      <h2 class="landing-h2">Your people are none of our business.</h2>
      <ul class="landing-list">
        <li><strong>No account.</strong> Nothing to sign up for. No password to forget.</li>
        <li><strong>No cloud.</strong> Your circle lives on your device and nowhere else.</li>
        <li><strong>No tracking.</strong> We can't see your contacts, your notes, or you.
            Not <em>won't</em> — <strong>can't</strong>. There's no server to send anything to.</li>
        <li><strong>Works offline.</strong> On a plane, at the cabin, in the basement — your circle is there.</li>
      </ul>
      <p>
        Your information leaves your device exactly one way:
        when you choose to share it with someone you trust.
      </p>
    </section>

    <!-- 6. The Science -->
    <section class="landing-section">
      <h2 class="landing-h2">An old truth about friendship</h2>
      <p>
        The anthropologist Robin Dunbar found that people can hold about 150
        meaningful relationships — a handful of dearest ones, a wider ring of
        close friends, then the larger fellowship of family, neighbors, and old friends.
      </p>
      <p>
        Greatuncle is shaped around those rings. The closest hear from you most often;
        no one drifts past the edge unnoticed. The limit isn't a restriction —
        it's the reason the whole thing works.
      </p>
    </section>

    <!-- 7. The Persona -->
    <section class="landing-section">
      <h2 class="landing-h2">Every family has one.</h2>
      <p>
        The one who remembers the birthdays. Who has the cousins' addresses when a
        wedding invitation needs sending. Who signs the card and mails it on time,
        and calls just because it's been a while.
      </p>
      <p>Every family runs on one of these people, and hardly anyone notices the work.</p>
      <p>
        Greatuncle was built for them — the family's greatuncle or greataunt,
        whatever their actual title.
      </p>
      <p><strong>Maybe that's you. Maybe it should be.</strong></p>
    </section>

    <!-- 8. The Story -->
    <section class="landing-section">
      <h2 class="landing-h2">Why "Greatuncle"?</h2>
      <p>It's named for the role, not a person — and also for a person.</p>
      <p class="landing-dedication">Dedicated to Great Uncle Mike, who kept ours.</p>
    </section>

    <!-- 9. FAQ -->
    <section class="landing-section">
      <h2 class="landing-h2">Fair questions</h2>
      <div class="landing-faq">
        <h3 class="landing-h3">Why isn't it in the App Store?</h3>
        <p>
          Greatuncle installs straight from your web browser — on iPhone, Android,
          or a computer. One tap adds it to your home screen and it behaves like any
          other app, including working offline. No store also means no middleman
          standing between you and your own address book.
        </p>
      </div>
      <div class="landing-faq">
        <h3 class="landing-h3">Is it really free? What's the catch?</h3>
        <p>
          Really free. There's no catch because there's no cost: your data stays on
          your device, so we have no servers to pay for, and nothing about you to sell.
          Apps that are "free" usually charge you in privacy. This one doesn't charge you at all.
        </p>
      </div>
      <div class="landing-faq">
        <h3 class="landing-h3">What if I lose my phone?</h3>
        <p>
          You save a backup — we call it a Seedling — as a simple file, anywhere you
          like: your notes app, an email to yourself, a printed page. Open Greatuncle
          on a new device, paste it in, and your circle is back.
        </p>
      </div>
      <div class="landing-faq">
        <h3 class="landing-h3">If I share my circle, can family see my private notes?</h3>
        <p>
          No. Your notes and your history of calls stay on your device, always.
          Sharing sends names, addresses, and birthdays — never your private words.
        </p>
      </div>
      <div class="landing-faq">
        <h3 class="landing-h3">Do the people I contact need the app?</h3>
        <p>No — and that's rather the point. Your mother doesn't need an app for her phone to ring.</p>
      </div>
    </section>

    <!-- 10. Final CTA -->
    <section class="landing-section landing-final">
      <h2 class="landing-h2">Their birthdays are coming either way.</h2>
      <p>
        Start with five people. It takes about a minute, and there's no account
        to make and nothing to pay.
      </p>
      <button type="button" class="landing-cta" data-action="start">Start your circle</button>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <p><strong>Greatuncle</strong> — a private circle for the people you love. No cloud required.</p>
      <p class="landing-dedication">Dedicated to Great Uncle Mike.</p>
    </footer>
  `;

  // Both CTAs and the paste escape hatch land on the onboarding screen —
  // it holds the profile form and the "Paste Invite Link Manually" option.
  page.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => renderOnboarding(db, onStart));
  });

  app.appendChild(page);
  window.scrollTo(0, 0);
}
