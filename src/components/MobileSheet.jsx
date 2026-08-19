import { Btn } from './ui'
import { NAV_LINKS } from '../data/content'
import { useSession } from '../state/session'

/* ==========================================================================
   MOBILE SHEET

   Six links + a button + the language picker stop fitting well before 1080,
   which is where they used to spill. The stylesheet collapses them into this
   at 1180; the picker stays up in the bar and is not repeated here.
   ========================================================================== */

export default function MobileSheet() {
  const { user, signOut, openAuth, openAccount, setMenuOpen } = useSession()

  return (
    <div className="sheet">
      {NAV_LINKS.map((l) => (
        <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
          {l.label}
        </a>
      ))}

      {/* signed out shows Login + Subscribe, signed in swaps to My Account + Log out */}
      {!user && (
        <div className="sheet-cta">
          <a
            href="#sign-in"
            className="btn btn-ghost"
            onClick={(e) => {
              e.preventDefault()
              setMenuOpen(false)
              openAuth('in')
            }}
          >
            Login
          </a>
          <Btn href="#pricing" variant="red" onClick={() => setMenuOpen(false)}>Subscribe Now</Btn>
        </div>
      )}

      <div className="sheet-acct">
        <span className="ava lg">{user?.initial ?? 'Y'}</span>
        <span className="acct-id">
          <b>{user?.email ?? 'you@email.com'}</b>
          <i>Subscription · Active</i>
        </span>
      </div>

      {user && (
        <div className="sheet-cta" style={{ display: 'grid' }}>
          <Btn
            href="#account"
            variant="primary"
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
              setMenuOpen(false)
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
