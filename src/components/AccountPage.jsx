import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandMark } from './Brand'
import { AC_ICONS, Back } from './icons'
import {
  Billing,
  Devices,
  Notifications,
  Overview,
  Security,
  Subscription,
  Support,
} from './account/panels'
import * as accountApi from '../features/account/api'
import { useResource } from '../features/account/useResource'
import { useScrollToHash } from '../hooks'
import { AUTH_FALLBACK, reducedMotion, restoreFocus, setPageInert, tablistKeys, trapTab } from '../shared/a11y'
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
const IS_TAB = new Set(TABS.map(([k]) => k))

export default function AccountPage({ onChat }) {
  const { user, panel, closeAccount, gotoPanel, signOut } = useSession()
  const open = panel !== null
  /* keep the last panel rendered while the page fades out */
  const [shown, setShown] = useState('overview')

  const page = useRef(null)
  const tabs = useRef(null)
  const section = useRef(null)
  const opener = useRef(null)
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
    chip?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' })
    measure()
  }, [open, shown, measure])

  /* ---------- opening and closing ----------
     The same contract as the auth page: aria-modal backed by inert on every
     sibling, Tab kept inside, and focus handed back to something that exists.
     The account page is routinely opened from the account menu, which is
     closed by the time you come back out — hence restoreFocus, not focus(). */
  useEffect(() => {
    if (!open) return
    const el = page.current
    opener.current = document.activeElement
    setPageInert(el, true)
    const trap = trapTab(el)
    document.addEventListener('keydown', trap)
    /* the panel that just appeared is where you are, so focus goes to it — its
       heading is the first thing read, rather than the brand mark in the bar */
    const t = setTimeout(() => section.current?.focus(), reducedMotion() ? 0 : 120)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', trap)
      /* signing out, or buying from in here, can hand straight over to another
         overlay — which then keeps the page inert and owns the focus */
      const next = document.querySelector('.auth.is-open, .co.is-open')
      setPageInert(next, !!next)
      /* setPageInert clears every sibling, closed overlays included — and a
         closed one that is still fading out is visible, so focusable */
      for (const el of document.querySelectorAll('#auth:not(.is-open), #account:not(.is-open)')) el.inert = true
      /* a tick later, so the signed-in / signed-out header has painted: the
         fallback has to be picked from the nav as it now is, not as it was */
      const target = opener.current
      if (!next) setTimeout(() => restoreFocus(target, AUTH_FALLBACK), 0)
      opener.current = null
    }
  }, [open])

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
          <Overview user={who} subscription={subscription} devices={devices} onClose={closeAndGo} enabled={open} />
        )
    }
  }

  /* the checkout results are reached by a redirect, not a tab, so they are a
     plain region rather than a tabpanel no tab controls */
  const isTab = IS_TAB.has(shown)

  return (
    <div
      className={`account${open ? ' is-open' : ''}`}
      id="account"
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
          <Back aria-hidden="true" focusable="false" />
          Back to site
        </button>
        <span className="ava" id="ac-ava" aria-hidden="true">{who.initial}</span>
      </div>

      <div className="ac-body wrap">
        <aside className="ac-nav">
          <div className="ac-me">
            <span className="ava lg" id="ac-ava2" aria-hidden="true">{who.initial}</span>
            <span className="who"><b id="ac-name">{who.local}</b><i id="ac-mail">{who.email}</i></span>
          </div>
          {/* a tablist is one tab stop: Tab lands on the selected section,
              the arrows move between the rest */}
          <div
            className="ac-tabs"
            id="ac-tabs"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Account sections"
            ref={tabs}
            onScroll={measure}
            onKeyDown={tablistKeys}
          >
            {TABS.map(([key, text]) => {
              const on = key === shown
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`actab-${key}`}
                  className={`ac-link${on ? ' on' : ''}`}
                  aria-selected={on}
                  /* only one panel is in the DOM, so only its tab points at it */
                  aria-controls={on ? `acp-${key}` : undefined}
                  tabIndex={on || (!isTab && key === 'overview') ? 0 : -1}
                  onClick={() => gotoPanel(key)}
                >
                  {AC_ICONS[key]}
                  {text}
                  {key === 'devices' && deviceCount > 0 && <span className="pip" id="ac-dev-pip" />}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className="ac-link ac-out"
            id="ac-out"
            onClick={() => {
              signOut()
              closeAccount()
            }}
          >
            Log out
          </button>
        </aside>

        {/* was a second <main>. Two main landmarks means "skip to main content"
            has two destinations and a screen reader's landmark list has an
            ambiguous entry, so the account view is a labelled region instead
            (1.3.1). The page keeps exactly one <main>, up at #top. */}
        <section className="ac-main" aria-label="Account settings">
          {/* one panel at a time; the key restarts the entry animation on
              every switch, which is what the .on class did before */}
          <section
            className="ac-panel on"
            key={shown}
            ref={section}
            id={`acp-${shown}`}
            data-p={shown}
            role={isTab ? 'tabpanel' : 'region'}
            aria-labelledby={isTab ? `actab-${shown}` : 'ac-title'}
            tabIndex={-1}
          >
            {body()}
          </section>
        </section>
      </div>
    </div>
  )
}
