import { useRef, useState } from 'react'
import { Arw } from '../components/ui'
import { Check } from '../components/icons'
import { useSession } from '../state/session'

/* ==========================================================================
   CTA

   No photo is baked in for this one yet. Instead of a "missing file" box it
   falls back to the navy backdrop, which is a finished look on its own — drop
   an images/cta.jpg into public/ and it takes over automatically.
   ========================================================================== */

const PROMISES = ['Russia-based', 'Try at no cost', 'Keep the strict no-logs policy']

export default function Cta() {
  const { openAuth } = useSession()
  const [email, setEmail] = useState('')
  /* flipped off the first time the browser tells us the file is not there */
  const [photo, setPhoto] = useState(true)
  const box = useRef(null)
  const raf = useRef(0)

  /* the red glow tracks the pointer. Two custom properties written once per
     frame, so a fast sweep across the panel repaints once per refresh rather
     than once per event. */
  const spot = (e) => {
    const el = box.current
    if (!el || raf.current) return
    const { clientX, clientY } = e
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', clientX - r.left + 'px')
      el.style.setProperty('--my', clientY - r.top + 'px')
    })
  }

  return (
    <section className="wrap" style={{ paddingBottom: 'clamp(56px,6vw,90px)' }}>
      <div className="cta up" ref={box} onMouseMove={spot}>
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
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              openAuth('up', email.trim())
            }}
          >
            <input
              type="email"
              placeholder="you@email.com"
              aria-label="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn btn-red btn-sm" type="submit">
              Register<Arw />
            </button>
          </form>
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
