import { useEffect, useRef } from 'react'
import { Arrow, PhotoGlyph } from '../components/icons'
import { Loader } from '../components/account/parts'
import { getLocations } from '../features/servers/api'
import { useResource } from '../features/account/useResource'
import { canHover } from '../hooks'

/* ==========================================================================
   SERVERS — region rows with a hover preview

   The photo chases the cursor with a bit of lag, which is the whole effect.
   It is driven by one animation frame loop rather than a write per mousemove,
   and the loop is torn down the moment the pointer leaves the list so a page
   sitting idle is not still scheduling frames.

   The rows are the real fleet, from GET /servers/locations — the same list the
   mobile app's server picker shows and the same one the CMS edits. They used
   to be six hardcoded regions with invented latencies ("Europe · 32 countries
   · 240 servers, avg 14 ms"), which meant the coverage section was the one
   part of the site that could not be wrong, because it was not connected to
   anything. The headline counts are summed from the same response for the same
   reason.
   ========================================================================== */

export default function Servers() {
  const locations = useResource(getLocations)
  const rows = locations.data ?? []
  const servers = rows.reduce((n, r) => n + r.server_count, 0)
  const countries = new Set(rows.map((r) => r.country_code)).size

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
              <h2>
                {servers > 0
                  ? `${servers.toLocaleString('en-US')} server${servers === 1 ? '' : 's'} across ${countries} ${countries === 1 ? 'country' : 'countries'}.`
                  : 'Servers worldwide.'}
              </h2>
            </div>
            <p className="aside up" style={{ '--d': '100ms' }}>
              Spanning North America, South America, Europe, Asia, Africa, and Oceania. Automatic server
              switching prevents slowdowns for uninterrupted service.
            </p>
          </div>

          <Loader
            loading={locations.loading}
            error={locations.error}
            reload={locations.reload}
            empty={rows.length === 0}
            emptyText="The server list is not available right now."
          >
            <div className="rows up">
              {rows.map((r) => (
                <a
                  key={r.id}
                  className="rowi"
                  href="#"
                  /* there is no per-location page yet, so the row is a hover
                     affordance rather than a link that dumps you at the top */
                  onClick={(e) => e.preventDefault()}
                  /* no per-location photography, so the cursor preview stays
                     off here rather than following an empty frame around */
                  onMouseEnter={(e) => enter(e, null)}
                  onMouseMove={move}
                  onMouseLeave={leave}
                >
                  <span className="nm">{r.flag_emoji ? `${r.flag_emoji} ` : ''}{r.country_name}</span>
                  <span className="tag">
                    {[r.city, `${r.server_count} server${r.server_count === 1 ? '' : 's'}`, r.has_free ? 'free tier' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="lat mono">load <b>{r.best_load}%</b></span>
                  <span className="go"><Arrow /></span>
                </a>
              ))}
            </div>
          </Loader>
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
