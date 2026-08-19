import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandMark } from './Brand'
import { AC_ICONS, Back } from './icons'
import {
  Billing,
  CheckoutSuccess,
  Devices,
  Notifications,
  Overview,
  Security,
  Subscription,
  Support,
} from './account/panels'
import * as accountApi from '../features/account/api'
import { useResource } from '../features/account/useResource'
import { REDUCED_MOTION, useScrollToHash } from '../hooks'
import { useSession } from '../state/session'

/* ==========================================================================
   MY ACCOUNT — a full page, one panel per feature

   Same shape as the auth page: its own URL, and one panel per feature rather
   than a modal stack you have to back out of.

   Two resources — the subscription and the device list — are read here rather
   than inside a panel, because more than one panel needs them and a write in
   one has to be visible in the other. Everything else each panel fetches for
   itself, when it is first shown.
   ========================================================================== */

const TABS = [
  ['overview', 'Overview'],
  ['subscription', 'Subscription'],
  ['billing', 'Billing & invoices'],
  ['devices', 'Devices'],
  ['security', 'Security'],
  ['notifications', 'Notifications'],
  ['support', 'Support'],
]

export default function AccountPage({ onChat }) {
  const { user, panel, closeAccount, gotoPanel, signOut } = useSession()
  const open = panel !== null
  /* keep the last panel rendered while the page fades out */
  const [shown, setShown] = useState('overview')

  const page = useRef(null)
  const tabs = useRef(null)
  const scrollToHash = useScrollToHash()

  /* Nothing is fetched until the page is actually opened: a visitor who never
     touches My Account should not be spending requests on it. */
  const subscription = useResource(accountApi.getSubscription, { enabled: open })
  const devices = useResource(accountApi.getDevices, { enabled: open })

  useEffect(() => {
    if (panel) setShown(panel)
  }, [panel])

  /* on phones the tabs are a scrolling row, so the fade hint has to know
     whether there is anything left to scroll to */
  const measure = useCallback(() => {
    const el = tabs.current
    if (!el) return
    el.classList.toggle('can-scroll', el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  /* centre, not nearest: "nearest" parks the active chip right under the fade
     at the edge, which is the one chip you most need to be able to read */
  useEffect(() => {
    if (!open) return
    if (page.current) page.current.scrollTop = 0
    const chip = tabs.current?.querySelector('.ac-link.on')
    chip?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED_MOTION ? 'auto' : 'smooth' })
    measure()
  }, [open, shown, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeAccount()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeAccount])

  /* "Download the app" and "Open FAQ" close the page AND take you there.
     Closing rewinds the URL first, so the jump waits for that to settle. */
  const closeAndGo = (href) => {
    closeAccount()
    if (!href) return
    setTimeout(() => scrollToHash(href), 380)
  }

  const who = user ?? { local: 'you', email: 'you@email.com', initial: 'Y' }
  /* the devices pip marks slots in use, so it needs the real count */
  const deviceCount = devices.data?.used ?? 0

  const body = () => {
    switch (shown) {
      case 'checkoutSuccess':
        return <CheckoutSuccess subscription={subscription} onDone={() => gotoPanel('overview')} />
      case 'subscription':
        return <Subscription subscription={subscription} onClose={closeAndGo} />
      case 'billing':
        return <Billing user={who} />
      case 'devices':
        return <Devices devices={devices} />
      case 'security':
        return <Security onDevicesChanged={devices.reload} />
      case 'notifications':
        return <Notifications />
      case 'support':
        return (
          <Support
            onChat={() => {
              closeAccount()
              setTimeout(() => onChat?.(), 400)
            }}
            onClose={closeAndGo}
            onDeleted={() => {
              /* the account is gone, so there is no session left to end on the
                 server — clearing the local one is all that is left to do */
              signOut({ remote: false })
              closeAccount()
            }}
          />
        )
      default:
        return (
          <Overview user={who} subscription={subscription} devices={devices} onClose={closeAndGo} />
        )
    }
  }

  return (
    <div
      className={`account${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ac-title"
      ref={page}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="ac-top">
        <a href="#top" className="brand" aria-label="RusVPN, back to site" onClick={(e) => { e.preventDefault(); closeAccount() }}>
          <BrandMark />
        </a>
        <button type="button" className="ac-back" onClick={() => closeAccount()}>
          <Back />
          Back to site
        </button>
        <span className="ava">{who.initial}</span>
      </div>

      <div className="ac-body wrap">
        <aside className="ac-nav">
          <div className="ac-me">
            <span className="ava lg">{who.initial}</span>
            <span className="who"><b>{who.local}</b><i>{who.email}</i></span>
          </div>
          <div className="ac-tabs" ref={tabs} onScroll={measure}>
            {TABS.map(([key, text]) => (
              <button
                key={key}
                type="button"
                className={`ac-link${key === shown ? ' on' : ''}`}
                onClick={() => gotoPanel(key)}
              >
                {AC_ICONS[key]}
                {text}
                {key === 'devices' && deviceCount > 0 && <span className="pip" />}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ac-link ac-out"
            onClick={() => {
              signOut()
              closeAccount()
            }}
          >
            Log out
          </button>
        </aside>

        <main className="ac-main">
          {/* one panel at a time; the key restarts the entry animation on
              every switch, which is what the .on class did before */}
          <section className="ac-panel on" key={shown}>
            {body()}
          </section>
        </main>
      </div>
    </div>
  )
}
