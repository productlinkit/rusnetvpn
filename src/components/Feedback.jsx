import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DLG_FALLBACK, reducedMotion, restoreFocus, say, shout, trapTab } from '../shared/a11y'

/* ==========================================================================
   FEEDBACK — the live regions, the dialog and the toasts

   One overlay object at three severities and one toast stack, shared by every
   screen, so "are you sure" always looks, sounds and dismisses the same way.

     const dialog = useDialog()
     dialog({ kind: 'danger', title, body, actions: [{ label, style, act }] })

     const toast = useToast()
     toast('Saved')            // polite
     toast('Did not save', 'bad')  // assertive

   The dialog is a native <dialog> opened with showModal(), which supplies the
   focus trap, Escape, the inert background and the return of focus — the four
   things a hand-rolled overlay has to reimplement.
   ========================================================================== */

const DialogContext = createContext(() => {})
const ToastContext = createContext(() => {})

export const useDialog = () => useContext(DialogContext)
export const useToast = () => useContext(ToastContext)

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const DLG_ICON = {
  danger: <><path d="M12 3l9 16H3l9-16z" /><path d="M12 9.5v4M12 16.8h.01" /></>,
  warn: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2h.01" /></>,
  ok: <><circle cx="12" cy="12" r="9" /><path d="M8.2 12.2 11 15l5-5.6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8h.01" /></>,
}

const Close = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)

function Dialog({ spec, onClosed }) {
  const ref = useRef(null)
  const opener = useRef(null)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timer = useRef(0)

  /* closing is held back by exactly one animation: a native <dialog> leaves the
     top layer the instant close() runs, so an exit only exists if close() waits
     for the frames — with a timer behind it, because a dismissal that can get
     stuck open is worse than no animation at all */
  const hardClose = useCallback(() => {
    clearTimeout(timer.current)
    closingRef.current = false
    setClosing(false)
    const d = ref.current
    if (d?.open) d.close()
  }, [])

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    if (reducedMotion()) {
      hardClose()
      return
    }
    setClosing(true)
    timer.current = setTimeout(hardClose, 600)
  }, [hardClose])

  useEffect(() => {
    const d = ref.current
    if (!d || !spec) return
    clearTimeout(timer.current)
    closingRef.current = false
    setClosing(false)
    opener.current = document.activeElement
    if (!d.open) d.showModal()
    /* land on the least destructive action, never on "delete everything" */
    const safe = d.querySelector('.dlg-actions .btn-ghost') || d.querySelector('.dlg-actions button')
    safe?.focus()
    const trap = trapTab(d)
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [spec])

  /* Esc dismisses the topmost layer and nothing else — every other layer
     listens for Escape on document, so without this one press closed the
     dialog *and* the account page under it */
  useEffect(() => {
    const swallow = (e) => {
      if (e.key === 'Escape' && ref.current?.open) e.stopPropagation()
    }
    document.addEventListener('keydown', swallow, true)
    return () => document.removeEventListener('keydown', swallow, true)
  }, [])

  const onClose = () => {
    const target = opener.current
    opener.current = null
    onClosed()
    /* deferred a tick: the engine performs its own focus restore after
       'close', and it overwrote an immediate one */
    setTimeout(() => restoreFocus(target, DLG_FALLBACK), 0)
  }

  const kind = spec?.kind ?? 'info'
  const actions = spec?.actions ?? [{ label: 'Close', style: 'btn-ghost' }]

  return (
    <dialog
      ref={ref}
      id="dlg"
      className={`dlg dlg--${kind}${closing ? ' is-closing' : ''}`}
      aria-modal="true"
      aria-labelledby="dlg-title"
      aria-describedby="dlg-body"
      onClose={onClose}
      onCancel={(e) => {
        if (reducedMotion()) return
        e.preventDefault()
        close()
      }}
      /* a click on the backdrop lands on the <dialog> itself, never on its contents */
      onClick={(e) => e.target === ref.current && close()}
      onAnimationEnd={(e) => e.target === ref.current && e.animationName === 'dlgOut' && hardClose()}
    >
      <div className="dlg-inner">
        <button type="button" className="dlg-x" aria-label="Close" onClick={close}>
          <Close />
        </button>
        <div className="dlg-top">
          <span className="dlg-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" {...stroke}>{DLG_ICON[kind] ?? DLG_ICON.info}</svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 id="dlg-title">{spec?.title}</h2>
            <div className="dlg-body" id="dlg-body">{spec?.body}</div>
          </div>
        </div>
        <div className="dlg-actions">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`btn btn-sm ${a.style ?? 'btn-ghost'}`}
              onClick={() => {
                close()
                a.act?.()
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}

function Toast({ t, onGone }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setOut(true), 5200)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!out) return
    const id = setTimeout(onGone, reducedMotion() ? 0 : 260)
    return () => clearTimeout(id)
  }, [out, onGone])
  return (
    <div className={`toast toast--${t.kind}${out ? ' out' : ''}`}>
      <svg className="ti" viewBox="0 0 24 24" {...stroke} aria-hidden="true" focusable="false">
        {t.kind === 'bad' ? <><path d="M12 3l9 16H3l9-16z" /><path d="M12 9v4M12 16.4h.01" /></> : <path d="M20 6.5 9.5 17 4 11.5" />}
      </svg>
      <span className="tx">{t.msg}</span>
      <button type="button" className="tclose" aria-label="Dismiss" onClick={() => setOut(true)}>
        <Close />
      </button>
    </div>
  )
}

export function FeedbackProvider({ children }) {
  const [spec, setSpec] = useState(null)
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const openDialog = useCallback((o) => setSpec({ ...o }), [])
  const toast = useCallback((msg, kind = 'ok') => {
    /* the toast itself is not a live region — the shared one announces it, so
       a screen reader hears it once rather than once per visual element */
    ;(kind === 'bad' ? shout : say)(msg)
    seq.current += 1
    setToasts((list) => [...list, { id: seq.current, msg, kind }])
  }, [])
  const drop = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const dialogValue = useMemo(() => openDialog, [openDialog])

  return (
    <DialogContext.Provider value={dialogValue}>
      <ToastContext.Provider value={toast}>
        {children}
        {/* outside every landmark on purpose: the page inerts its siblings while
            an overlay is up, and these three are skipped by id */}
        <p className="sr-only" id="live-polite" role="status" aria-live="polite" aria-atomic="true" />
        <p className="sr-only" id="live-alert" role="alert" aria-live="assertive" aria-atomic="true" />
        <Dialog spec={spec} onClosed={() => setSpec(null)} />
        <div className="toasts" id="toasts" role="region" aria-label="Notifications">
          {toasts.map((t) => <Toast key={t.id} t={t} onGone={() => drop(t.id)} />)}
        </div>
      </ToastContext.Provider>
    </DialogContext.Provider>
  )
}
