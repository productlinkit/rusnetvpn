import { useEffect, useState } from 'react'
import { Arw } from '../ui'
import { Check, Download } from '../icons'
import { Bad } from './parts'
import * as accountApi from '../../features/account/api'
import { beginCheckout, lastCheckout } from '../../features/billing/api'
import { date, money, textOf } from '../../features/account/labels'

/* ==========================================================================
   CHECKOUT RESULT — where Stripe sends the browser back to

   Three routes, four screens:

     #checkout-success  → success, or pending while the webhook catches up
     #checkout-pending  → pending (a bank still deciding, a 3-D Secure hold)
     #checkout-failed   → failed (declined, or the visitor backed out)

   The redirect is a claim, not a receipt. Only the payment webhook settles a
   purchase, and it can land seconds after the browser does — so "success"
   here means the subscription now says premium, not that Stripe sent us to a
   route with a happy name. Until it does, the page waits in the open and
   re-reads, then admits when it is taking longer than it should ("slow")
   rather than spinning forever.
   ========================================================================== */

const POLL_MS = 4000
const POLL_TRIES = 12 // ~48 s before the page stops promising it is nearly done

/* Dev-only: `?preview=success|pending|slow|failed` renders a screen without a
   backend or a signed-in session. Vite drops the branch from production. */
const PREVIEW = import.meta.env.DEV ? new URLSearchParams(location.search).get('preview') : null

const DEMO = {
  order: { plan_code: 'year', plan_name: 'Year', order_no: 'RV-2611-04K7Q', amount: '47.99', currency: 'USD', started_at: new Date().toISOString() },
  sub: {
    is_premium: true,
    auto_renew: true,
    expires_at: new Date(Date.now() + 365 * 864e5).toISOString(),
    max_devices: 1,
    plan: { name: 'Year', name_key: 'plans.items.year.title', price: '47.99', currency: 'USD' },
  },
}

const COPY = {
  success: {
    tag: 'Payment successful',
    title: 'You are all set',
    lead: 'Your premium plan is active. Sign in on the app with this account and every server is yours.',
  },
  pending: {
    tag: 'Payment pending',
    title: 'Confirming your payment',
    lead: 'Your payment went to the provider and we are waiting for its answer. This usually takes a few seconds — keep this page open.',
  },
  slow: {
    tag: 'Still pending',
    title: 'This is taking longer than usual',
    lead: 'Some banks hold a payment for a few minutes before approving it. You do not need to pay again — your plan switches on by itself the moment it clears, and we email you when it does.',
  },
  failed: {
    tag: 'Payment failed',
    title: 'Your payment did not go through',
    lead: 'Nothing was charged, and your account is just as it was. You can try again, or pick a different plan.',
  },
}

const REASONS = [
  'The card was declined, or did not have enough funds',
  'The bank check (3-D Secure) was closed or timed out',
  'The checkout page was left before paying',
]

/* the three beats of a payment, as the pending screen tracks them */
const STEPS = ['Payment submitted', 'Confirming with the provider', 'Activating your plan']

export function CheckoutResult({ outcome, subscription, onDone, onPlans, onSupport, onApps }) {
  const [order] = useState(() => (PREVIEW ? DEMO.order : lastCheckout()))
  /* the order's own row in /transactions — it can say "failed" before the
     subscription has anything to say at all */
  const [txnStatus, setTxnStatus] = useState(null)
  const [tries, setTries] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState(null)

  const sub = PREVIEW ? DEMO.sub : subscription.data

  let state
  if (PREVIEW) state = COPY[PREVIEW] ? PREVIEW : 'success'
  else if (outcome === 'failed' || txnStatus === 'failed') state = 'failed'
  else if (sub?.is_premium) state = 'success'
  else state = tries >= POLL_TRIES ? 'slow' : 'pending'

  const waiting = state === 'pending'

  /* re-read while waiting; the subscription is the verdict, the transaction
     row is how a decline shows up without waiting out the whole timer */
  useEffect(() => {
    if (PREVIEW || !waiting) return
    const id = setTimeout(async () => {
      subscription.reload()
      if (order?.order_no) {
        const txns = await accountApi.getTransactions().catch(() => null)
        const mine = txns?.find((t) => t.order_no === order.order_no)
        if (mine) setTxnStatus(mine.status)
      }
      setTries((n) => n + 1)
    }, POLL_MS)
    return () => clearTimeout(id)
    // `subscription` is a fresh object every render; `tries` is the clock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, tries, order])

  const checkAgain = () => {
    setTries(0)
    subscription.reload()
  }

  const retry = async () => {
    if (!order?.plan_code || retrying) return
    setRetryError(null)
    setRetrying(true)
    try {
      await beginCheckout(order.plan_code, order.plan_name)
    } catch (error) {
      setRetrying(false)
      setRetryError(error.text ?? 'Could not start checkout. Please try again.')
    }
  }

  const copy = COPY[state]
  const tone = { success: 'good', pending: 'wait', slow: 'wait', failed: 'bad' }[state]

  const planName = sub?.plan ? textOf(sub.plan.name, sub.plan.name_key) : order?.plan_name
  const amount = order ? money(order.amount, order.currency) : sub?.plan ? money(sub.plan.price, sub.plan.currency) : null

  return (
    <div className={`cr cr-${tone}`}>
      <div className="cr-hero">
        <StatusBadge tone={tone} />
        <span className={`ac-tag ${tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'warn'}`}>{copy.tag}</span>
        <h2 id="ac-title">{copy.title}</h2>
        <p aria-live="polite">{copy.lead}</p>
      </div>

      {(state === 'pending' || state === 'slow') && (
        <ol className="cr-steps" aria-label="Payment progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i === 0 ? 'done' : i === 1 ? 'now' : undefined}>
              <i>{i === 0 ? <Check /> : i + 1}</i>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}

      {(planName || amount || order) && (
        <dl className="cr-sum">
          {planName && <SumRow k="Plan" v={`${planName} plan`} />}
          {amount && <SumRow k={state === 'success' ? 'Amount paid' : 'Amount'} v={amount} mono />}
          {state === 'success' && sub?.expires_at && (
            <SumRow k={sub.auto_renew ? 'Renews on' : 'Runs until'} v={date(sub.expires_at)} mono />
          )}
          {state === 'success' && sub?.max_devices > 0 && (
            <SumRow k="Devices" v={`${sub.max_devices} at a time`} />
          )}
          {order?.order_no && <SumRow k="Order no." v={order.order_no} mono />}
          {state === 'failed' && <SumRow k="Charged" v="Nothing" />}
        </dl>
      )}

      {state === 'failed' && (
        <div className="cr-why">
          <b>Common reasons</b>
          <ul>
            {REASONS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      {!PREVIEW && subscription.error && state !== 'failed' && <Bad error={subscription.error} />}
      <Bad error={retryError} />

      <div className="ac-actions cr-actions">
        {state === 'success' && (
          <>
            <button type="button" className="btn btn-red" onClick={onDone}>
              <span>Go to my account</span><Arw />
            </button>
            <button type="button" className="btn btn-ghost" onClick={onApps}>
              <Download /><span>Get the app</span>
            </button>
          </>
        )}

        {(state === 'pending' || state === 'slow') && (
          <>
            <button type="button" className="btn btn-primary" disabled={subscription.loading} onClick={checkAgain}>
              <span>{subscription.loading || waiting ? 'Checking…' : 'Check again'}</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={state === 'slow' ? onSupport : onDone}>
              <span>{state === 'slow' ? 'Contact support' : 'Go to my account'}</span>
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            {order?.plan_code && (
              <button type="button" className="btn btn-red" disabled={retrying} onClick={retry}>
                <span>{retrying ? 'Redirecting…' : 'Try again'}</span><Arw />
              </button>
            )}
            <button type="button" className={`btn ${order?.plan_code ? 'btn-ghost' : 'btn-red'}`} onClick={onPlans}>
              <span>Choose another plan</span>
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSupport}>
              <span>Contact support</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function SumRow({ k, v, mono }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd className={mono ? 'mono' : undefined}>{v}</dd>
    </div>
  )
}

/* The big mark at the top. Pending is a ring that turns, so the page reads as
   "working" even to someone who skips every word on it. */
function StatusBadge({ tone }) {
  return (
    <span className={`cr-badge ${tone}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {tone === 'good' && <path d="M6 12.5l4 4L18 8" />}
        {tone === 'wait' && <path d="M12 7.5V12l3 2" />}
        {tone === 'bad' && <path d="M8 8l8 8M16 8l-8 8" />}
      </svg>
    </span>
  )
}
