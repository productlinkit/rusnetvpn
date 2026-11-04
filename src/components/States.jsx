/* ==========================================================================
   EMPTY / LOADING / ERROR STATES

   A list that can load, come back empty or fail gets a designed screen for
   each, not a blank gap: what happened, in words, and the next move as a real
   button. `.state` is display:none until `.on`, the same switch the static
   page flips, so a state can stay mounted and just be shown — which keeps a
   focused retry button from being torn out from under the keyboard.
   ========================================================================== */

const svg = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.8',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

export const STATE_ICONS = {
  /* a region filter that matched nothing */
  globe: (
    <svg {...svg}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9" /></svg>
  ),
  /* a search that matched nothing */
  search: (
    <svg {...svg}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M8 10.5h5" /></svg>
  ),
  /* a read that failed */
  warn: (
    <svg {...svg}><path d="M12 3l9 16H3l9-16z" /><path d="M12 9v4M12 16.5h.01" /></svg>
  ),
}

export function StateCard({ on, bad, icon, title, children, actions, id }) {
  return (
    <div className={`state${bad ? ' state--bad' : ''}${on ? ' on' : ''}`} id={id}>
      <span className="si">{STATE_ICONS[icon]}</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {actions}
    </div>
  )
}

/* The shape the rows will take, shown while they are on their way. Hidden
   from assistive tech: the "Loading regions…" announcement is what a screen
   reader gets, not four rows of nothing. */
export function SkeletonRows({ on, rows = 4, id }) {
  return (
    <div className={`rows skel${on ? ' on' : ''}`} id={id} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skel-row" key={i}>
          <span className="skel-bar w1" />
          <span className="skel-bar w2" />
          <span className="skel-bar w3" />
          <span className="skel-bar dot" />
        </div>
      ))}
    </div>
  )
}
