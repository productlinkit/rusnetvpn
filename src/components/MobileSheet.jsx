import { useEffect, useRef } from 'react'
import { Btn } from './ui'
import { BuyBtn } from './Header'
import { NAV_LINKS } from '../data/content'
import { useSession } from '../state/session'
import { trapTab } from '../shared/a11y'

/* ==========================================================================
   MOBILE SHEET

   Six links + a button + the language picker stop fitting well before 1080,
   which is where they used to spill. The stylesheet collapses them into this
   at 1180; the picker stays up in the bar and is not repeated here.

   A <nav>, not a <div>. The sheet lives outside the header, so as a generic
   div its links belonged to no landmark at all — a screen-reader user jumping
   by landmark skipped the entire mobile menu. Both navs are named because
   there are now two.

   It covers the whole viewport, so while it is up the page underneath is not
   a place Tab should reach. It is also closable from the keyboard, and Escape
   hands focus back to the burger — otherwise you dismiss the menu and land at
   the top of the document with no idea where.
   ========================================================================== */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function MobileSheet() {
  const { user, signOut, openAuth, openAccount, menuOpen, setMenuOpen } = useSession()
  const ref = useRef(null)
  const close = () => setMenuOpen(false)

  useEffect(() => {
    const sheet = ref.current
    if (!menuOpen || !sheet) return
    /* first thing in the sheet, not the sheet itself — the sheet is not a
       control, and landing on it announces nothing useful. Two frames later,
       because the sheet fades in from visibility:hidden and focus() on a
       hidden element is silently dropped. */
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const first = [...sheet.querySelectorAll(FOCUSABLE)].find((el) => el.offsetParent !== null)
        first?.focus()
      })
    })
    const trap = trapTab(sheet)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        document.getElementById('burger')?.focus()
        return
      }
      trap(e)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, setMenuOpen])

  return (
    <nav className="sheet" id="sheet" aria-label="Mobile menu" ref={ref}>
      {NAV_LINKS.map((l) => (
        <a key={l.href} href={l.href} onClick={close}>
          {l.label}
        </a>
      ))}

      {/* both CTA rows are always in the document; body.is-auth decides which
          one shows, the same way it decides for the bar above */}
      <div className="sheet-cta" id="sheet-guest-cta">
        <a
          href="#sign-in"
          className="btn btn-ghost"
          data-auth="in"
          onClick={(e) => {
            e.preventDefault()
            close()
            openAuth('in')
          }}
        >
          Login
        </a>
        <BuyBtn variant="red" magnetic={false} onClick={close}>Get RusVPN</BuyBtn>
      </div>

      <div className="sheet-acct">
        <span className="ava lg">{user?.initial ?? 'Y'}</span>
        <span className="acct-id">
          <b>{user?.email ?? 'you@email.com'}</b>
          <i>Subscription · Active</i>
        </span>
      </div>

      <div className="sheet-cta" id="sheet-acct-cta" style={{ display: 'none' }}>
        <Btn
          href="#account"
          variant="primary"
          data-account="overview"
          onClick={(e) => {
            e.preventDefault()
            openAccount('overview')
          }}
        >
          My Account
        </Btn>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            signOut()
            close()
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
