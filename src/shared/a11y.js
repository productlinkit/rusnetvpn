/* ==========================================================================
   A11Y — the shared widget behaviour, ported from the single-file page

   Every overlay, tab row and dropdown on the page leans on the same handful of
   rules: one tab stop per tablist, arrow keys inside a menu, an overlay that
   really is modal, and a focus restore that never drops you on <body>. They
   live here once so no component reimplements a slightly different version.
   ========================================================================== */

/* ---------- reduced motion ----------
   Read live rather than once at load: someone who turns the OS setting on
   while the page is open should not have to reload to be taken seriously. */
const motionQ = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
export const reducedMotion = () => !!motionQ?.matches

/* ---------- live regions ----------
   say(msg)   — polite: filtering, plan changes, things you asked for
   shout(msg) — assertive: a submit that failed, something that needs you now
   The two regions are rendered once by <LiveRegions /> in App. */
function announce(id, msg) {
  const el = document.getElementById(id)
  if (!el) return
  /* clearing first forces a re-announcement when the same string repeats — a
     second failed attempt with the same message is still worth hearing */
  el.textContent = ''
  window.setTimeout(() => {
    el.textContent = msg
  }, 60)
}
export const say = (msg) => announce('live-polite', msg)
export const shout = (msg) => announce('live-alert', msg)

/* ---------- css easing, sampled ----------
   JS-driven motion (the counters, the price roll) runs the same curve the
   stylesheet runs instead of an approximation of it. */
export function cssBezier(prop, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(prop)
  const m = String(raw).match(/cubic-bezier\(([^)]+)\)/)
  let p = m ? m[1].split(',').map((n) => parseFloat(n)) : null
  if (!p || p.length !== 4 || p.some((n) => !isFinite(n))) p = fallback
  const [x1, y1, x2, y2] = p
  const A = (a, b) => 1 - 3 * b + 3 * a
  const B = (a, b) => 3 * b - 6 * a
  const C = (a) => 3 * a
  const at = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a)
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const d = at(t, x1, x2) - x
      if (Math.abs(d) < 1e-6) break
      const s = slope(t, x1, x2)
      if (Math.abs(s) < 1e-6) break
      t -= d / s
    }
    return at(t, y1, y2)
  }
}

/* ---------- tablist ----------
   A row of buttons that swaps one panel is a tablist, and a tablist is a single
   tab stop: you Tab into the selected chip and arrow between the rest. The
   component owns aria-selected and tabIndex (selected 0, the rest -1); this
   handler owns the keys, and activates by clicking the real button so the
   component's own onClick runs untouched.

     <div role="tablist" onKeyDown={tablistKeys}> … role="tab" buttons … </div> */
export function tablistKeys(e) {
  const list = e.currentTarget
  const vertical = list.getAttribute('aria-orientation') === 'vertical'
  const next = vertical ? 'ArrowDown' : 'ArrowRight'
  const prev = vertical ? 'ArrowUp' : 'ArrowLeft'
  /* only the axis this list runs along — leave the other one to the page */
  if (e.key !== 'Home' && e.key !== 'End' && e.key !== next && e.key !== prev) return
  const tabs = [...list.querySelectorAll('[role="tab"]')]
  const i = tabs.indexOf(document.activeElement)
  if (i === -1) return
  e.preventDefault()
  const j =
    e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
        : e.key === next ? (i + 1) % tabs.length
          : (i - 1 + tabs.length) % tabs.length
  tabs[j].focus()
  tabs[j].click()
}

/* ---------- roving menu (language picker, account menu) ----------
   Up/Down to move, Home/End to jump, Escape to close and hand focus back to
   the trigger, Tab out to dismiss. Without these a dropdown is a mouse-only
   control even when every item inside it is a perfectly good button. */
export function menuTriggerKeys(e, { isOpen, open, menu, itemSel = 'button,a' }) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  e.preventDefault()
  if (!isOpen) open()
  /* the menu animates in from visibility:hidden, and focus() on a
     visibility:hidden element is silently dropped — so wait for the frame in
     which it is actually visible before moving there */
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const list = [...(menu.current?.querySelectorAll(itemSel) ?? [])]
      if (list.length) (e.key === 'ArrowDown' ? list[0] : list[list.length - 1]).focus()
    }),
  )
}

export function menuKeys(e, { close, trigger, itemSel = 'button,a' }) {
  const list = [...e.currentTarget.querySelectorAll(itemSel)]
  const i = list.indexOf(document.activeElement)
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    trigger.current?.focus()
    return
  }
  if (e.key === 'Tab') {
    close()
    return
  }
  if (i === -1) return
  const go = (j) => {
    e.preventDefault()
    list[j].focus()
  }
  if (e.key === 'ArrowDown') go((i + 1) % list.length)
  else if (e.key === 'ArrowUp') go((i - 1 + list.length) % list.length)
  else if (e.key === 'Home') go(0)
  else if (e.key === 'End') go(list.length - 1)
}

/* ---------- focus restore ----------
   A restore is only as good as the element it points at. Signing in hides the
   Login link the auth page was opened from; opening it from the mobile sheet
   closes the sheet. In both cases the recorded element still has a focus
   method, focus() silently does nothing, and the user lands on <body> at the
   top of the page. So: back to the opener if it survived, otherwise to
   whatever now holds its place, and only then to <main>. */
const TAKES_FOCUS =
  'a[href],button,input,select,textarea,summary,iframe,audio[controls],video[controls],[contenteditable],[tabindex]'

export function canTakeFocus(el) {
  if (!el || el.nodeType !== 1 || !el.isConnected || typeof el.focus !== 'function') return false
  /* <body> passes every liveness test and is exactly the failure guarded
     against — a deep link records it as the opener because there was none */
  if (!el.matches(TAKES_FOCUS)) return false
  if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false
  if (el.closest('[inert]')) return false
  if (!el.getClientRects().length) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== 'hidden' && cs.display !== 'none'
}

export function restoreFocus(target, fallbacks = []) {
  if (canTakeFocus(target)) {
    target.focus()
    return target
  }
  for (const sel of fallbacks) {
    const found = [...document.querySelectorAll(sel)].find(canTakeFocus)
    if (found) {
      found.focus()
      return found
    }
  }
  const main = document.getElementById('main') || document.querySelector('main')
  if (main) {
    /* -1 so it takes programmatic focus without joining the tab order */
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
    main.focus()
    return main
  }
  return null
}

/** the openers the auth page can fall back to, most-equivalent first */
export const AUTH_FALLBACK = ['#acct-btn', 'header .signin', 'header [data-auth]', '.burger', 'footer [data-auth]']
/** a confirm can be raised from anywhere, so its fallback is the surface that raised it */
export const DLG_FALLBACK = ['.account.is-open .ac-link.on', '.account.is-open button', '#acct-btn', '.burger']

/* ---------- focus containment for the full-page overlays ----------
   The auth and account pages declare aria-modal="true", which promises a
   screen reader that nothing outside them exists. `inert` on every sibling is
   what delivers that promise.

   The live regions, the dialog and the toast host stay reachable — they are
   how the page speaks, and a <dialog> marked inert cannot be opened. The
   overlay being opened is cleared, not skipped: one that a previous overlay
   had inerted would otherwise render, take focus and accept nothing. */
const INERT_SKIP = new Set(['live-polite', 'live-alert', 'dlg', 'toasts'])

export function setPageInert(overlay, on) {
  const root = document.getElementById('root')
  if (!root) return
  for (const el of root.children) {
    if (INERT_SKIP.has(el.id) || el.tagName === 'SCRIPT' || el.tagName === 'svg') continue
    if (el === overlay) {
      el.inert = false
      continue
    }
    el.inert = !!on
  }
}

/** Wrap-around Tab inside a container, for when inert alone is not enough. */
export function trapTab(container) {
  return (e) => {
    if (e.key !== 'Tab') return
    const f = [
      ...container.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
