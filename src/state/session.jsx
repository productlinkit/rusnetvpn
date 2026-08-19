import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useBodyClass, useScrollLock } from '../hooks'
import { registerApiHandlers } from '../shared/api/gates'
import { startCheckout } from '../features/billing/api'
import { tokenStore, userCache } from '../shared/api/tokens'

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
  checkoutSuccess: '#checkout-success',
  subscription: '#subscription',
  billing: '#billing',
  devices: '#devices',
  security: '#security',
  notifications: '#notifications',
  support: '#support',
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  /** Set when the server says the account is suspended (ACC_001). */
  const [suspended, setSuspended] = useState(null)

  /* the history and interceptor handlers below run outside React's render, so
     they read the live values through refs rather than a closure from mount */
  const live = useRef({ user, authView, panel, language, pendingPlan })
  live.current = { user, authView, panel, language, pendingPlan }

  const lastFocus = useRef(null)

  useBodyClass('menu-open', menuOpen)
  useBodyClass('is-auth', !!user)
  useScrollLock(menuOpen || authView !== null || panel !== null)

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

  /* ---------- sign in / out ---------- */

  /**
   * Called by the auth page once an endpoint has handed back a real session.
   * Lands straight on My Account rather than routing through `openAccount` —
   * that helper gates on `live.current.user`, which still reads the pre-login
   * value here because the `setUser` above has not re-rendered yet.
   *
   * If auth was opened from a pricing click, `pendingPlan` carries the plan
   * code through the whole sign-in/verify-email detour: instead of leaving
   * the visitor to find and click the plan again, this starts the checkout
   * they already asked for and sends the browser to Stripe. My Account is
   * still opened first — it is where the checkout lands them back on success,
   * and where they are left if the checkout call itself fails, so there is
   * never a dead end.
   */
  const signedIn = useCallback((nextUser) => {
    setSuspended(null)
    setUser(nextUser)
    setAuthView(null)
    restoreFocus()

    const planCode = live.current.pendingPlan
    setPendingPlan(null)

    lastFocus.current = document.activeElement
    setPanel('overview')
    setMenuOpen(false)
    history.pushState({ rvAcct: 'overview' }, '', AC_HASH.overview)

    if (planCode) {
      startCheckout(planCode)
        .then((session) => {
          window.location.href = session.checkout_url
        })
        .catch(() => {
          // Left on My Account, which already opened above — SUBS_003 /
          // SUBS_006 (already subscribed / already on this plan) land here
          // correctly too, with no special-casing needed.
        })
    }
  }, [])

  /**
   * Clears the local session. `remote` tells the server too — skipped when the
   * server is the one that ended it, since the token is already dead and the
   * call would only earn another 401.
   */
  const signOut = useCallback(
    async ({ remote = true } = {}) => {
      setPanel(null)
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
      },
      onSuspended: (payload) => {
        setSuspended(payload ?? {})
        setPanel(null)
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
  }, [openAuth, closeAuth, openAccount, closeAccount])

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
      user, signedIn, signOut, suspended, language,
      authView, authEmail, openAuth, closeAuth, switchAuthView,
      panel, openAccount, closeAccount, gotoPanel,
      menuOpen,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
