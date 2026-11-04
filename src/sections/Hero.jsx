import { useEffect, useState } from 'react'
import { Media } from '../components/ui'
import { BuyBtn } from '../components/Header'
import { Bolt, Globe } from '../components/icons'
import { useCountUp, useFacts } from '../hooks'
import { reducedMotion } from '../shared/a11y'

/* ==========================================================================
   HERO
   ========================================================================== */

/* Twelve bars, each a fifth of a second behind the last, so the strip reads
   as a wave rather than twelve things blinking together. */
const BARS = Array.from({ length: 12 }, (_, i) => (i * 0.12).toFixed(2) + 's')

/* a count still on its way from the API reads as an ellipsis, not as a
   number we would then have to take back */
const n = (v) => v ?? '…'

function Stat({ count, suffix, order, label }) {
  const ref = useCountUp(count, { order })
  return (
    <div className="st">
      <div className="n mono">
        <span ref={ref}>0</span>
        {suffix && <em>{suffix}</em>}
      </div>
      <div className="l">{label}</div>
    </div>
  )
}

/* The Russia-based chip carries the flag itself: a 3:2 box in its own
   colours, not a 14px square tinted like the other chip icons. */
const FlagRu = () => (
  <svg className="flagru" viewBox="0 0 21 14" aria-hidden="true" focusable="false">
    <rect width="21" height="14" rx="2.2" fill="#FFFFFF" />
    <path d="M0 4.667h21v4.666H0z" fill="#0039A6" />
    <path d="M0 9.333h21V11.8a2.2 2.2 0 0 1-2.2 2.2H2.2A2.2 2.2 0 0 1 0 11.8V9.333z" fill="#D52B1E" />
    <rect x=".45" y=".45" width="20.1" height="13.1" rx="1.75" fill="none" stroke="rgba(14,18,22,.18)" strokeWidth=".9" />
  </svg>
)

const Retry = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8a5.5 5.5 0 1 1-1.7-4" /><path d="M13 1.5V4h-2.5" />
  </svg>
)

/* ---------- the connection widget ----------
   Opens on "Connecting" and settles, so the hero shows the handshake rather
   than asserting a permanent green light. The failure branch is built and
   reachable — a privacy product that never draws a dropped tunnel is hiding
   the one moment its user needs a next step — but it is not wired to a random
   chance: `window.rusvpnConnFail()` shows it for review.

   It is a picture of the app, not the app, so it carries one accessible
   description and hides its internals, rather than exposing a tunnel status
   and a Retry button that connect to nothing (4.1.2). */
const CONN = {
  connecting: {
    label: 'Connecting…',
    ms: '— ms',
    dot: 'amber',
    aria: 'RusVPN app, connecting to Frankfurt from Moscow.',
  },
  connected: {
    label: 'Connected',
    ms: '12 ms',
    dot: '',
    aria: 'RusVPN app, connected to Frankfurt from Moscow at 12 milliseconds.',
  },
  error: {
    label: 'Could not connect',
    ms: '— ms',
    dot: 'red',
    aria: 'RusVPN app showing a failed connection to Frankfurt, with a button to try another server.',
  },
}

function Conn() {
  const [state, setState] = useState(() => (reducedMotion() ? 'connected' : 'connecting'))
  useEffect(() => {
    window.rusvpnConnFail = () => setState('error')
    const t = reducedMotion() ? 0 : window.setTimeout(() => setState((s) => (s === 'connecting' ? 'connected' : s)), 1600)
    return () => {
      clearTimeout(t)
      delete window.rusvpnConnFail
    }
  }, [])
  const c = CONN[state]
  const mod = state === 'connected' ? '' : ` is-${state}`

  return (
    <div className={`conn${mod}`} id="conn" role="img" aria-label={c.aria}>
      <div className="row1">
        <span className={`st${mod}`}>
          <i className={`pulse${c.dot ? ' ' + c.dot : ''}`} />
          <span>{c.label}</span>
        </span>
        <span className="ms mono">{c.ms}</span>
      </div>
      <div className="route">
        <span className="flag f1" />
        <span>Moscow</span>
        <span className="dash" />
        <span>Frankfurt</span>
        <span className="flag f2" />
      </div>
      <span className="conn-act">
        <Retry />
        Try another server
      </span>
      <div className="bars">
        {BARS.map((delay) => (
          <i key={delay} style={{ animationDelay: delay }} />
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  const facts = useFacts()

  return (
    <section className="hero wrap" aria-label="Hero section">
      <div className="hero-top">
        <div className="up">
          <span className="eyebrow"><i className="dot" /><span>30-Day Money-Back Guarantee</span></span>
          <h1>
            A secure and independent VPN <span className="serif">built for privacy.</span>
          </h1>
        </div>
        <div className="hero-side up" style={{ '--d': '120ms' }}>
          <p className="lead">
            Protect your connection with {n(facts.servers)}+ servers across {n(facts.countries)}+ countries, a
            strict no-logs policy, and secure access across all your devices.
          </p>
          <div className="hero-cta">
            <BuyBtn variant="red">Get RusVPN</BuyBtn>
            <a href="#pricing" className="btn btn-ghost">View Plans</a>
          </div>
          <p className="tiny">
            Russia-based. Built for privacy.<br />Keep the strict no-logs policy.
          </p>
        </div>
      </div>

      <div className="stage up" style={{ '--d': '200ms' }}>
        <Media
          className="shot"
          src="/images/hero.jpg"
          alt="Secure VPN connection on desktop computer"
          label="images/rusnetvpn/hero.jpg"
          dim="1600 × 1100"
          imgProps={{ width: 1600, height: 900, fetchPriority: 'high', decoding: 'async' }}
        />
        <span className="chip c1"><FlagRu /><span>Russia-based</span></span>
        <span className="chip c2"><Globe /><span>{n(facts.servers)}+ servers worldwide</span></span>
        <span className="chip c3"><Bolt /><span>Keep the strict no-logs policy</span></span>
        <Conn />
      </div>

      {/* Every target comes from useFacts, which is summed from the same fleet
          the coverage section lists. Nothing here is typed twice, so the
          counters and the copy above cannot drift apart. */}
      <div className="stats up" style={{ '--d': '120ms' }}>
        <Stat count={facts.servers} suffix="+" order={0} label="Servers worldwide" />
        <Stat count={facts.countries} suffix="+" order={1} label="Countries you can connect from" />
        <div className="st">
          <div className="n mono">0</div>
          <div className="l">Logs of your browsing, traffic, DNS queries or connection history.</div>
        </div>
        <Stat count={facts.continents} order={2} label="Continents covered" />
      </div>
    </section>
  )
}
