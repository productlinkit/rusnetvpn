import { useCallback, useRef, useState } from 'react'
import { Plus, TILE_ICONS } from '../components/icons'
import { CONTINENTS, useDismiss, useFacts } from '../hooks'

/* ==========================================================================
   TECH — the bento grid

   One tile at a time. Opening a tile dims and shrinks the others, which is
   what makes the extra paragraph readable instead of just longer.

   The copy is kept here, next to the grid, for the same reason as the rail's:
   three tiles state the fleet's size and those numbers come from the API.
   `viz` draws the bar chart, `geo` the continent strip; a tile has at most
   one of them, most have neither.
   ========================================================================== */

const n = (v) => v ?? '…'

const tiles = (f) => [
  {
    wide: true,
    icon: 'shieldCheck',
    title: 'DNS Leak Protection',
    body: 'Protect your privacy by ensuring your DNS isn’t being leaked to any entity.',
    more: 'Experience advanced security, blazing-fast speed, and unrestricted access with our VPN.',
    viz: [34, 58, 41, 76, 52, 88, 63, 96, 71, 45, 82, 56],
  },
  {
    icon: 'split',
    title: 'VPN Split Tunnel',
    body: 'Select the apps for which you want to route through our secure VPN.',
    more: `With ${n(f.servers)}+ servers in ${n(f.countries)}+ countries, you can easily access all of your favorite content – shows, music, apps, and more – regardless of where you live.`,
  },
  {
    icon: 'power',
    title: 'No-Log VPN',
    body: 'We are a no-log VPN meaning that we don’t store any of your traffic logs.',
    more: 'RusVPN is committed to independent, no-log auditing — that audit is in progress. We don’t store your browsing activity, traffic logs, DNS queries, or connection history tied to your account.',
  },
  {
    icon: 'bolt',
    title: 'VPN Protocols',
    body: 'We offer the most advanced VPN protocols for the fastest and most secure connection.',
    more: 'RusVPN is a privacy-focused VPN with a strict no-logs policy, built from the ground up locally in Russia.',
  },
  {
    icon: 'racks',
    title: 'Russian Reliability',
    body: 'Owned and operated in-house, following strict Russian security standards.',
    more: 'RusVPN is run and owned by local people that care about internet privacy and security in Russia. No shadowy megacorporation abroad involvement.',
  },
  {
    wide: true,
    icon: 'globe',
    title: 'Global Coverage',
    body: `${n(f.servers)}+ servers across ${n(f.countries)}+ countries on ${f.continentsWord} continents, so there is always one close to you.`,
    more: 'Pick a country and we place you on the healthiest machine inside it. Automatic switching keeps a busy node from ever becoming your problem.',
    geo: CONTINENTS,
  },
  {
    icon: 'shieldPlus',
    title: 'Unmatched Privacy',
    body: 'No third-party access to your VPN traffic. All data is securely managed from Moscow, free from Western interference.',
    more: 'Secure your online privacy with a VPN that respects your values and protects you from prying eyes as you browse.',
  },
  {
    icon: 'boltLines',
    title: 'Superior Performance',
    body: 'Advanced hardware ensures fast speeds and smooth streaming.',
    more: 'We have optimized streaming servers around the globe, allowing you to get the most from your existing streaming subscription.',
  },
  {
    wide: true,
    icon: 'stack',
    title: 'Dynamic Switching',
    body: 'Automatic server switching prevents slowdowns for uninterrupted service.',
    more: `${n(f.servers)}+ servers worldwide, spanning North America, South America, Europe, Asia, Africa, and Oceania.`,
  },
]

export default function Tech() {
  const [open, setOpen] = useState(-1)
  const ref = useRef(null)
  const facts = useFacts()
  useDismiss(open >= 0, useCallback(() => setOpen(-1), []), ref)

  return (
    <section className="sec wrap" id="tech" style={{ paddingTop: 0 }}>
      <div className="sec-head">
        <div className="col up">
          <span className="eyebrow">Features</span>
          <h2>Powerful Features for Unstoppable Connections</h2>
        </div>
        <p className="aside up" style={{ '--d': '100ms' }}>
          Experience advanced security, blazing-fast speed, and unrestricted access with our VPN.
        </p>
      </div>

      <div className={`bento up${open >= 0 ? ' has-open' : ''}`} id="bento" ref={ref}>
        {tiles(facts).map((t, i) => (
          <button
            key={t.title}
            className={['tile', t.wide && 'wide', i === open && 'is-open'].filter(Boolean).join(' ')}
            data-t=""
            onClick={() => setOpen(i === open ? -1 : i)}
          >
            <span className="togg"><Plus /></span>
            <span className="ic">{TILE_ICONS[t.icon]}</span>
            <h3>{t.title}</h3>
            <p>{t.body}</p>
            <span className="more"><div><p>{t.more}</p></div></span>
            {t.viz && (
              <span className="viz">
                {t.viz.map((h, j) => (
                  <i key={j} style={{ height: `${h}%` }} />
                ))}
              </span>
            )}
            {t.geo && (
              <span className="geo">
                {t.geo.map((g) => (
                  <span key={g}><i />{g}</span>
                ))}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
