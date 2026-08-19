import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { Chat, Telegram, WhatsApp } from './icons'
import { useDismiss } from '../hooks'

/* ==========================================================================
   CHAT FAB

   Exposes `open()` on a ref so the account page's "Start a chat" row can
   close itself and land you here with the options already out.
   ========================================================================== */

const Fab = forwardRef(function Fab(_props, api) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useDismiss(open, useCallback(() => setOpen(false), []), ref)
  useImperativeHandle(api, () => ({ open: () => setOpen(true) }), [])

  return (
    <div className={`fab${open ? ' on' : ''}`} ref={ref}>
      <div className="opts">
        <a href="#faq" aria-label="Chat on WhatsApp"><WhatsApp />WhatsApp</a>
        <a href="#faq" aria-label="Chat on Telegram"><Telegram />Telegram</a>
      </div>
      <button
        className="toggle"
        aria-label="Customer service"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Chat />
      </button>
    </div>
  )
})

export default Fab
