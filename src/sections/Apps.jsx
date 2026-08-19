import { useEffect, useState } from 'react'
import StoreBadges from '../components/StoreBadges'
import { Check } from '../components/icons'
import { APP_TABS, PROS_CONS, SHOT } from '../data/content'
import { usePrefetch } from '../hooks'

/* ==========================================================================
   APPS
   ========================================================================== */

const ALL_SHOTS = Object.values(SHOT)

/* Three phones, and a tab swap has to change all three at once. Fading them
   out first hides the moment the new file decodes; 180ms is long enough that
   the swap is never visible and short enough that it still feels instant. */
function Phones({ tab }) {
  const [shown, setShown] = useState(APP_TABS[0])
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const next = APP_TABS[tab]
    if (next === shown) return
    setFade(true)
    const t = setTimeout(() => {
      setShown(next)
      setFade(false)
    }, 180)
    return () => clearTimeout(t)
  }, [tab, shown])

  const style = { opacity: fade ? 0 : 1, transition: 'opacity .45s' }

  return (
    <div className="phones">
      <div className="phone p-side">
        <img src={SHOT[shown.l]} alt="RusVPN app screen" style={style} width="440" height="953" decoding="async" />
      </div>
      <div className="phone p-main">
        <img src={SHOT[shown.m]} alt="RusVPN connected screen" style={style} width="440" height="953" decoding="async" />
      </div>
      <div className="phone p-side">
        <img src={SHOT[shown.r]} alt="RusVPN app screen" style={style} width="440" height="953" decoding="async" />
      </div>
    </div>
  )
}

export default function Apps() {
  const [tab, setTab] = useState(0)
  const [pc, setPc] = useState(0)
  usePrefetch(ALL_SHOTS)

  return (
    <section className="wrap" id="apps" style={{ paddingBlock: 'clamp(72px,9vw,132px)' }}>
      <div className="apps up">
        <div className="apps-grid">
          <div>
            <span className="eyebrow">Download App</span>
            <h2 style={{ marginTop: 18 }}>
              Download &amp; Browse Freely <span className="serif">with RusVPN</span>
            </h2>
            <p className="lead" style={{ marginTop: 16 }}>
              Protect your online activities with RusVPN — the VPN crafted in Russia to ensure global privacy
              and security.
            </p>

            <div className="tabs" style={{ marginTop: 26 }}>
              {APP_TABS.map((t, i) => (
                <button key={t.label} className={i === tab ? 'on' : undefined} onClick={() => setTab(i)}>
                  {t.label}
                </button>
              ))}
            </div>

            <ul className="applist">
              {APP_TABS[tab].copy.map((line) => (
                <li key={line}>
                  <span className="tick"><Check /></span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <StoreBadges />
          </div>

          <Phones tab={tab} />
        </div>

        {/* pros & cons */}
        <div className="pc">
          <div className="pc-head">
            <h3>See Pros &amp; Cons</h3>
            <div className="tabs">
              {PROS_CONS.map((p, i) => (
                <button key={p.label} className={i === pc ? 'on' : undefined} onClick={() => setPc(i)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pc-grid">
            <div className="pc-col pro">
              <h4>Pros</h4>
              <ul>
                {PROS_CONS[pc].pro.map((x) => (
                  <li key={x}><i /><span>{x}</span></li>
                ))}
              </ul>
            </div>
            <div className="pc-col con">
              <h4>Cons</h4>
              <ul>
                {PROS_CONS[pc].con.map((x) => (
                  <li key={x}><i /><span>{x}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
