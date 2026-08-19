import { Btn, Media } from '../components/ui'
import { Bolt, Globe, Shield } from '../components/icons'
import { useCountUp } from '../hooks'
import { useSession } from '../state/session'

/* ==========================================================================
   HERO
   ========================================================================== */

/* Twelve bars, each a fifth of a second behind the last, so the strip reads
   as a wave rather than twelve things blinking together. */
const BARS = Array.from({ length: 12 }, (_, i) => (i * 0.12).toFixed(2) + 's')

function Stat({ count, suffix, label }) {
  const ref = useCountUp(count)
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

export default function Hero() {
  const { openAuth } = useSession()

  return (
    <section className="hero wrap" aria-label="Hero section">
      <div className="hero-top">
        <div className="up">
          <span className="eyebrow"><i className="dot" /><span>Try at no cost</span></span>
          <h1>
            A secure and independent VPN solution, <span className="serif">fully controlled from Moscow.</span>
          </h1>
        </div>
        <div className="hero-side up" style={{ '--d': '120ms' }}>
          <p className="lead">
            RusVPN is the best guaranteed no-log VPN built from ground up locally in Russia. Secure your online
            privacy with a VPN that respects your values and protects you from prying eyes as you browse.
          </p>
          <div className="hero-cta">
            <Btn href="#pricing" variant="red" magnetic>Subscribe Now</Btn>
            <a
              href="#create-account"
              className="btn btn-ghost"
              onClick={(e) => {
                e.preventDefault()
                openAuth('up')
              }}
            >
              Try RusVPN Now
            </a>
          </div>
          <p className="tiny">
            Russia-based. Try at no cost.<br />Keep the strict no-logs policy.
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
        <span className="chip c1"><Shield /><span>Russia-based</span></span>
        <span className="chip c2"><Globe /><span>700+ servers worldwide</span></span>
        <span className="chip c3"><Bolt /><span>Keep the strict no-logs policy</span></span>

        <div className="conn">
          <div className="row1">
            <span className="st"><i className="pulse" /><span>Connected</span></span>
            <span className="ms mono">12 ms</span>
          </div>
          <div className="route">
            <span className="flag f1" />
            <span>Moscow</span>
            <span className="dash" />
            <span>Frankfurt</span>
            <span className="flag f2" />
          </div>
          <div className="bars">
            {BARS.map((delay) => (
              <i key={delay} style={{ animationDelay: delay }} />
            ))}
          </div>
        </div>
      </div>

      <div className="stats up" style={{ '--d': '120ms' }}>
        <Stat count={700} suffix="+" label="Servers worldwide" />
        <Stat count={90} suffix="+" label="Countries you can connect from" />
        <div className="st">
          <div className="n mono">0</div>
          <div className="l">Logging of activity. No data collection, ever.</div>
        </div>
        <Stat count={6} label="Continents covered" />
      </div>
    </section>
  )
}
