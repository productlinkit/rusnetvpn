import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Chat, Telegram, WhatsApp } from './icons'
import { useDismiss } from '../hooks'

/* ==========================================================================
   CHAT FAB

   Exposes `open()` on a ref so the account page's "Start a chat" row can
   close itself and land you here with the options already out. Anything else
   on the page that means "talk to us" — the FAQ's "Send a message", the
   footer's — opts in with a data-fab-open attribute instead of a prop chain:
   one delegated listener here, so a new launcher needs no wiring.
   ========================================================================== */

const Fab = forwardRef(function Fab(_props, api) {
  const [open, setOpen] = useState(false)
  const [yieldTo, setYieldTo] = useState(false)
  const ref = useRef(null)
  const toggle = useRef(null)

  /* opening by launcher moves focus to the first option, so a keyboard user
     lands on something they can press rather than back where they were */
  const openWithFocus = useCallback(() => {
    setOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => ref.current?.querySelector('.opts a')?.focus()))
  }, [])

  useImperativeHandle(api, () => ({ open: openWithFocus }), [openWithFocus])

  /* Escape closes and hands focus back to the button, as every other menu on
     the page does; an outside click just closes */
  const close = useCallback(() => {
    setOpen(false)
    if (ref.current?.contains(document.activeElement)) toggle.current?.focus()
  }, [])
  useDismiss(open, close, ref)

  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest?.('[data-fab-open]')) return
      e.preventDefault()
      openWithFocus()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [openWithFocus])

  /* 2.4.11 Focus Not Obscured. The button is fixed over the bottom-right
     corner and sat squarely on top of the footer's "Chat on Telegram" link —
     tabbing there put the focus ring completely behind it. It steps aside
     while anything underneath it holds focus, and comes back the moment focus
     leaves.

     Re-checked on scroll, not only on focus: focusin fires before the browser
     scrolls the new element into view, so the first measurement uses the
     geometry the element had *before* it moved — it read as clear of the
     button and then slid underneath it. */
  useEffect(() => {
    const check = () => {
      const fab = ref.current
      const t = document.activeElement
      if (!fab || !t || t === document.body || fab.contains(t)) {
        setYieldTo(false)
        return
      }
      const f = fab.getBoundingClientRect()
      const r = t.getBoundingClientRect()
      setYieldTo(r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top)
    }
    const clear = () => setYieldTo(false)
    document.addEventListener('focusin', check)
    document.addEventListener('focusout', clear)
    window.addEventListener('scroll', check, { passive: true })
    return () => {
      document.removeEventListener('focusin', check)
      document.removeEventListener('focusout', clear)
      window.removeEventListener('scroll', check)
    }
  }, [])

  return (
    <div className={['fab', open && 'on', yieldTo && 'yield'].filter(Boolean).join(' ')} id="fab" ref={ref}>
      <div className="opts">
        <a href="#faq" aria-label="Chat on WhatsApp"><WhatsApp />WhatsApp</a>
        <a href="#faq" aria-label="Chat on Telegram"><Telegram fill="#2AABEE" />Telegram</a>
      </div>
      <button
        ref={toggle}
        className="toggle"
        id="fabtoggle"
        aria-label="Customer service"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Chat aria-hidden="true" focusable="false" />
      </button>
    </div>
  )
})

export default Fab
