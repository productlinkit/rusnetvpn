import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandMark } from './Brand'
import { Arw } from './ui'
import { Chevron, Globe, Tick } from './icons'
import { NAV_LINKS } from '../data/content'
import { useDismiss, useMagnetic, useMedia, useScrollProgress } from '../hooks'
import { useSession } from '../state/session'
import { getLocales } from '../shared/api/locales'
import { getPlans } from '../features/billing/api'
import { textOf } from '../features/account/labels'
import { menuKeys, menuTriggerKeys, say } from '../shared/a11y'

/* ==========================================================================
   HEADER

   No card, no pill, no border — the header is just type sitting on the page.
   Once you scroll, a soft wash fades in behind it so the links stay readable
   over photos and the navy band. It has no edge, so it never reads as a box.
   ========================================================================== */

/* ---------- "Get RusVPN" — the plan-less buy buttons ----------
   The header, the sheet and the hero all say "Get RusVPN" without naming a
   plan. On the static page they opened the checkout on whichever plan the
   pricing card had selected, and the checkout's own switcher took it from
   there. The session has no shared "selected plan" yet, so these open it on
   the plan the catalogue flags as the best offer — the same default the
   pricing card lands on — read from GET /plans rather than from a plan code
   typed into this file.

   The catalogue is fetched on the first click and kept for the page's life.
   If it cannot be had, the button falls back to what its href already says:
   the pricing section, where the choice can be made by hand. */
let bestPlan = null
const loadBestPlan = () =>
  (bestPlan ??= getPlans()
    .then((cat) => {
      const singles = cat.groups.map((g) => g.single).filter(Boolean)
      const pick = singles.find((p) => p.offer_key) ?? singles[singles.length - 1]
      if (!pick) throw new Error('no plans')
      return { code: pick.code, name: textOf(pick.name, pick.name_key) }
    })
    .catch((error) => {
      bestPlan = null
      throw error
    }))

export function useBuy() {
  const { openCheckout, selectedPlan } = useSession()
  return useCallback(
    (e) => {
      e.preventDefault()
      /* the plan the pricing card is on, if the visitor got that far;
         otherwise the same best-offer default the card opens on */
      const picked = selectedPlan.current
      ;(picked ? Promise.resolve(picked) : loadBestPlan())
        .then((p) => openCheckout(p.code, p.name))
        .catch(() => {
          document.getElementById('pricing')?.scrollIntoView({ block: 'start' })
        })
    },
    [openCheckout, selectedPlan],
  )
}

/* The button itself. A component rather than <Btn> so every buy CTA carries
   data-buy and the same handler — a new buy button cannot be added without
   the behaviour, which is what the static page's one delegated handler was
   guaranteeing. */
export function BuyBtn({ variant = 'red', size, magnetic = true, onClick, children = 'Get RusVPN', className = '', ...rest }) {
  const buy = useBuy()
  const ref = useMagnetic(magnetic)
  const cls = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className].filter(Boolean).join(' ')
  return (
    <a
      ref={ref}
      href="#pricing"
      className={cls}
      data-buy=""
      onClick={(e) => {
        onClick?.(e)
        buy(e)
      }}
      {...rest}
    >
      <span>{children}</span>
      <Arw />
    </a>
  )
}

/* What to offer before the catalogue arrives, and if it never does. The real
   list is GET /locales — a language added in the CMS has to appear here
   without a redeploy, which a constant cannot do. */
const FALLBACK_LANGS = [{ code: 'en', name: 'English', native_name: 'English' }]

/* A dropdown, not a row of chips: two languages today, room for more later
   without the bar getting any wider. */
function LangPicker() {
  const [open, setOpen] = useState(false)
  const { language: lang, setLanguage: setLang } = useSession()
  const [langs, setLangs] = useState(FALLBACK_LANGS)
  const ref = useRef(null)
  const btn = useRef(null)
  const menu = useRef(null)

  useEffect(() => {
    let alive = true
    getLocales()
      .then((cat) => {
        if (alive && cat.languages.length) setLangs(cat.languages)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, ref)

  /* the page's own copy is English-only for now, but the choice is not
     cosmetic: it rides on Accept-Language, and the backend answers with
     `msg_localized` in that language — so picking Indonesia here is what makes
     a rejected login say it in Indonesian */
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  return (
    <div className={`lang${open ? ' on' : ''}`} ref={ref}>
      {/* 2.5.3 Label in Name: the button reads "EN" on screen, and it used to be
          named "Change language", so the visible label appeared nowhere in the
          accessible name — someone driving by voice saying "click EN" got
          nothing. The name is built from content now, "Language: EN", and it
          follows the code when the language changes. */}
      <button
        ref={btn}
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => menuTriggerKeys(e, { isOpen: open, open: () => setOpen(true), menu })}
      >
        <span className="sr-only">Language: </span>
        <Globe className="globe" />
        <span className="code">{lang.toUpperCase()}</span>
        <Chevron className="chev" />
      </button>
      {/* Arrow keys in, Escape out, focus back on the trigger — 2.1.1 */}
      <div
        ref={menu}
        className="lang-menu"
        role="listbox"
        aria-label="Language"
        onKeyDown={(e) => menuKeys(e, { close, trigger: btn })}
      >
        {langs.map((l) => (
          <button
            key={l.code}
            type="button"
            className={l.code === lang ? 'on' : undefined}
            role="option"
            aria-selected={l.code === lang}
            onClick={() => {
              setLang(l.code)
              setOpen(false)
              btn.current?.focus()
              say(`Language set to ${l.native_name || l.name}`)
            }}
          >
            {/* The language's own name, so somebody looking for theirs can
                find it without reading English. */}
            {l.native_name || l.name}
            <span className="ab">{l.code.toUpperCase()}</span>
            <Tick className="tickmark" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* The signed-in nav. Below 1180 the dropdown is hidden by CSS, so the avatar
   goes straight into the account page instead of opening a menu nobody can
   see — the click handler matches what the stylesheet already decided.

   #acct-btn is load-bearing: it is the first fallback when an overlay closes
   and the element that opened it has gone (AUTH_FALLBACK, DLG_FALLBACK) —
   the account button is what the Login link becomes once you are signed in. */
function AccountMenu() {
  const { user, signOut, openAccount } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const narrow = useMedia('(max-width:1180px)')

  useDismiss(open, useCallback(() => setOpen(false), []), ref)
  useEffect(() => {
    if (!user) setOpen(false)
  }, [user])

  const go = (panel) => (e) => {
    e.preventDefault()
    setOpen(false)
    openAccount(panel)
  }

  return (
    <div className={`acct${open ? ' on' : ''}`} id="acct" ref={ref}>
      <button
        type="button"
        className="acct-btn"
        id="acct-btn"
        aria-expanded={open}
        onClick={() => (narrow ? openAccount('overview') : setOpen((v) => !v))}
      >
        <span className="ava">{user?.initial ?? 'Y'}</span>
        <span className="acct-name">{user?.short ?? 'you'}</span>
        <Chevron className="chev" />
      </button>
      <div className="acct-menu">
        <div className="acct-head">
          <span className="ava lg">{user?.initial ?? 'Y'}</span>
          <span className="acct-id">
            <b>{user?.email ?? 'you@email.com'}</b>
            <i>Subscription · Active</i>
          </span>
        </div>
        <a href="#account" data-account="overview" onClick={go('overview')}>My Account</a>
        <a href="#subscription" data-account="subscription" onClick={go('subscription')}>Subscription</a>
        <a href="#billing" data-account="billing" onClick={go('billing')}>Billing &amp; invoices</a>
        <a href="#security" data-account="security" onClick={go('security')}>Security</a>
        <button type="button" className="out" onClick={() => signOut()}>Log out</button>
      </div>
    </div>
  )
}

export default function Header() {
  const { barRef, small } = useScrollProgress()
  const { user, openAuth, openAccount, menuOpen, setMenuOpen } = useSession()

  return (
    <>
      <div id="prog" ref={barRef} />
      <header id="hdr" className={small ? 'small' : undefined}>
        <nav className="nav" aria-label="Main">
          <a href="#top" className="brand" aria-label="RusVPN, back to top">
            <BrandMark />
          </a>
          <div className="navlinks">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </div>
          <div className="navact">
            <LangPicker />
            <a
              href="#sign-in"
              className="signin"
              data-auth="in"
              onClick={(e) => {
                e.preventDefault()
                /* signed in already? then a sign-in form is never the answer */
                if (user) openAccount('overview')
                else openAuth('in')
              }}
            >
              Login
            </a>
            <BuyBtn variant="primary" size="sm">Get RusVPN</BuyBtn>
            <AccountMenu />
            <button
              className="burger"
              id="burger"
              aria-label="Open main menu"
              aria-controls="sheet"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </nav>
      </header>
    </>
  )
}
