/* ==========================================================================
   TRANSPARENCY BAND — audit status, usability research, accessibility

   Three plain strips, one after another, just above the footer. They are
   hidden for now (transparency.css: `#audit-status, #ux-research,
   #accessibility {display:none}`); the markup stays rendered so that deleting
   that one rule brings all three back. When it goes, restore the three footer
   links too — see the note in Footer.jsx.

   Deliberately strips and not badges. A seal is what you earn once there is a
   report, and dressing a pending audit up as one is the exact move this band
   exists to stop. Each says what has been done, what has not, and when; when
   a report exists it replaces this copy rather than being bolted on elsewhere.

   Three sections rather than one so each keeps its own landmark and named
   anchor; .sec-pair-a / -m / -b move the padding to the outside of the band.
   ========================================================================== */

function Strip({ id, hId = `${id}-h`, cls, heading, eyebrow, body, rows, reviewed }) {
  const h = hId
  return (
    <section className={`wrap ${cls}`} id={id} aria-labelledby={h}>
      <div className="astat">
        <div className="astat-t">
          {eyebrow && <span className="eyebrow"><i className="dot" /><span>{eyebrow}</span></span>}
          <h2 id={h}>{heading}</h2>
        </div>
        <div className="astat-b">
          {body}
          <dl className="astat-rows">
            {rows.map(([dt, dd]) => (
              <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>
            ))}
          </dl>
          <p className="tiny">Last reviewed {reviewed}.</p>
        </div>
      </div>
    </section>
  )
}

export default function Transparency() {
  return (
    <>
      {/* A destination, so a link can point at something instead of "#". */}
      <Strip
        id="audit-status"
        cls="sec-pair-a"
        eyebrow="Transparency"
        heading="Independent audit — status"
        reviewed="11 August 2026"
        body={
          <>
            <p>
              <b>No independent audit has been completed yet.</b> We run RusVPN as a no-log service — no
              traffic logs, no DNS query logs, no connection timestamps tied to an account — and we have
              committed to having that claim examined by an outside firm rather than asking you to take our
              word for it.
            </p>
            <p>
              Until a report exists and is published here in full, we do not describe the service as
              “audited”. A claim you cannot check is not evidence, and a seal with nothing behind it is worth
              less than saying so plainly.
            </p>
          </>
        }
        rows={[
          ['Scope to be assessed', 'Connection, traffic and DNS logging across all production regions'],
          ['Auditor', 'Not yet appointed'],
          ['Report', 'Will be published here in full, including any findings against us'],
        ]}
      />

      {/* Same shape as the audit block on purpose: method, what changed, what is
          next — and the same refusal to call a modeled benchmark a user study.
          There is no separate report page, so this section is the report. */}
      <Strip
        id="ux-research"
        cls="sec-pair-m"
        heading="Usability research — status"
        reviewed="12 August 2026"
        body={
          <>
            <p>
              <b>
                We test the experience the same way we treat the no-log claim: by checking, not asserting.
              </b>{' '}
              So far this has been an expert usability review with a modeled five-participant benchmark — a
              structured walkthrough of the discovery, pricing, checkout and account flows.
            </p>
            <p>
              It is useful for finding and fixing problems; it is not a recruited real-user study, and we do
              not present its numbers as one. What it flagged, we changed rather than filed away: a confusing
              sign-in screen (a “confirm password” field on the login state) and competing calls-to-action are
              both fixed — login now asks only for email and password, and the funnel leads with one primary
              action.
            </p>
          </>
        }
        rows={[
          ['Method', 'Expert usability review + modeled 5-participant benchmark — not recruited users'],
          ['Changed so far', 'Sign-in simplified, calls-to-action unified — both already live on this page'],
          ['Next', 'A recruited real-user study, published here in full including any findings against us'],
        ]}
      />

      <Strip
        id="accessibility"
        hId="a11y-h"
        cls="sec-pair-b"
        heading="Accessibility — status"
        reviewed="12 August 2026"
        body={
          <>
            <p>
              <b>The site is built to WCAG 2.2 AA, and we would rather show the work than wear a badge.</b>{' '}
              Every text colour clears its required ratio on the surface it sits on — 4.5:1 for body text, 3:1
              for large display type; the brand red is darkened on buttons so white still clears 4.5:1 at the
              lightest point of the gradient. Focus is always visible at a consistent 3px ring, motion honours{' '}
              <span className="mono">prefers-reduced-motion</span>, every field is labelled, and dialogs trap
              focus, close on Esc and return focus to where you left.
            </p>
            <p>
              Automated testing (axe-core, WCAG 2.0/2.1/2.2 A &amp; AA) reports zero violations. That is the
              floor, not the finish line: automated tools cannot judge a screen-reader journey, so we do not
              claim more than we have checked.
            </p>
          </>
        }
        rows={[
          ['Standard', 'WCAG 2.2 level AA — contrast, focus, labels, motion, dialogs'],
          [
            'Verified (automated)',
            'Zero automated violations; keyboard path, visible focus, dialog focus-trapping and status-message announcements confirmed by an AT-API + keyboard audit',
          ],
          ['Verified (screen reader)', 'Recorded VoiceOver / Safari (iOS) listen-through, 12 Aug 2026 — recording on file'],
          ['Not yet', 'A Windows High-Contrast (forced-colors) review — in progress'],
        ]}
      />
    </>
  )
}
