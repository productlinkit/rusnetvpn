import { AC_ICONS, Check, Warn } from '../icons'

/* ==========================================================================
   ACCOUNT PARTS

   The four pieces every panel is built from: a row, a switch, and the two
   feedback strips. Keeping them here is what stops seven panels inventing
   seven slightly different rows.
   ========================================================================== */

/* Every switch on the page behaves the same, so it is one component. It can be
   busy — a toggle that writes to the server must not accept a second click
   before the first has answered. */
export function Switch({ on, onChange, label, busy }) {
  return (
    <button
      type="button"
      className={`sw act${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      style={busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
      onClick={() => onChange(!on)}
    />
  )
}

export function Row({ icon, title, note, children }) {
  return (
    <div className="ac-row">
      {icon && <span className={`ac-ic${icon.red ? ' red' : ''}`}>{AC_ICONS[icon.name ?? icon]}</span>}
      <span className="txt"><b>{title}</b>{note && <span>{note}</span>}</span>
      {children}
    </div>
  )
}

export function Ok({ on, children }) {
  return (
    <div className={`ac-ok${on ? ' on' : ''}`}>
      <Check />
      <span>{children}</span>
    </div>
  )
}

export function Bad({ error }) {
  return (
    <div className={`ac-bad${error ? ' on' : ''}`}>
      <Warn />
      <span>{error?.text ?? error ?? ''}</span>
    </div>
  )
}

/**
 * What a panel shows before its data arrives, or instead of it.
 *
 * A failed read is not a blank panel: it says what went wrong and offers the
 * retry, because the most common cause is a backend that was not running yet.
 */
export function Loader({ loading, error, reload, empty, emptyText, children }) {
  if (loading) return <p className="ac-quiet">Loading…</p>
  if (error) {
    return (
      <>
        <Bad error={error} />
        {reload && (
          <div className="ac-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>Try again</button>
          </div>
        )}
      </>
    )
  }
  if (empty) return <p className="ac-quiet">{emptyText}</p>
  return children
}
