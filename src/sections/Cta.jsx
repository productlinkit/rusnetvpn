import { useEffect, useRef, useState } from 'react'
import { Arw } from '../components/ui'
import { Check } from '../components/icons'
import { useSession } from '../state/session'
import { reducedMotion, shout } from '../shared/a11y'

/* ==========================================================================
   CTA

   No photo is baked in for this one yet. Instead of a "missing file" box it
   falls back to the navy backdrop, which is a finished look on its own — drop
   an images/cta.jpg into public/ and it takes over automatically.

   This is the top of the funnel, so the form gets the same treatment as the
   real one: a permanent label, validation where you leave the field, a named
   error rather than a red pill, and a pending state so a slow hand-off does
   not look like a dead button.
   ========================================================================== */

const PROMISES = ['Russia-based', '30-Day Money-Back Guarantee', 'Keep the strict no-logs policy']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function check(v) {
  if (!v) return 'Enter an email address to create your account'
  if (!EMAIL_RE.test(v)) return 'That is not a complete email address — check for a missing @ or a typo after the dot'
  return ''
}

export default function Cta() {
  const { openAuth } = useSession()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  const handoff = useRef(0)
  /* flipped off the first time the browser tells us the file is not there */
  const [photo, setPhoto] = useState(true)
  const box = useRef(null)
  const raf = useRef(0)

  useEffect(
    () => () => {
      clearTimeout(handoff.current)
      cancelAnimationFrame(raf.current)
    },
    [],
  )

  /* the red glow tracks the pointer. Two custom properties written once per
     frame, so a fast sweep across the panel repaints once per refresh rather
     than once per event. A glow that chases the cursor is exactly the kind of
     motion the reduced-motion setting exists to stop. */
  const spot = (e) => {
    const el = box.current
    if (!el || raf.current || reducedMotion()) return
    const { clientX, clientY } = e
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', clientX - r.left + 'px')
      el.style.setProperty('--my', clientY - r.top + 'px')
    })
  }

  const submit = (e) => {
    e.preventDefault()
    if (busy) return
    const v = email.trim()
    const msg = check(v)
    setError(msg)
    if (msg) {
      shout(msg)
      input.current?.focus()
      return
    }
    setBusy(true)
    handoff.current = window.setTimeout(
      () => {
        setBusy(false)
        openAuth('up', v)
      },
      reducedMotion() ? 0 : 550,
    )
  }

  return (
    <section className="wrap sec-cta">
      <div className="cta up" id="cta" ref={box} onMouseMove={spot}>
        <figure className="media cta-back">
          {photo && (
            <img src="/images/cta.jpg" alt="" loading="lazy" decoding="async" onError={() => setPhoto(false)} />
          )}
        </figure>
        <span className="veil" />
        <span className="spot" />
        <div className="inner">
          <span
            className="eyebrow"
            style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.16)' }}
          >
            <i className="dot" />Create your account
          </span>
          <h2>
            High-speed and secure Russian VPN <span className="serif">that protects your privacy</span>
          </h2>
          <p>
            Protect your online activities with RusVPN — the VPN crafted in Russia to ensure global privacy
            and security.
          </p>
          {/* the label used to be an aria-label only, so the field was announced
              but never *shown* as anything except a grey example that vanishes
              on the first keystroke (3.3.2). Now it is a real, permanent label. */}
          <div className="cta-form-wrap">
            <label className="cta-lbl" htmlFor="cta-email">Email address</label>
            <form
              className={`form${error ? ' bad' : ''}`}
              id="cta-form"
              noValidate
              aria-busy={busy}
              onSubmit={submit}
            >
              <input
                ref={input}
                type="email"
                id="cta-email"
                placeholder="you@email.com"
                inputMode="email"
                autoComplete="email"
                spellCheck="false"
                aria-describedby="cta-err"
                aria-invalid={error ? 'true' : undefined}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  /* self-correcting once it has complained, quiet until then */
                  if (error) setError(check(e.target.value.trim()))
                }}
                onBlur={() => setError(check(email.trim()))}
              />
              {/* aria-disabled, not disabled: a disabled button drops out of
                  the tab order and the focus you were on vanishes mid-submit */}
              <button
                className={`btn btn-red btn-sm${busy ? ' is-busy' : ''}`}
                type="submit"
                aria-disabled={busy ? 'true' : undefined}
              >
                <span className="spin" aria-hidden="true" />Create Account<Arw />
              </button>
            </form>
            <p className={`cta-err${error ? ' on' : ''}`} id="cta-err" role="alert">{error}</p>
          </div>
          <div className="row">
            {PROMISES.map((t) => (
              <span key={t}><Check />{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
