import { useEffect, useState } from 'react'
import StoreBadges from '../components/StoreBadges'
import { Check } from '../components/icons'
import { APP_TABS, PROS_CONS, SHOT } from '../data/content'
import { usePrefetch } from '../hooks'
import { tablistKeys } from '../shared/a11y'

/* ==========================================================================
   APPS

   Both chip rows are tablists: one tab stop each, arrows between the chips,
   the selected one stated. The component owns aria-selected and the roving
   tabIndex; tablistKeys owns the keys and clicks the real button, so a key
   press and a click are the same code path.
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
    <div className="phones" id="phones">
      <div className="phone p-side">
        <img id="ph-l" src={SHOT[shown.l]} alt="RusVPN app screen" style={style} width="440" height="953" decoding="async" />
      </div>
      <div className="phone p-main">
        <img id="ph-m" src={SHOT[shown.m]} alt="RusVPN connected screen" style={style} width="440" height="953" decoding="async" />
      </div>
      <div className="phone p-side">
        <img id="ph-r" src={SHOT[shown.r]} alt="RusVPN app screen" style={style} width="440" height="953" decoding="async" />
      </div>
    </div>
  )
}

/** the role/aria/tabIndex a tab needs, in one place for both rows */
const tabProps = (prefix, panel, i, selected, select) => ({
  type: 'button',
  role: 'tab',
  id: `${prefix}-${i}`,
  'aria-selected': i === selected,
  'aria-controls': panel,
  tabIndex: i === selected ? 0 : -1,
  className: i === selected ? 'on' : undefined,
  onClick: () => select(i),
})

export default function Apps() {
  const [tab, setTab] = useState(0)
  const [pc, setPc] = useState(0)
  usePrefetch(ALL_SHOTS)

  return (
    /* .sec, not the same clamp written inline: an inline padding is not
       reachable by the phone trim, so this section kept its 72px desktop
       rhythm on a 390px screen while every section around it had come down */
    <section className="sec wrap" id="apps">
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

            <div className="tabs" id="apptabs" role="tablist" aria-label="App feature" style={{ marginTop: 26 }} onKeyDown={tablistKeys}>
              {APP_TABS.map((t, i) => (
                <button key={t.label} {...tabProps('apptab', 'appcopy', i, tab, setTab)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* The tabpanel is the wrapper, not the <ul>. role="tabpanel" on a
                list overrides its implicit role="list", which orphans every
                <li>. tabIndex 0 because the panel holds nothing focusable, so
                the APG pattern makes the panel itself the tab stop. */}
            <div id="appcopy" role="tabpanel" aria-labelledby={`apptab-${tab}`} tabIndex={0}>
              <ul className="applist">
                {APP_TABS[tab].copy.map((line) => (
                  <li key={line}>
                    <span className="tick"><Check /></span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <StoreBadges />
          </div>

          <Phones tab={tab} />
        </div>

        {/* pros & cons */}
        <div className="pc">
          <div className="pc-head">
            <h3>See Pros &amp; Cons</h3>
            <div className="tabs" id="pctabs" role="tablist" aria-label="Download method" onKeyDown={tablistKeys}>
              {PROS_CONS.map((p, i) => (
                <button key={p.label} {...tabProps('pctab', 'pc-panel', i, pc, setPc)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pc-grid" id="pc-panel" role="tabpanel" aria-labelledby={`pctab-${pc}`}>
            <div className="pc-col pro">
              <h4 id="pc-pro-h">Pros</h4>
              <ul id="pc-pro" aria-labelledby="pc-pro-h">
                {PROS_CONS[pc].pro.map((x) => (
                  <li key={x}><i /><span>{x}</span></li>
                ))}
              </ul>
            </div>
            <div className="pc-col con">
              <h4 id="pc-con-h">Cons</h4>
              <ul id="pc-con" aria-labelledby="pc-con-h">
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
