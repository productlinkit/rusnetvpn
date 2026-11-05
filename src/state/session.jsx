import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useBodyClass, useScrollLock } from '../hooks'
import { registerApiHandlers } from '../shared/api/gates'
import { getLocales } from '../shared/api/locales'
import { setCurrencyCatalogue } from '../features/account/labels'
import { tokenStore, userCache } from '../shared/api/tokens'
import { restoreFocus as restoreA11yFocus } from '../shared/a11y'

/* where focus goes when the checkout's opener is gone — the buy button inside
   the pricing card first, since that is what "close" most nearly returns to */
const CHECKOUT_FALLBACK = ['#pricing .btn-red', '#pricing .seg button.on', '#acct-btn', '.burger']

/**
 * The auth runtime — the API client, the wire schemas and zod behind them — is
 * loaded on demand rather than imported at the top of the file.
 *
 * Most visits never sign in: they read the pricing table and leave. Making the
 * marketing page carry the validation layer for a form it may never open is
 * about 22 kB gzipped of nothing. The module is warmed on idle (see App.jsx),
 * so by the time anyone clicks "Login" it is already in memory.
 *
 * `features/billing/api` does NOT get the same treatment: the pricing section
 * itself needs it on first paint to show real numbers, so it is already in
 * the main bundle — a dynamic import of it here would just be a second copy
 * (Vite warns on exactly this: "INEFFECTIVE_DYNAMIC_IMPORT").
 */
let authModule = null
const auth = () => (authModule ??= import('../features/auth/api'))

/* ==========================================================================
   SESSION

   Who is signed in, which overlay is showing, and the URL that goes with it.

   The auth page and the account page are not modals: each view has its own
   address, browser Back returns to the site, and a reset link mailed to
   someone can point straight at #set-new-password. That contract is the
   reason this state sits in one place instead of inside the two components.

   It is also where the backend's two global gates land — ACC_001 (suspended)
   and a dead refresh token — because the server can raise them from any call,
   so no single screen can own the response.
   ========================================================================== */

export const AUTH_HASH = {
  in: '#sign-in',
  up: '#create-account',
  otp: '#verify-email',
  reset: '#forgot-password',
  newpw: '#set-new-password',
}

export const AC_HASH = {
  overview: '#account',
  subscription: '#subscription',
  billing: '#billing',
  devices: '#devices',
  security: '#security',
  notifications: '#notifications',
  support: '#support',
}

/* The three routes Stripe can send the browser back to. Not account panels:
   the outcome is shown in the checkout overlay, over the site. */
export const CHECKOUT_RESULT_HASH = {
  success: '#checkout-success',
  pending: '#checkout-pending',
  failed: '#checkout-failed',
}

const SessionContext = createContext(null)

export const useSession = () => useContext(SessionContext)

export function SessionProvider({ children }) {
  /* seeded from the cache so a reload paints the signed-in nav on the first
     frame; GET /me overwrites it a moment later, or clears it if the token is
     no longer good */
  const [user, setUser] = useState(() => (tokenStore.access() ? userCache.read() : null))
  const [authView, setAuthView] = useState(null) // null when closed
  /* the email the CTA strip was carrying when it sent you here, if any */
  const [authEmail, setAuthEmail] = useState('')
  /* set when auth was opened from a pricing click rather than a plain "sign
     in" — the plan to buy once signedIn() has somewhere to sign in to */
  const [pendingPlan, setPendingPlan] = useState(null)
  const [panel, setPanel] = useState(null) // null when the account page is closed
  /* the plan under review in the checkout overlay — { code, name } — or null */
  const [checkout, setCheckout] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  /** Set when the server says the account is suspended (ACC_001). */
  const [suspended, setSuspended] = useState(null)

  /* the history and interceptor handlers below run outside React's render, so
     they read the live values through refs rather than a closure from mount */
  const live = useRef({ user, authView, panel, language, pendingPlan, checkout })
  live.current = { user, authView, panel, language, pendingPlan, checkout }

  const lastFocus = useRef(null)
  /* the checkout overlay keeps its own opener: it can open on top of a view
     that already recorded one (sign-in hands over to it), and closing it must
     not consume that view's restore target */
  const coFocus = useRef(null)

  useBodyClass('menu-open', menuOpen)
  useBodyClass('is-auth', !!user)
  useScrollLock(menuOpen || authView !== null || panel !== null || checkout !== null)

  const restoreFocus = () => {
    const el = lastFocus.current
    if (el && el.focus) el.focus()
    lastFocus.current = null
  }

  /* ---------- auth ---------- */
  const openAuth = useCallback((view = 'in', email, silent, planCode) => {
    const v = AUTH_HASH[view] ? view : 'in'
    if (!live.current.authView) lastFocus.current = document.activeElement
    if (email) setAuthEmail(email)
    if (planCode !== undefined) setPendingPlan(planCode)
    setAuthView(v)
    if (!silent) history.pushState({ rvAuth: v }, '', AUTH_HASH[v])
  }, [])

  const closeAuth = useCallback((silent) => {
    setAuthView(null)
    /* an abandoned "buy the year plan" intent must not fire on some later,
       unrelated sign-in */
    setPendingPlan(null)
    restoreFocus()
    if (silent) return
    if (history.state && history.state.rvAuth) history.back()
    else history.replaceState(null, '', location.pathname + location.search)
  }, [])

  /* switching views inside the page replaces the entry instead of stacking one
     per step — Back should leave the auth page, not walk back through the
     three screens of a password reset */
  const switchAuthView = useCallback((v) => {
    setAuthView(v)
    history.replaceState({ rvAuth: v }, '', AUTH_HASH[v])
  }, [])

  /* ---------- account ---------- */
  const openAccount = useCallback(
    (p = 'overview', silent) => {
      if (!live.current.user) {
        openAuth('in')
        return
      }
      const key = AC_HASH[p] ? p : 'overview'
      if (!live.current.panel) lastFocus.current = document.activeElement
      setPanel(key)
      setMenuOpen(false)
      if (!silent) history.pushState({ rvAcct: key }, '', AC_HASH[key])
    },
    [openAuth],
  )

  const closeAccount = useCallback((silent) => {
    setPanel(null)
    restoreFocus()
    if (silent) return
    if (history.state && history.state.rvAcct) history.back()
    else history.replaceState(null, '', location.pathname + location.search)
  }, [])

  const gotoPanel = useCallback((p) => {
    const key = AC_HASH[p] ? p : 'overview'
    setPanel(key)
    history.replaceState({ rvAcct: key }, '', AC_HASH[key])
  }, [])

  /* ---------- checkout ----------
     Not a page of its own the way auth and the account are — the static page
     gives it no address, and a cold link to "review a plan" means nothing
     without a session to buy with — but it still takes a history entry with
     the URL unchanged, so browser Back closes it the way Back leaves the auth
     page, instead of leaving the site from under an open dialog. */
  const showCheckout = useCallback((code, name = '', { silent } = {}) => {
    if (!live.current.checkout) coFocus.current = document.activeElement
    setCheckout({ code, name })
    setMenuOpen(false)
    if (!silent) history.pushState({ rvCo: code }, '', location.pathname + location.search)
  }, [])

  /* Where Stripe sends the browser back to. The payment's outcome is shown in
     the checkout itself — the box the visitor paid from, as the single-file
     page did — rather than on a different page that happens to know about
     it. It takes over the entry Stripe returned to instead of pushing one:
     Back should not land on a result that has already been read. */
  const showCheckoutResult = useCallback((outcome) => {
    coFocus.current = null
    setCheckout({ result: outcome })
    setMenuOpen(false)
    history.replaceState({ rvCoResult: outcome }, '', location.href)
  }, [])

  const closeCheckout = useCallback((silent) => {
    const wasResult = !!live.current.checkout?.result
    setCheckout(null)
    const el = coFocus.current
    coFocus.current = null
    /* after the fade has lifted inert — focus() on an inert element is a no-op */
    window.setTimeout(() => restoreA11yFocus(el, CHECKOUT_FALLBACK), 0)
    if (silent) return
    /* a result owns no entry of its own, only the address Stripe returned
       to — clear that, so a reload does not show the receipt again */
    if (wasResult) {
      const q = new URLSearchParams(location.search)
      q.delete('mock-checkout')
      q.delete('preview')
      const search = q.toString()
      history.replaceState(null, '', location.pathname + (search ? `?${search}` : ''))
      return
    }
    if (history.state && history.state.rvCo) history.back()
  }, [])

  /* SUBS_003 / SUBS_006 — already subscribed. The account's subscription panel
     takes the checkout's history entry rather than stacking on it: a
     history.back() to close the overlay would land after the push and pop the
     panel straight back off. */
  const checkoutToAccount = useCallback((p = 'subscription') => {
    const key = AC_HASH[p] ? p : 'overview'
    setCheckout(null)
    lastFocus.current = coFocus.current
    coFocus.current = null
    setPanel(key)
    setMenuOpen(false)
    history.replaceState({ rvAcct: key }, '', AC_HASH[key])
  }, [])

  /* ---------- sign in / out ---------- */

  /**
   * Called by the auth page once an endpoint has handed back a real session.
   * Lands straight on My Account rather than routing through `openAccount` —
   * that helper gates on `live.current.user`, which still reads the pre-login
   * value here because the `setUser` above has not re-rendered yet.
   *
   * If auth was opened from a pricing click, `pendingPlan` carries the plan
   * code through the whole sign-in/verify-email detour: instead of leaving
   * the visitor to find and click the plan again, the checkout overlay opens
   * on the plan they already asked for — the same review step a signed-in
   * buyer sees, so nobody is sent to Stripe without having seen the total and
   * the renewal terms first. It takes over the auth page's history entry, so
   * Back from it returns to the site rather than to the sign-up form.
   */
  const signedIn = useCallback((nextUser) => {
    setSuspended(null)
    setUser(nextUser)
    setAuthView(null)

    const planCode = live.current.pendingPlan
    setPendingPlan(null)

    if (planCode) {
      /* hand the auth page's opener (the buy button) to the overlay */
      coFocus.current = lastFocus.current
      lastFocus.current = null
      setCheckout({ code: planCode, name: '' })
      setMenuOpen(false)
      const url = location.pathname + location.search
      if (history.state && history.state.rvAuth) history.replaceState({ rvCo: planCode }, '', url)
      else history.pushState({ rvCo: planCode }, '', url)
      return
    }

    restoreFocus()
    lastFocus.current = document.activeElement
    setPanel('overview')
    setMenuOpen(false)
    /* the auth page's entry is replaced, not stacked on: otherwise Back from
       My Account walks into the verify-email screen of a sign-up that is over */
    if (history.state && history.state.rvAuth) history.replaceState({ rvAcct: 'overview' }, '', AC_HASH.overview)
    else history.pushState({ rvAcct: 'overview' }, '', AC_HASH.overview)
  }, [])

  /**
   * Every purchase CTA lands here — the pricing button and both "Try RusVPN
   * Now" buttons — so "buy" means the same thing wherever it is clicked.
   * Signed out, the plan rides through sign-up (see `pendingPlan`); signed in,
   * the checkout overlay opens on it — the review step before Stripe. The
   * overlay owns the redirect, its busy state and its errors, so the promise
   * resolves as soon as it is showing.
   */
  /* The plan the pricing card is showing. A ref, not state: nothing renders
     from it — the plan-less "Get RusVPN" buttons read it at the moment they
     are clicked, so they buy what the visitor last looked at. */
  const selectedPlan = useRef(null)
  const selectPlan = useCallback((code, name) => {
    selectedPlan.current = code ? { code, name } : null
  }, [])

  const openCheckout = useCallback((planCode, planName) => {
    if (!planCode) return Promise.resolve()
    if (!live.current.user) {
      openAuth('up', undefined, undefined, planCode)
      return Promise.resolve()
    }
    showCheckout(planCode, planName)
    return Promise.resolve()
  }, [openAuth, showCheckout])

  /**
   * Clears the local session. `remote` tells the server too — skipped when the
   * server is the one that ended it, since the token is already dead and the
   * call would only earn another 401.
   */
  const signOut = useCallback(
    async ({ remote = true } = {}) => {
      setPanel(null)
      setCheckout(null)
      setUser(null)
      if (!remote) {
        tokenStore.clear()
        return
      }
      const api = await auth()
      await api.logout()
    },
    [],
  )

  /* ---------- the currency catalogue ----------
     How to print an amount — symbol, side, decimals — comes from the server
     (GET /locales), not from a table in this bundle. Fetched once: the
     catalogue is the same whatever language is picked, because the server
     stamps the applicable currency on every amount it sends.

     A failure is swallowed on purpose. money() falls back to a small built-in
     table, so an unreachable settings endpoint costs a currency added last
     week its symbol — it does not blank out the price. */
  useEffect(() => {
    let alive = true
    getLocales()
      .then((cat) => {
        if (alive) setCurrencyCatalogue(cat.currencies)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  /* ---------- the global gates ----------
     Registered once, at mount, because the interceptor can fire them from any
     endpoint — including one nobody is watching. */
  useEffect(() => {
    registerApiHandlers({
      currentLanguage: () => live.current.language,
      onForceLogout: () => {
        tokenStore.clear()
        setUser(null)
        setPanel(null)
        setCheckout(null)
      },
      onSuspended: (payload) => {
        setSuspended(payload ?? {})
        setPanel(null)
        setCheckout(null)
        /* the account page is the one surface a suspended user cannot use, and
           the auth page is where the message has somewhere to render */
        openAuth('in')
      },
    })
  }, [openAuth])

  /* ---------- re-hydrate on a cold load ----------
     A token in storage is a claim, not proof. GET /me is what settles it: it
     refreshes the profile, and a 401 that survives the rotation drops the
     session rather than leaving a signed-in shell nobody can use. */
  useEffect(() => {
    if (!tokenStore.access()) return
    let alive = true
    auth()
      .then((api) => api.fetchProfile())
      .then((fresh) => {
        if (alive) setUser(fresh)
      })
      .catch((error) => {
        // ACC_001 is handled by the gate above; anything else that is not an
        // auth failure (a flaky network on load) keeps the cached user.
        if (alive && (error?.code === 'AUTH_001' || error?.code === 'AUTH_004')) {
          tokenStore.clear()
          setUser(null)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  /* ---------- back / forward ---------- */
  useEffect(() => {
    const onPop = () => {
      const s = history.state
      if (s && s.rvCo) {
        if (live.current.authView) closeAuth(true)
        if (live.current.panel) closeAccount(true)
        /* forward onto a checkout entry: only meaningful while signed in */
        if (live.current.user) showCheckout(s.rvCo, '', { silent: true })
        return
      }
      if (live.current.checkout) closeCheckout(true)

      if (s && s.rvAuth) {
        openAuth(s.rvAuth, null, true)
        return
      }
      if (live.current.authView) closeAuth(true)

      if (s && s.rvAcct) {
        openAccount(s.rvAcct, true)
        return
      }
      if (live.current.panel) closeAccount(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [openAuth, closeAuth, openAccount, closeAccount, showCheckout, closeCheckout])

  /* ---------- deep links ----------
     Auth views open cold. Account URLs only mean something once you are signed
     in, so a fresh visit to #billing lands on sign-in instead of an empty
     shell — unless the token in storage says otherwise. */
  useEffect(() => {
    const hash = location.hash
    const view = Object.keys(AUTH_HASH).find((v) => AUTH_HASH[v] === hash)
    if (view) {
      /* the OTP and new-password screens need state we do not have on a cold
         load — which address, which code — so a bare link lands on sign-in */
      openAuth(view === 'otp' || view === 'newpw' ? 'in' : view, null, true)
      return
    }
    const outcome = Object.keys(CHECKOUT_RESULT_HASH).find((o) => CHECKOUT_RESULT_HASH[o] === hash)
    if (outcome) {
      /* dev-only: ?preview= shows a result with a stand-in account, so the
         three designs can be looked at without a backend */
      const preview = import.meta.env.DEV && new URLSearchParams(location.search).has('preview')
      if (preview) setUser((u) => u ?? { local: 'preview', email: 'preview@rusvpn.dev', initial: 'P' })
      if (preview || tokenStore.access()) showCheckoutResult(outcome)
      else openAuth('in', null, true)
      return
    }
    const acct = Object.keys(AC_HASH).find((p) => AC_HASH[p] === hash)
    if (acct) {
      if (tokenStore.access()) openAccount(acct, true)
      else openAuth('in', null, true)
    }
    // once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({
      user,
      signedIn,
      signOut,
      openCheckout,
      selectedPlan,
      selectPlan,
      checkout,
      closeCheckout,
      checkoutToAccount,
      suspended,
      dismissSuspended: () => setSuspended(null),
      language,
      setLanguage,
      authView,
      authEmail,
      openAuth,
      closeAuth,
      switchAuthView,
      panel,
      openAccount,
      closeAccount,
      gotoPanel,
      menuOpen,
      setMenuOpen,
    }),
    [
      user, signedIn, signOut, openCheckout, selectPlan, checkout, closeCheckout, checkoutToAccount, suspended, language,
      authView, authEmail, openAuth, closeAuth, switchAuthView,
      panel, openAccount, closeAccount, gotoPanel,
      menuOpen,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
