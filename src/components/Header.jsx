import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandMark } from './Brand'
import { Btn } from './ui'
import { Chevron, Globe, Tick } from './icons'
import { NAV_LINKS } from '../data/content'
import { useDismiss, useMedia, useScrollProgress } from '../hooks'
import { useSession } from '../state/session'

/* ==========================================================================
   HEADER

   No card, no pill, no border — the header is just type sitting on the page.
   Once you scroll, a soft wash fades in behind it so the links stay readable
   over photos and the navy band. It has no edge, so it never reads as a box.
   ========================================================================== */

const LANGS = [
  { code: 'en', name: 'English', ab: 'EN' },
  { code: 'id', name: 'Indonesia', ab: 'ID' },
]

/* A dropdown, not a row of chips: two languages today, room for more later
   without the bar getting any wider. */
function LangPicker() {
  const [open, setOpen] = useState(false)
  const { language: lang, setLanguage: setLang } = useSession()
  const ref = useRef(null)

  useDismiss(open, useCallback(() => setOpen(false), []), ref)

  /* the page's own copy is English-only for now, but the choice is not
     cosmetic: it rides on Accept-Language, and the backend answers with
     `msg_localized` in that language — so picking Indonesia here is what makes
     a rejected login say it in Indonesian */
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  return (
    <div className={`lang${open ? ' on' : ''}`} ref={ref}>
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        onClick={() => setOpen((v) => !v)}
      >
        <Globe className="globe" />
        <span className="code">{lang.toUpperCase()}</span>
        <Chevron className="chev" />
      </button>
      <div className="lang-menu" role="listbox">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            className={l.code === lang ? 'on' : undefined}
            role="option"
            aria-selected={l.code === lang}
            onClick={() => {
              setLang(l.code)
              setOpen(false)
            }}
          >
            {l.name}
            <span className="ab">{l.ab}</span>
            <Tick className="tickmark" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* The signed-in nav. Below 1180 the dropdown is hidden by CSS, so the avatar
   goes straight into the account page instead of opening a menu nobody can
   see — the click handler matches what the stylesheet already decided. */
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
    <div className={`acct${open ? ' on' : ''}`} ref={ref}>
      <button
        type="button"
        className="acct-btn"
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
        <a href="#account" onClick={go('overview')}>My Account</a>
        <a href="#subscription" onClick={go('subscription')}>Subscription</a>
        <a href="#billing" onClick={go('billing')}>Billing &amp; invoices</a>
        <a href="#security" onClick={go('security')}>Security</a>
        <button type="button" className="out" onClick={signOut}>Log out</button>
      </div>
    </div>
  )
}

export default function Header() {
  const { barRef, small } = useScrollProgress()
  const { openAuth, menuOpen, setMenuOpen } = useSession()

  return (
    <>
      <div id="prog" ref={barRef} />
      <header id="hdr" className={small ? 'small' : undefined}>
        <nav className="nav">
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
              onClick={(e) => {
                e.preventDefault()
                openAuth('in')
              }}
            >
              Login
            </a>
            <Btn href="#pricing" variant="primary" size="sm" magnetic>Subscribe Now</Btn>
            <AccountMenu />
            <button
              className="burger"
              aria-label="Open main menu"
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
