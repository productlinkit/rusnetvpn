import { useCallback, useRef, useState } from 'react'
import { Plus, TILE_ICONS } from '../components/icons'
import { TILES } from '../data/content'
import { useDismiss } from '../hooks'

/* ==========================================================================
   TECH — the bento grid

   One tile at a time. Opening a tile dims and shrinks the others, which is
   what makes the extra paragraph readable instead of just longer.
   ========================================================================== */

export default function Tech() {
  const [open, setOpen] = useState(-1)
  const ref = useRef(null)
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

      <div className={`bento up${open >= 0 ? ' has-open' : ''}`} ref={ref}>
        {TILES.map((t, i) => (
          <button
            key={t.title}
            className={['tile', t.wide && 'wide', i === open && 'is-open'].filter(Boolean).join(' ')}
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
