# Accessibility evidence

Measured, not asserted. Every number below came from a script run against the
built page; the scripts are described at the bottom so the run can be repeated
and disagreed with.

Last run: 11 August 2026, against `index.html` including the checkout flow.

---

## Summary

| Check | Result |
|---|---|
| axe-core, desktop 1440×950 | **0 violations** across 26 states |
| axe-core, mobile 390×844 | **0 violations** across 26 states |
| Text contrast, page, desktop | **0 failing** of 245 measured text nodes |
| Text contrast, page, mobile | **0 failing** of 221 measured text nodes |
| Text contrast, checkout panel | **0 failing**, tightest 5.43:1 |
| Tab traversal, desktop | **81 stops** — 0 ringless, 0 obscured, 0 off-screen, 0 order inversions |
| Tab traversal, mobile | **73 stops** — same, all zero |
| Overlays by keyboard | mobile menu + checkout + 3 dialogs: trap holds, Esc returns focus to trigger |
| Lighthouse accessibility | **100** desktop, **100** mobile — no audit failing |
| Lighthouse best practices | **96** desktop, **96** mobile |
| Lighthouse SEO | **100** both |

Ruleset for axe: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`,
`best-practice`.

---

## 0. Reviewing the checkout without credentials

An auditor cannot type an email or a password into a form that is not theirs,
which leaves signup and checkout unassessable no matter how they are built —
3.3.7 Redundant Entry especially, since it can only be judged by watching a
value carry from one step to the next.

Load the page with **`?demo=1`** (or `#demo`). Every field is filled with
obviously fake values, a banner says so, and the signup panel opens. Without the
flag none of it runs.

Reaching the checkout: **Pricing → pick any of the five durations → the plan
button.** To see the decline path, use a card number ending `0000`; anything
else that passes a Luhn check succeeds. `4242 4242 4242 4242` works.

### 2.4.11 / 2.4.3 / 2.1.1 — what was measured

Tab was pressed through the whole document at both viewports, waiting for
smooth-scrolling to settle after each press, and at every stop the focused
element was **hit-tested at five inset points** — asking the browser what is
painted on top rather than reasoning from geometry. Overlapping the sticky
header's box is not the same as being hidden by it: the skip link overlaps it
deliberately and wins on z-index.

Tab order was then compared against visual order. Inversions inside side-by-side
columns are not counted — a footer's link columns are read down one column and
then down the next, by tab order and by eye alike, and scoring that row-major
turns every column break into a false defect. Fixed-position elements are
excluded from the comparison because their document coordinates are not
comparable with flowing content.

Result: **0 obscured, 0 ringless, 0 resting off-screen, 0 inversions** on both
viewports.

### How the reservation is made

`scroll-margin-top` on the targets, **not** `scroll-padding-top` on the
container. The two do the same job for the document scroller and must never both
be set — they add up — but `scroll-padding` only applies to the scroller it is
written on, and four things here scroll inside themselves: the auth panel, the
account page, the checkout panel and the mobile sheet. Nothing scrolled into
view inside those was getting any reservation at all.

Those overlays have no sticky header of their own, so reserving the full height
inside them would only shove their content down. `--scroll-safe` is a custom
property and custom properties inherit, so the overlays redeclare it once and
everything inside them picks up the smaller value:

| Scope | Reservation |
|---|---|
| document | 98px desktop, 88px mobile (header 82 / 76, plus ring, offset and margin) |
| `#auth`, `#account`, `#checkout`, `#sheet`, `.dlg` | 16px |

Verified by walking all eight in-page anchors at both viewports and measuring
where each target came to rest after the smooth scroll settled, then focusing a
sample of off-screen controls and measuring the same thing.

### The skip link was not skipping

That anchor walk turned up a real one. `<main id="top">` had no `tabindex="-1"`,
so activating "Skip to main content" scrolled the page but left focus on
`<body>` — the next Tab went straight back into the header. The link announced
itself, moved the view, and skipped nothing, which is the failure mode 2.4.1
exists to prevent and the one thing an automated scan cannot see, because the
markup is perfectly correct.

`main` is a programmatic focus target now, with no ring: a 3px outline around
the entire page body reads as an error, and the move itself is the feedback.
Tab after the skip link now lands on "Subscribe Now" — the first control inside
`main` — at both viewports.

### 3.3.7 Redundant Entry — verified, not asserted

Observed directly: an address typed into the CTA band and *not* submitted is
carried into signup; it survives switching between sign-in and sign-up; it
survives closing and reopening the panel. At checkout the address is taken from
the signed-in identity, else the signup panel, else the CTA band — and stays
editable, because the address you pay with is not always the one you signed up
with.

---

## 1. axe across 26 states

A single-page audit only ever sees the page's resting state. These 26 states are
each driven through the real UI before axe runs, because the page's script is an
IIFE with nothing exposed on `window` — there is no test hook to shortcut with,
so reaching a state in the harness proves it is reachable by a user.

```
default                  auth-panel-signin        server-loading
account-menu-open        auth-panel-signup        server-empty
language-menu-open       signup-errors            server-error
faq-expanded             signin-bad-password      dialog-danger-delete
faq-empty                cta-form-errors          dialog-warn-cancel
plan-compare-tab         account-panel            dialog-warn-signout-all
app-tab                  account-password-tab     mobile-sheet-open

checkout-open            checkout-declined        checkout-paypal
checkout-errors          checkout-success
```

`checkout-success` was the first state to raise a toast, and it caught a
pre-existing problem the other 25 could not: the toast container is a direct
child of `<body>`, so its contents belonged to no landmark and a screen-reader
user navigating by landmark had no route to a notification still on screen. It
is now a named region.

Starting point was **113 violation nodes**. What they were:

| Rule | Nodes | What was actually wrong |
|---|---|---|
| `listitem` + `aria-allowed-role` | 4 | `role="tabpanel"` on a `<ul>` overrode its implicit `role="list"`, orphaning every `<li>` |
| `svg-img-alt` | 2 | logo `<svg role="img">` with no name; the name was on the parent link |
| `heading-order` | 1 | footer columns jumped `<h2>` → `<h4>` |
| `aria-input-field-name` | 1 | the language `role="listbox"` had no accessible name |
| `aria-prohibited-attr` | 1 | `aria-label` on a roleless `<span>`, where ARIA discards it |
| `region` | 8 | the mobile sheet was a `<div>` outside every landmark — a screen-reader user navigating by landmark skipped the whole menu |

All fixed at source rather than suppressed. Current: **0**.

---

## 2. Contrast, measured from rendered pixels

Computed styles cannot answer this question. `getComputedStyle().backgroundColor`
returns transparent for gradients and background images, so a style-walking pass
scored the red CTA as white-on-white and missed the failure entirely.

The harness instead blanks every glyph, screenshots the page in viewport-height
bands, and reads the colour actually painted behind each text box, compositing
the text colour and its inherited opacity over that measured backdrop.

Three measurement traps had to be handled for the numbers to mean anything:

- **Animation.** axe sampled mid-fade and reported blended colours as failures —
  a passing `#4E5964` read as `#68717A`. Runs now emulate
  `prefers-reduced-motion: reduce` so the page is measured at rest.
- **Fixed layers.** The sticky header appears at the top of every band and stole
  samples from the content beneath it. Fixed and flowing content are captured in
  separate passes.
- **Clipping.** The app-tab strip scrolls horizontally on mobile, so tab 3 sits
  past the right edge; sampling its box read the page behind the strip and
  reported 1.09:1 for text that measures 8.65:1 once scrolled into view. Clipped
  elements are excluded rather than counted.

### What failed, and what changed

| Element | Was | Now |
|---|---|---|
| White on brand red — every primary CTA | **4.31:1** | 4.85–5.72 via `--red-fill` / `--red-fill-2` |
| Placeholder caption on its own gradient | **2.10:1** | `--muted`, ≥4.72 |
| Region card paragraph over photo | **3.89:1** | veil re-ramped, ≥4.5 for any photo |
| Mobile account tab pill border | **1.13:1** | `--line-ui`, ≥3:1 |

The red is worth spelling out: a gradient must clear the threshold at its
**lightest** point, not on average. `--red-2` at the top of the button gradient
measured 3.97:1. Both stops moved. Brand red is untouched for fills, icons and
3:1 non-text use — only surfaces that carry white text changed.

Tightest passing values are kept visible in the run output so regressions show
up as a shrinking margin rather than a sudden failure.

---

## 3. Keyboard walkthrough

Real key events, not synthetic clicks. 66 tab stops, and at every stop the
harness checks the focused element has a visible ring, is not covered, is not
inside hidden or inert content, and meets 24×24.

Occlusion is tested with `elementFromPoint`, not geometry — overlapping the
header's box is not the same as being hidden by it. The skip link deliberately
overlaps the header at `z-index:400` and wins; a geometric check called that a
failure, along with all ten of the header's own links.

| Widget | Result |
|---|---|
| Language listbox | Enter opens, Arrow moves, Esc closes and returns focus |
| App tablist | Arrow moves selection, roving `tabindex` correct |
| FAQ accordion | Enter toggles, `aria-expanded` accurate (single-open by design) |
| Destructive modal | opens by keyboard, `aria-modal`, focus lands on the *safe* action, background inert, trap holds, Esc closes and returns focus to the trigger |

### Three bugs this pass found that nothing else could

1. **The account page was inert while open.** Signing in inerts `#account` as
   background; `setPageInert()` then *skipped* the overlay it was opening rather
   than clearing it, so the flag set during sign-in survived. The panel rendered,
   took focus, and accepted nothing — no click, no Tab, no key. axe reported the
   state clean, because inert content is dropped from the accessibility tree, so
   auditing it sees a tidy page with almost nothing in it.

2. **Escape closed two layers at once.** Every layer listens for Escape on
   `document`, so one press with the dialog open closed the dialog *and* the
   account page beneath it. Escape is now swallowed in the capture phase while
   the dialog is up.

3. **The dialog never returned focus.** Esc goes through the browser's own
   `close` handling and never touches `closeDialog()`, so the restore now hangs
   off the `close` event — deferred a tick, because the engine runs its own
   restore afterwards and was overwriting an immediate call, landing on `<body>`.

---

## 4. Lighthouse

Run against `http://localhost:8099` — Lighthouse cannot audit `file://`.

**Accessibility 100 on both form factors, with no accessibility audit failing.**
Best practices 96, SEO 100, both.

Two findings, both fixed:

- `label-content-name-mismatch` — the language button showed "EN" but was named
  "Change language", so the visible label appeared nowhere in the accessible
  name and a voice-control user saying "click EN" got nothing (2.5.3). The name
  is built from content now and follows the code when the language changes.
- a 404 on every load from the default `/favicon.ico` lookup, now an inline SVG.

One console error is left deliberately: `images/rusnetvpn/cta.jpg` 404s because
that asset has not been supplied. That is accurate signal about a missing file,
and papering over it would only hide the gap — the `.media` placeholder already
covers the visual case, and now retires itself once a real photo decodes.

`valid-source-maps` also fails, which is the remaining 4 points. The page ships
one inline `<script>`; there is no build step to emit a map from.

Performance scored 58 on an earlier local run and is excluded from the numbers
above. The page inlines several large base64 photographs, which is what a
single-file build costs; that is a delivery question, not an accessibility one.

---

## Re-running

Scripts live in the working scratchpad, not in this repo. All three drive
Microsoft Edge through `puppeteer-core`.

```
node axerun.js              # axe over 21 states, desktop
node axerun.js --mobile     # same at 390x844
node contrastpx.js          # pixel-sampled contrast table, both viewports
node keyboard.js            # tab traversal + per-widget keyboard operation
node lh.mjs                 # Lighthouse, needs serve.js on :8099
```

## Not yet done

- Screen-reader passes with NVDA and VoiceOver. These need a human listening;
  nothing here substitutes for that, and the roles and names above being correct
  is a precondition for that test, not a replacement.
- An external third-party audit, which is what the page's own "independently
  audited" claim would need. That claim's UI is built but parked behind `hidden`
  until there is a real auditor and date to name.
