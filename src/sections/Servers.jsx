import { useEffect, useRef } from 'react'
import { Arrow, PhotoGlyph } from '../components/icons'
import { REGIONS } from '../data/content'
import { canHover } from '../hooks'

/* ==========================================================================
   SERVERS — region rows with a hover preview

   The photo chases the cursor with a bit of lag, which is the whole effect.
   It is driven by one animation frame loop rather than a write per mousemove,
   and the loop is torn down the moment the pointer leaves the list so a page
   sitting idle is not still scheduling frames.
   ========================================================================== */

export default function Servers() {
  const peek = useRef(null)
  const img = useRef(null)
  /* pointer target and the eased position chasing it, kept out of state so
     moving the mouse never triggers a render */
  const pos = useRef({ px: 0, py: 0, tx: 0, ty: 0, raf: 0 })

  useEffect(() => () => cancelAnimationFrame(pos.current.raf), [])

  const loop = () => {
    const p = pos.current
    p.px += (p.tx - p.px) * 0.14
    p.py += (p.ty - p.py) * 0.14
    if (peek.current) {
      peek.current.style.left = p.px + 'px'
      peek.current.style.top = p.py + 'px'
    }
    p.raf = requestAnimationFrame(loop)
  }

  const enter = (e, src) => {
    if (!canHover()) return
    /* Oceania has no photo yet — no source means no preview, rather than a
       broken request and an empty frame following the cursor */
    if (!src) return
    const p = pos.current
    if (img.current) img.current.src = src
    p.tx = p.px = e.clientX
    p.ty = p.py = e.clientY
    peek.current?.classList.add('on')
    if (!p.raf) loop()
  }

  const move = (e) => {
    pos.current.tx = e.clientX
    pos.current.ty = e.clientY
  }

  const leave = () => {
    peek.current?.classList.remove('on')
    cancelAnimationFrame(pos.current.raf)
    pos.current.raf = 0
  }

  return (
    <>
      <section className="navyband" id="servers">
        <div className="wrap sec">
          <div className="sec-head">
            <div className="col up">
              <span className="eyebrow is-neutral">Global Coverage</span>
              <h2>700+ servers worldwide.</h2>
            </div>
            <p className="aside up" style={{ '--d': '100ms' }}>
              Spanning North America, South America, Europe, Asia, Africa, and Oceania. Automatic server
              switching prevents slowdowns for uninterrupted service.
            </p>
          </div>

          <div className="rows up">
            {REGIONS.map((r) => (
              <a
                key={r.name}
                className="rowi"
                href="#"
                /* there is no per-region page yet, so the row is a hover
                   affordance rather than a link that dumps you at the top */
                onClick={(e) => e.preventDefault()}
                onMouseEnter={(e) => enter(e, r.peek)}
                onMouseMove={move}
                onMouseLeave={leave}
              >
                <span className="nm">{r.name}</span>
                <span className="tag">{r.tag}</span>
                <span className="lat mono">avg <b>{r.lat}</b></span>
                <span className="go"><Arrow /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <figure className="media" id="peek" ref={peek}>
        {/* if a photo ever fails to load, get out of the way and let the
            placeholder plate underneath show through */}
        <img
          ref={img}
          alt=""
          decoding="async"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
          onLoad={(e) => { e.currentTarget.style.visibility = 'visible' }}
        />
        <span className="ph"><PhotoGlyph /><b>region photo</b>800 × 600</span>
      </figure>
    </>
  )
}
