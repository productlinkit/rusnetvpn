import { useCallback, useEffect, useRef, useState } from 'react'
import { AC_ICONS, Check } from '../icons'

/* ==========================================================================
   ACCOUNT PARTS

   The pieces every panel is built from: a row, a switch, the feedback strips,
   and the field. Keeping them here is what stops seven panels inventing seven
   slightly different rows.

   The field and the form alert are shared with the auth page too — the
   change-password form inside the account must never behave differently from
   the sign-in form outside it.
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
      aria-busy={busy || undefined}
      disabled={busy}
      style={busy ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
      onClick={() => onChange(!on)}
    />
  )
}

export function Row({ icon, title, note, children, ...rest }) {
  return (
    <div className="ac-row" {...rest}>
      {icon && <span className={`ac-ic${icon.red ? ' red' : ''}`}>{AC_ICONS[icon.name ?? icon]}</span>}
      <span className="txt"><b>{title}</b>{note && <span>{note}</span>}</span>
      {children}
    </div>
  )
}

/* role="status": the strip is in the DOM from the start, so turning it on is a
   change to its text — which is the thing a status region announces */
export function Ok({ on, children }) {
  return (
    <div className={`ac-ok${on ? ' on' : ''}`} role="status">
      {on && <Check aria-hidden="true" focusable="false" />}
      <span>{on ? children : ''}</span>
    </div>
  )
}

/* ---------- the form-level alert — WCAG 3.3.1 ----------
   Per-field errors say what is wrong with a field. This says what is wrong
   with the attempt: the server refused it, the network dropped — or, as a
   summary, which fields need fixing, each entry a jump link to its field so a
   long form does not make you hunt.

   Rendered empty at rest rather than mounted on demand: a live region that
   arrives in the same frame as its text is one some screen readers never read.

     alert = { kind: 'bad' | 'ok' | 'info', lead?, items?: [{ id, label, msg }], body? } */
const svg = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false,
}
const ALERT_ICON = <svg {...svg}><path d="M12 3l9 16H3l9-16z" /><path d="M12 9v4M12 16.4h.01" /></svg>
const OK_ICON = <svg {...svg}><path d="M20 6.5 9.5 17 4 11.5" /></svg>

export function FormAlert({ alert, id }) {
  const kind = alert?.kind ?? 'bad'
  return (
    <div className={`f-alert f-alert--${kind}${alert ? ' on' : ''}`} id={id} role="alert" aria-live="assertive">
      {alert && (
        <>
          {kind === 'ok' ? OK_ICON : ALERT_ICON}
          <div>
            {alert.lead && <b>{alert.lead}</b>}
            {alert.items && (
              <ul>
                {alert.items.map((it) => (
                  <li key={it.id}>
                    <a
                      href={`#${it.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(it.id)?.focus()
                      }}
                    >
                      {it.label} — {it.msg}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {alert.body}
          </div>
        </>
      )}
    </div>
  )
}

/** A failed read or write, in the same strip the forms use. */
export function Bad({ error }) {
  const text = error?.text ?? error ?? ''
  return <FormAlert alert={text ? { kind: 'bad', body: text } : null} />
}

/** A count turns "something is wrong somewhere" into a finite job. */
export const fixLead = (n) => (n === 1 ? 'One thing needs fixing' : `${n} things need fixing`)

/* ---------- the field — WCAG 3.3.1 / 3.3.2 ----------
   A <div>, not a wrapping <label>. A wrapping label folds the hint and the
   error into the input's accessible name, so the field announced itself as
   "Email address Your download link goes here Please enter a valid email".
   Explicit for/id keeps the name to the label, and aria-describedby carries
   the rest — the hint first (the rule, stated before you can break it), then
   the error once there is one.

   `slot` names the wrapper, the hint and the error (fld-email, er-email) the
   way the static page did; `pw` makes room for the reveal button, passed in
   as `after`. */
export function Field({ id, slot = id, label, hint, error, good, after, pw, inputRef, ...input }) {
  const described = [hint && `hint-${slot}`, `er-${slot}`].filter(Boolean).join(' ')
  return (
    <div className={`fld${error ? ' bad' : good ? ' good' : ''}`} id={`fld-${slot}`}>
      <label className="lbl" id={`lbl-${slot}`} htmlFor={id}>{label}</label>
      <span className={pw ? 'pwwrap fieldwrap' : 'fieldwrap'}>
        <input
          ref={inputRef}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          {...input}
        />
        <span className="ok-tick" aria-hidden="true" />
        {after}
      </span>
      {hint && <span className="hint" id={`hint-${slot}`}>{hint}</span>}
      <em className="err" id={`er-${slot}`}>{error}</em>
    </div>
  )
}

/**
 * Field-by-field validation, with the timing the static page settled on —
 * "reward early, punish late": a field is judged when you leave it, and once it
 * is wrong it is re-checked on every keystroke, so the error goes away the
 * moment it is fixed and never appears while you are still mid-word.
 *
 *   const v = useFieldCheck(values, (key, values) => message | null)
 *   <Field {...v.props('email')} … />   error, good, onBlur
 *   v.validate(keys)   -> [{ key, msg }], and marks every one of them
 *   v.show(map)        -> marks the fields the server named, and only those
 */
export function useFieldCheck(values, check) {
  const [marks, setMarks] = useState({})
  const live = useRef({ values, check })
  live.current = { values, check }
  const prev = useRef(values)

  /* a keystroke: re-check a field that is already wrong, and take the tick off
     one that was right — it has not been left yet, so it is not judged yet */
  useEffect(() => {
    const before = prev.current
    prev.current = values
    const changed = Object.keys(values).filter((k) => values[k] !== before[k])
    if (!changed.length) return
    setMarks((m) => {
      let next = m
      for (const k of changed) {
        if (m[k]?.error) {
          const msg = check(k, values)
          next = { ...next, [k]: { error: msg || null, good: !msg && !!values[k] } }
        } else if (m[k]?.good) {
          next = { ...next, [k]: { error: null, good: false } }
        }
      }
      return next
    })
  })

  const blur = useCallback((key) => {
    const { values: vals, check: chk } = live.current
    const msg = chk(key, vals)
    setMarks((m) => ({ ...m, [key]: { error: msg || null, good: !msg && !!vals[key] } }))
  }, [])

  const validate = useCallback((keys) => {
    const { values: vals, check: chk } = live.current
    const bad = []
    const next = {}
    for (const k of keys) {
      const msg = chk(k, vals)
      next[k] = { error: msg || null, good: !msg && !!vals[k] }
      if (msg) bad.push({ key: k, msg })
    }
    setMarks(next)
    return bad
  }, [])

  const show = useCallback((map) => {
    const next = {}
    for (const [k, msg] of Object.entries(map)) next[k] = { error: msg, good: false }
    setMarks(next)
  }, [])

  const reset = useCallback(() => setMarks({}), [])

  const props = (key) => ({
    error: marks[key]?.error ?? null,
    good: !!marks[key]?.good,
    onBlur: () => blur(key),
  })

  return { props, validate, show, reset }
}

/**
 * The submit button's pending state. A real submit is not instant: the button
 * holds a spinner, and a second press does nothing.
 *
 * aria-disabled, not disabled — a disabled button drops out of the tab order,
 * and the focus you were standing on vanishes mid-submit.
 */
export function busyProps(busy, className) {
  return {
    className: `${className}${busy ? ' is-busy' : ''}`,
    'aria-disabled': busy || undefined,
  }
}

/**
 * What a panel shows before its data arrives, or instead of it.
 *
 * A failed read is not a blank panel: it says what went wrong and offers the
 * retry, because the most common cause is a backend that was not running yet.
 */
export function Loader({ loading, error, reload, empty, emptyText, children }) {
  if (loading) return <p className="ac-quiet" role="status">Loading…</p>
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
