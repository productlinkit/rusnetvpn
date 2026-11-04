import { useEffect, useMemo, useRef, useState } from 'react'
import { Arrow, PhotoGlyph } from '../components/icons'
import SearchField, { useDebounced } from '../components/SearchField'
import { SkeletonRows, StateCard } from '../components/States'
import { REGIONS } from '../data/content'
import { getLocations } from '../features/servers/api'
import { useResource } from '../features/account/useResource'
import { canHover } from '../hooks'
import { reducedMotion, say } from '../shared/a11y'

/* ==========================================================================
   SERVERS — region rows with a hover preview, a filter, and every state

   The rows are the real fleet, from GET /servers/locations — the same list the
   mobile app's server picker shows and the same one the CMS edits. That list
   is per country, ninety-odd of them; the section reads it as six continents
   (REGIONS in data/content.js says which row a country sits on), because six
   rows is a coverage claim you can take in at a glance and ninety is a phone
   book. Every count on a row, and the headline above, is summed from the
   response, so the coverage section cannot drift from the fleet it describes.

   The list has the three states a real fetch has: it loads (a skeleton in the
   shape of the rows), it can fail (with a retry that really re-fetches), and
   a filter can match nothing (with the way back). The filter matches the
   region and the countries inside it, so "Germany" finds Europe.

   The photo chases the cursor with a bit of lag, which is the whole effect.
   It is driven by one animation frame loop rather than a write per mousemove,
   and the loop is torn down the moment the pointer leaves the list so a page
   sitting idle is not still scheduling frames.
   ========================================================================== */

const plural = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

/* country code -> region, built once from the table */
const REGION_OF = new Map(REGIONS.flatMap((r) => r.codes.split(' ').map((cc) => [cc, r.key])))

function toRegions(locations) {
  const blank = (r) => ({ ...r, countries: new Set(), servers: 0, load: null, names: [] })
  const rows = REGIONS.map(blank)
  const other = blank({ key: 'other', name: 'Other locations', photo: null })
  const byKey = new Map(rows.map((r) => [r.key, r]))
  for (const l of locations) {
    const cc = l.country_code.toLowerCase()
    const row = byKey.get(REGION_OF.get(cc)) ?? other
    row.countries.add(cc)
    row.servers += l.server_count
    row.names.push(l.country_name, l.city ?? '')
    /* the least-loaded server anywhere in the region — what you get if you
       pick it, which is the number worth showing */
    row.load = row.load === null ? l.best_load : Math.min(row.load, l.best_load)
  }
  /* a continent the fleet does not reach yet is not a row — listing it with
     zero servers would read as a claim */
  return [...rows, other].filter((r) => r.servers > 0)
}

export default function Servers() {
  const locations = useResource(getLocations)
  const regions = useMemo(() => toRegions(locations.data ?? []), [locations.data])
  const servers = regions.reduce((n, r) => n + r.servers, 0)
  const countries = regions.reduce((n, r) => n + r.countries.size, 0)

  const [query, setQuery] = useState('')
  const term = useDebounced(query).trim()
  const needle = term.toLowerCase()
  const input = useRef(null)
  const hits = regions.filter(
    (r) =>
      !needle ||
      `${r.name} ${plural(r.countries.size, 'country', 'countries')} ${r.servers} servers ${r.names.join(' ')}`
        .toLowerCase()
        .includes(needle),
  )

  const loaded = !locations.loading && !locations.error
  const count = !loaded
    ? ''
    : !term
      ? `${plural(servers, 'server', 'servers')} across ${plural(countries, 'country', 'countries')}, in ${plural(regions.length, 'region', 'regions')}`
      : `${plural(hits.length, 'region', 'regions')} matching “${term}”`

  /* A list that silently rearranges itself is invisible to anyone not watching
     it, so a filter result is announced — once, after the typing settles. */
  useEffect(() => {
    if (term && loaded) say(count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, loaded])

  /* the loading state is announced too — but not on first paint, where the
     list is just part of the page arriving; only on a retry someone asked for */
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      if (!locations.loading) first.current = false
      return
    }
    say(locations.loading ? 'Loading regions…' : locations.error ? 'The server list is still unavailable.' : 'Regions loaded.')
  }, [locations.loading, locations.error])

  const clear = () => {
    setQuery('')
    input.current?.focus()
  }

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
    /* a panel that chases the cursor is exactly the kind of motion the setting
       exists to stop — the CSS hides it, this stops the rAF loop behind it */
    if (reducedMotion()) return
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
              <h2>{servers > 0 ? `${servers.toLocaleString('en-US')}+ servers worldwide.` : 'Servers worldwide.'}</h2>
            </div>
            <p className="aside up" style={{ '--d': '100ms' }}>
              Spanning North America, South America, Europe, Asia, Africa, and Oceania. Automatic server
              switching prevents slowdowns for uninterrupted service.
            </p>
          </div>

          <div className="srv-tools up">
            <SearchField
              id="srv-q"
              label="Filter regions"
              placeholder="Filter by region…"
              clearLabel="Clear filter"
              value={query}
              onChange={setQuery}
              inputRef={input}
            />
            <p className="srch-count" id="srv-count">{count}</p>
          </div>

          <SkeletonRows id="srv-skel" on={locations.loading} />

          <div className="rows up" id="rows" hidden={!loaded || regions.length === 0}>
            {regions.map((r) => (
              <a
                key={r.key}
                className="rowi"
                href="#"
                hidden={!hits.includes(r)}
                /* there is no per-region page yet, so the row is a hover
                   affordance rather than a link that dumps you at the top */
                onClick={(e) => e.preventDefault()}
                onMouseEnter={(e) => enter(e, r.photo)}
                onMouseMove={move}
                onMouseLeave={leave}
              >
                <span className="nm">{r.name}</span>
                <span className="tag">
                  {plural(r.countries.size, 'country', 'countries')} · {plural(r.servers, 'server', 'servers')}
                </span>
                <span className="lat mono">load <b>{r.load}%</b></span>
                <span className="go"><Arrow aria-hidden="true" focusable="false" /></span>
              </a>
            ))}
          </div>

          <StateCard
            id="srv-empty"
            on={loaded && regions.length > 0 && hits.length === 0}
            icon="globe"
            title={<>No region called “<span id="srv-empty-term">{term}</span>”</>}
            actions={
              <button type="button" className="btn btn-white btn-sm" id="srv-empty-clear" onClick={clear}>
                Show every region
              </button>
            }
          >
            We cover six continents. Try a continent name, or clear the filter to see all of them.
          </StateCard>

          {/* the fetch worked and the fleet is empty — not an error, and not
              something a filter caused, so it gets its own words */}
          <StateCard on={loaded && regions.length === 0} icon="globe" title="The server list is empty right now">
            Locations are being updated. Check back in a few minutes.
          </StateCard>

          <StateCard
            id="srv-error"
            bad
            on={!!locations.error}
            icon="warn"
            title="We could not reach the server list"
            actions={
              <button type="button" className="btn btn-white btn-sm" id="srv-retry" onClick={locations.reload}>
                Try again
              </button>
            }
          >
            Your connection is fine — ours hiccuped. Nothing about your account has changed.
          </StateCard>
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
