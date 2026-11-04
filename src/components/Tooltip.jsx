import { useCallback, useEffect, useRef, useState } from 'react'
import { canHover } from '../hooks'

/* ==========================================================================
   TOOLTIP — a term you can ask about

   A real <button> with aria-expanded, and the explanation in the DOM beside
   it, so it is reachable by keyboard and read by a screen reader — not a
   title attribute only a mouse finds.

   Pinned vs hovered matters more than it looks. On a mouse, moving to the
   button already opened the tip via mouseenter, so a plain "toggle on click"
   reads the tip as open and closes it — clicking the thing you want to read
   makes it disappear. A click always pins; only a second click unpins. A
   pinned tip, or one the keyboard is sitting on, outlives the pointer.

   One tip is open at a time across the whole page. That is module state on
   purpose: the tips live in different sections and none of them should have
   to know the others exist.
   ========================================================================== */

let current = null // { close } of the tip that is up

const GAP = 10
const EDGE = 14

/* Under the button, pulled back inside the viewport if it would hang off
   either edge, flipped above when there is no room below — then the arrow is
   moved so it still points at the button after the clamp. The popup is
   position:fixed and laid out while hidden, so it can be measured first. */
function place(pop, btn) {
  if (!pop || !btn) return
  const b = btn.getBoundingClientRect()
  const w = pop.offsetWidth
  const h = pop.offsetHeight
  let left = b.left + b.width / 2 - 26
  left = Math.max(EDGE, Math.min(left, window.innerWidth - w - EDGE))
  let top = b.bottom + GAP
  let flip = false
  if (top + h > window.innerHeight - EDGE && b.top - GAP - h > EDGE) {
    top = b.top - GAP - h
    flip = true
  }
  pop.classList.toggle('flip', flip)
  pop.style.left = `${Math.round(left)}px`
  pop.style.top = `${Math.round(top)}px`
  const arrow = b.left + b.width / 2 - left - 5
  pop.style.setProperty('--tip-arrow', `${Math.round(Math.max(10, Math.min(arrow, w - 20)))}px`)
}

/**
 * `id` builds the button/popup ids (tipb-<id>, tip-<id>); `term` is the
 * visible words; `name` is how the question is read out, defaulting to the
 * term ("What does "auto-renewal" mean?").
 */
export default function Tooltip({ id, term, name, lead, body }) {
  const [open, setOpen] = useState(null) // null | 'hover' | 'pin'
  const btn = useRef(null)
  const pop = useRef(null)

  const close = useCallback(() => setOpen(null), [])

  const show = (how) => {
    if (current && current.close !== close) current.close()
    current = { close }
    place(pop.current, btn.current)
    setOpen(how)
  }

  useEffect(() => {
    if (!open) {
      if (current?.close === close) current = null
      return
    }
    /* an anchored popup has to follow its anchor or leave */
    const follow = () => place(pop.current, btn.current)
    const onDoc = () => close()
    const onKey = (e) => {
      /* 1.4.13 — a hover/focus popup must be dismissable without moving the pointer */
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
      btn.current?.focus()
    }
    window.addEventListener('scroll', follow, { passive: true })
    window.addEventListener('resize', follow)
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', follow)
      window.removeEventListener('resize', follow)
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  useEffect(() => () => {
    if (current?.close === close) current = null
  }, [close])

  return (
    <span
      className={`tip${open ? ' on' : ''}`}
      onMouseEnter={() => {
        if (!canHover() || open) return
        show('hover')
      }}
      onMouseLeave={() => {
        if (!canHover() || open !== 'hover') return
        if (document.activeElement === btn.current) return
        close()
      }}
    >
      <span>{term}</span>
      <button
        type="button"
        className="tip-btn"
        id={`tipb-${id}`}
        ref={btn}
        aria-expanded={!!open}
        aria-controls={`tip-${id}`}
        aria-label={`What does "${name ?? term}" mean?`}
        onClick={(e) => {
          /* kept off the document, or the close-on-outside-click below would
             take it straight back down */
          e.stopPropagation()
          e.preventDefault()
          if (open === 'pin') close()
          else show('pin')
        }}
        onFocus={() => {
          if (!open) show('hover')
        }}
        onBlur={() => {
          if (open === 'hover') close()
        }}
      >
        ?
      </button>
      <span className="tip-pop" id={`tip-${id}`} role="tooltip" ref={pop}>
        <b>{lead}</b> {body}
      </span>
    </span>
  )
}
