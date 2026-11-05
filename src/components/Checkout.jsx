import { useEffect, useRef, useState } from 'react'
import { beginCheckout, getPlans } from '../features/billing/api'
import { money, textOf } from '../features/account/labels'
import { reducedMotion, say, setPageInert, shout, trapTab } from '../shared/a11y'
import { useSession } from '../state/session'
import { CheckoutResult } from './account/CheckoutResult'
import * as accountApi from '../features/account/api'
import { useResource } from '../features/account/useResource'

/* ==========================================================================
   CHECKOUT — the review step before Stripe

   Ported from the single-file page's checkout overlay, with one deliberate
   difference: that page was a client-side mock that took card details in its
   own form. This one has a real payment provider, and card data is entered on
   Stripe's hosted page and nowhere else — so there are no card fields here at
   all. What is kept is everything that belongs *before* the payment: what you
   are buying, what it renews to and how to stop it, which method you mean to
   pay with, and where the payment will finish (the page's `co-offsite` mode,
   which is now every method's mode).

   Same overlay contract as the auth page and the account page: role="dialog",
   aria-modal, the rest of the page inert, Tab trapped, Esc closes, focus goes
   back to the trigger.

   Plan details come from GET /plans by code, not from the pricing section —
   this overlay also opens straight after sign-in, when the pricing section
   may never have rendered a thing the visitor looked at.
   ========================================================================== */

/* The method is information, not an instruction to the backend: Stripe shows
   whichever of these the account has enabled. Each row says where it finishes
   so the button is never a surprise. */
const METHODS = [
  {
    key: 'card',
    n: 'Card',
    d: 'Visa, Mastercard',
    note: "You will enter your card on Stripe's secure payment page, then come straight back here. Nothing is charged until you confirm there.",
    go: (total) => `Continue to pay ${total}`,
  },
  {
    key: 'paypal',
    n: 'PayPal',
    d: 'You finish paying on PayPal',
    note: "Choose PayPal on Stripe's secure payment page and finish paying there, then come straight back here. Nothing is charged until PayPal confirms.",
    go: () => 'Continue to PayPal',
  },
  {
    key: 'applepay',
    n: 'Apple Pay',
    d: 'Confirm with Face ID or Touch ID',
    note: "Choose Apple Pay on Stripe's secure payment page and confirm with Face ID, Touch ID or your passcode, then come straight back here. Nothing is charged until Apple Pay confirms.",
    go: () => 'Continue to Apple Pay',
  },
  {
    key: 'googlepay',
    n: 'Google Pay',
    d: 'You finish paying in Google Pay',
    note: "Choose Google Pay on Stripe's secure payment page and finish paying there, then come straight back here. Nothing is charged until Google Pay confirms.",
    go: () => 'Continue to Google Pay',
  },
]

const DAYS_PER_MONTH = 30.4375

/** "week", "month", "3 months", "year" — what follows the word "every". */
function termOf(days) {
  if (days < 28) {
    const w = Math.max(1, Math.round(days / 7))
    return w === 1 ? 'week' : `${w} weeks`
  }
  const m = Math.max(1, Math.round(days / DAYS_PER_MONTH))
  if (m === 1) return 'month'
  if (m === 12) return 'year'
  return `${m} months`
}

function findPlan(catalogue, code) {
  for (const g of catalogue?.groups ?? []) {
    for (const p of [g.single, g.multi]) if (p && p.code === code) return p
  }
  return null
}

function toSummary(p) {
  const name = textOf(p.name, p.name_key)
  const term = termOf(p.duration_days)
  const price = Number(p.price)
  const months = p.duration_days / DAYS_PER_MONTH
  return {
    code: p.code,
    name,
    n: `${name} plan`,
    term,
    total: money(p.price, p.currency),
    /* two decimals is enough to feed the formatter, which trims or pads to
       the currency's own precision */
    per: months > 0 && isFinite(price) ? money((price / months).toFixed(2), p.currency) : '',
    save: p.discount_percent > 0 ? p.discount_percent : 0,
  }
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
)

export default function Checkout() {
  const { user, checkout, closeCheckout, checkoutToAccount, language } = useSession()
  const open = checkout !== null
  const code = checkout?.code ?? null
  /* back from Stripe: the same box shows how the payment went */
  const result = checkout?.result ?? null
  /* keep the last mode painted while the overlay fades out */
  const [mode, setMode] = useState(null)
  useEffect(() => {
    if (open) setMode(result)
  }, [open, result])
  const subscription = useResource(accountApi.getSubscription, { enabled: !!result })

  const root = useRef(null)
  const title = useRef(null)

  /* the last plan stays painted while the overlay fades out */
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState('')
  const [method, setMethod] = useState('card')
  const [busy, setBusy] = useState(false)

  /* ---------- the plan, by code ---------- */
  useEffect(() => {
    if (!code) return
    let alive = true
    setAlert('')
    setBusy(false)
    setMethod('card')
    setLoading(true)
    getPlans()
      .then((cat) => {
        if (!alive) return
        const p = findPlan(cat, code)
        if (!p) {
          setPlan(null)
          setAlert('This plan is no longer offered. Close this and pick another one from the plans.')
          return
        }
        const s = toSummary(p)
        setPlan(s)
        say(`Checkout. ${s.n}, total ${s.total}.`)
      })
      .catch((error) => {
        if (!alive) return
        setPlan(null)
        setAlert(error?.text ?? 'Could not load this plan. Check your connection and try again.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [code, language])

  /* ---------- modal contract ---------- */
  useEffect(() => {
    const el = root.current
    if (!open || !el) return
    setPageInert(el, true)
    const trap = trapTab(el)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeCheckout()
      }
    }
    document.addEventListener('keydown', trap)
    document.addEventListener('keydown', onKey)
    el.scrollTop = 0
    const t = window.setTimeout(() => el.querySelector('#co-title')?.focus(), reducedMotion() ? 0 : 120)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', trap)
      document.removeEventListener('keydown', onKey)
      /* Hand the page to whichever overlay is taking over (checkout → My
         Account), or back to the site. Not a snapshot of what was inert at
         open: arriving from sign-up, <main> was still inert on the auth
         page's behalf, and restoring that snapshot left the whole site
         unclickable once the checkout closed. */
      const next = document.querySelector('#auth.is-open, #account.is-open')
      setPageInert(next, !!next)
      /* setPageInert clears every sibling, closed overlays included — they
         keep themselves inert while closed */
      for (const c of document.querySelectorAll('#auth:not(.is-open), #account:not(.is-open), .co:not(.is-open)')) c.inert = true
    }
  }, [open, closeCheckout])

  const m = METHODS.find((x) => x.key === method) ?? METHODS[0]

  /* close, then take the visitor to a section of the page behind */
  const closeTo = (id) => {
    closeCheckout()
    const rm = reducedMotion()
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }), 60)
  }

  const changePlan = () => {
    closeCheckout()
    const rm = reducedMotion()
    window.setTimeout(() => {
      document.getElementById('pricing')?.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' })
      window.setTimeout(() => {
        const seg = document.querySelector('#pricing .seg button.on') || document.querySelector('#pricing .seg button')
        seg?.focus({ preventScroll: true })
      }, rm ? 0 : 500)
    }, 60)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!plan || busy) return
    setAlert('')
    setBusy(true)
    say('Taking you to the secure payment page, one moment.')
    try {
      /* leaves the page on success — the busy state stays up until it does */
      /* the bare name — the receipt adds "plan" itself */
      await beginCheckout(plan.code, plan.n.replace(/ plan$/, ''))
    } catch (error) {
      setBusy(false)
      /* already subscribed, or already on this plan: not a failure, just
         somewhere else to look */
      if (error?.code === 'SUBS_003' || error?.code === 'SUBS_006') {
        checkoutToAccount('subscription')
        return
      }
      const msg = error?.text ?? 'Could not start the payment. Nothing has been charged. Please try again.'
      setAlert(msg)
      shout(msg)
    }
  }

  return (
    <div
      className={`co${open ? ' is-open' : ''}`}
      id="checkout"
      role="dialog"
      aria-modal="true"
      aria-labelledby="co-title"
      aria-hidden={!open}
      inert={!open}
      ref={root}
    >
      <div className="co-scrim" onClick={() => closeCheckout()} />
      <div className="co-card">
        <button type="button" className="co-x" aria-label="Close checkout" onClick={() => closeCheckout()}>
          <CloseIcon />
        </button>

        {mode ? (
          <div className="co-body">
            <CheckoutResult
              outcome={mode}
              subscription={subscription}
              onDone={() => checkoutToAccount('overview')}
              onSupport={() => checkoutToAccount('support')}
              onPlans={changePlan}
              onApps={() => closeTo('apps')}
            />
          </div>
        ) : (
          <div className="co-body">
            <h2 id="co-title" tabIndex={-1} ref={title}>Confirm your plan</h2>
            <p className="co-sub">Cancel any time from your account. No charge until you confirm the payment.</p>

            {/* ---------- what you are buying ---------- */}
            <section className="co-sum" aria-labelledby="co-sum-h" aria-busy={loading}>
              <h3 id="co-sum-h">Order summary</h3>
              <dl className="co-rows">
                <div className="co-row"><dt>Plan</dt><dd>{plan?.n ?? '—'}</dd></div>
                <div className="co-row"><dt>Billed</dt><dd>{plan ? `every ${plan.term}` : '—'}</dd></div>
                {plan?.per && (
                  <div className="co-row"><dt>Works out at</dt><dd>{plan.per} / month</dd></div>
                )}
                <div className="co-row co-row--total">
                  <dt>Total payable at checkout</dt>
                  <dd><strong>{plan?.total ?? '—'}</strong></dd>
                </div>
              </dl>
              <button type="button" className="co-change" onClick={changePlan}>Change plan</button>
            </section>

            {/* said here as well as in the pricing block: renewal terms belong at
                the moment of payment, not only where the price was advertised */}
            {plan && (
              <p className="co-renew">
                This renews automatically at <strong>{plan.total}</strong> every {plan.term} until you stop
                it. To stop it, open <b>My Account → Subscription → Cancel subscription</b>. Cancelling keeps
                your plan running until the paid period ends, and never deletes the account.
              </p>
            )}

            <form className="co-form" noValidate onSubmit={submit}>
              {/* whole-attempt failure — network, gateway, an unavailable plan */}
              <div className={`f-alert f-alert--bad${alert ? ' on' : ''}`} role="alert" aria-live="assertive">
                {alert}
              </div>

              <fieldset className="co-pay">
                <legend>Payment method</legend>
                <div className="co-methods">
                  {METHODS.map((x) => (
                    <label className="co-method" key={x.key}>
                      <input
                        type="radio"
                        name="co-method"
                        value={x.key}
                        checked={method === x.key}
                        onChange={() => setMethod(x.key)}
                      />
                      <span className="co-method-b">
                        <span className="co-method-n">{x.n}</span>
                        <span className="co-method-d">{x.d}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* the address is already known — this is a signed-in purchase —
                  so it is shown, not asked for again */}
              <div className="fld co-who">
                <span className="lbl" id="co-email-l">Email address</span>
                <span className="co-who-v">
                  {user?.email ?? ''}
                </span>
                <span className="hint">Your receipt goes here. It is the address on your account.</span>
              </div>

              {/* saying where the payment finishes beats letting the button be a surprise */}
              <p className="co-offsite" aria-live="polite">{m.note}</p>

              <button
                type="submit"
                className={`btn btn-red co-submit${busy ? ' is-busy' : ''}`}
                disabled={busy || loading || !plan}
                aria-disabled={busy || loading || !plan}
              >
                <span>{busy ? 'Opening secure payment…' : m.go(plan?.total ?? '')}</span>
                <span className="spin" aria-hidden="true" />
              </button>
              <p className="co-secure">
                <LockIcon />
                <span>Payment is handled by Stripe. Your card details never touch this site.</span>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
