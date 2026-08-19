import { useEffect, useRef, useState } from 'react'
import { Arw } from '../ui'
import { Download } from '../icons'
import { Bad, Loader, Ok, Row, Switch } from './parts'
import * as accountApi from '../../features/account/api'
import { useResource } from '../../features/account/useResource'
import {
  PLATFORM_ICON,
  STATUS_TAG,
  TXN_TAG,
  date,
  label,
  money,
} from '../../features/account/labels'

/* ==========================================================================
   ACCOUNT PANELS

   One panel per feature, each reading its own endpoint. Two shapes recur and
   are worth naming once:

     · A free account is the normal state, not an edge case. Everything here
       has to read correctly when `plan` is null, there are no transactions and
       no devices — which is exactly what a fresh sign-up looks like.
     · A write is followed by a re-read, not by a local guess. The server
       decides what a cancellation did to `expires_at`; echoing our own
       assumption would be right until the day it is not.
   ========================================================================== */

/* ---------- overview ---------- */
export function Overview({ user, subscription, devices, onClose }) {
  const notifications = useResource(accountApi.getNotifications)
  const sub = subscription.data
  const dev = devices.data
  const premium = sub?.is_premium

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Hei, <span>{user.local}</span></h2>
        <p>
          Everything about your account lives here. Your plan, your invoices, the devices you are signed in
          on, and the switches that decide what we email you.
        </p>
      </div>

      <div className="ac-grid">
        <div className="ac-stat">
          <div className="k">Current plan</div>
          <div className="v">{sub ? (sub.plan ? label(sub.plan.name_key) : 'Free') : '—'}</div>
          <div className="n">
            {sub?.plan ? 'Premium, every feature included' : 'Upgrade for the full service'}
          </div>
        </div>
        <div className="ac-stat">
          <div className="k">{sub?.auto_renew ? 'Renews on' : 'Ends on'}</div>
          <div className="v mono">{date(sub?.expires_at)}</div>
          <div className="n">
            {!sub || !sub.plan
              ? 'Free plans do not expire'
              : sub.auto_renew
                ? 'Auto-renewal is on'
                : 'Will not renew'}
          </div>
        </div>
        <div className="ac-stat">
          <div className="k">Devices</div>
          <div className="v mono">
            {dev ? dev.used : '—'} <em>/ {dev ? dev.max_devices : sub?.max_devices ?? '—'}</em>
          </div>
          <div className="n">
            {dev && dev.used >= dev.max_devices ? 'Sign one out to free a slot' : 'Slots free'}
          </div>
        </div>
        <div className="ac-stat">
          <div className="k">Data</div>
          <div className="v">{premium ? 'Unlimited' : '1 GB / day'}</div>
          <div className="n">{premium ? 'No cap on any paid plan' : 'Unlimited on any paid plan'}</div>
        </div>
      </div>

      <div className="ac-card dark" style={{ marginTop: 14 }}>
        <h3>Get RusVPN on this device</h3>
        <p className="sub" style={{ marginTop: 6, maxWidth: '52ch' }}>
          {premium
            ? `One account covers ${sub.max_devices} devices at once. Windows, macOS, Android, iOS and Linux, all from the same login.`
            : 'Windows, macOS, Android, iOS and Linux, all from the same login.'}
        </p>
        <div className="ac-actions">
          <a href="#apps" className="btn btn-white" onClick={(e) => { e.preventDefault(); onClose('#apps') }}>
            <span>Download the app</span><Arw />
          </a>
        </div>
      </div>

      <div className="ac-card" style={{ marginTop: 14 }}>
        <h3>Recent activity</h3>
        <p className="sub">What we have sent you lately.</p>
        <div style={{ marginTop: 18 }}>
          <Loader
            {...notifications}
            empty={notifications.data?.length === 0}
            emptyText="Nothing yet. Notices about your plan and your account will show up here."
          >
            {notifications.data?.slice(0, 6).map((n) => (
              <Row
                key={n.id}
                icon={{ name: 'bubble', red: !n.is_read }}
                title={n.title}
                note={`${date(n.sent_at)} · ${n.body}`}
              />
            ))}
          </Loader>
        </div>
      </div>
    </>
  )
}

/* ---------- subscription ---------- */
export function Subscription({ subscription, onClose }) {
  const reasons = useResource(accountApi.getCancelReasons, { enabled: false })
  const [asking, setAsking] = useState(false)
  const [reasonId, setReasonId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  const sub = subscription.data
  const tag = STATUS_TAG[sub?.status] ?? { text: sub?.status ?? '', tone: 'warn' }
  /* `cancelled` still has time on the clock — the plan runs to expires_at and
     only then drops to free, so it is not the same as having no plan */
  const canCancel = sub?.plan && sub.auto_renew
  const canReactivate = sub?.plan && !sub.auto_renew && sub.status !== 'expired'

  const startCancel = () => {
    setError(null)
    setOk(null)
    setAsking(true)
    if (!reasons.data) reasons.reload()
  }

  const confirmCancel = async () => {
    if (!reasonId) {
      setError('Please choose a reason first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await accountApi.cancelSubscription({ reasonId })
      setAsking(false)
      setOk('Cancelled. Your plan stays on until it expires.')
      await subscription.reload()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const reactivate = async () => {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await accountApi.reactivateSubscription()
      setOk('Auto-renewal is back on.')
      await subscription.reload()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2>Subscription</h2>
        <p>What you are on now, when it renews, and how to change either of those.</p>
      </div>

      <Loader {...subscription}>
        {sub && (
          <>
            <div className="ac-card dark">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h3>{sub.plan ? `${label(sub.plan.name_key)} plan` : 'Free plan'}</h3>
                  <p className="sub" style={{ marginTop: 6 }}>
                    {sub.plan
                      ? `${money(sub.plan.price, sub.plan.currency)} · ${sub.plan.max_devices} device${sub.plan.max_devices > 1 ? 's' : ''} · ${sub.plan.duration_days} days`
                      : 'No charge, and no expiry. Limited servers and a daily data cap.'}
                  </p>
                </div>
                <span className={`ac-tag ${tag.tone}`} style={{ marginLeft: 'auto' }}>{tag.text}</span>
              </div>
              <div className="ac-facts">
                <div><div className="sub">Started</div><b className="mono">{date(sub.started_at)}</b></div>
                <div>
                  <div className="sub">{sub.auto_renew ? 'Renews' : 'Ends'}</div>
                  <b className="mono">{date(sub.expires_at)}</b>
                </div>
                <div>
                  <div className="sub">Days left</div>
                  <b className="mono">{sub.plan ? sub.days_remaining : '∞'}</b>
                </div>
              </div>
            </div>

            <div className="ac-card">
              <Row
                title="Auto-renewal"
                note={
                  !sub.plan
                    ? 'There is nothing to renew on the free plan.'
                    : sub.auto_renew
                      ? `On. We will charge you again on ${date(sub.expires_at)} and your access carries on without a gap.`
                      : `Off. Your plan runs out on ${date(sub.expires_at)} and the account drops to the free tier.`
                }
              >
                {/* turning this off IS the cancellation — the backend has no
                    separate switch, so it opens the same reason prompt */}
                <Switch
                  on={!!sub.auto_renew}
                  busy={busy}
                  label="Auto-renewal"
                  onChange={(next) => {
                    if (!sub.plan) return
                    if (next) reactivate()
                    else startCancel()
                  }}
                />
              </Row>
              <Row title="Change plan" note="Longer plans cost less per month. Every plan has the same features.">
                <a href="#pricing" className="btn btn-ghost btn-sm act" onClick={(e) => { e.preventDefault(); onClose('#pricing') }}>
                  See plans
                </a>
              </Row>
            </div>

            <div className="ac-card">
              <h3>What is included</h3>
              <p className="sub">
                {sub.benefits.length
                  ? 'Everything your plan carries right now.'
                  : 'Upgrade to unlock the full service.'}
              </p>
              <div className="ac-grid" style={{ marginTop: 18, gap: 10 }}>
                {(sub.benefits.length ? sub.benefits : sub.plan?.features ?? []).map((key) => (
                  <span
                    key={key}
                    className="ac-tag good"
                    style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: 600 }}
                  >
                    {label(key)}
                  </span>
                ))}
              </div>
            </div>

            {(canCancel || canReactivate || asking) && (
              <div className="ac-card danger">
                <h3>{canReactivate && !asking ? 'Restart auto-renewal' : 'Cancel subscription'}</h3>
                <p className="sub" style={{ marginTop: 6 }}>
                  {canReactivate && !asking
                    ? `Your plan is set to end on ${date(sub.expires_at)}. Turn renewal back on and nothing changes.`
                    : `You keep everything until ${date(sub.expires_at)}. After that the account drops to the free tier instead of being deleted.`}
                </p>

                {asking && (
                  <>
                    <label className="fld" style={{ maxWidth: 420 }}>
                      <span>Why are you leaving?</span>
                      <Loader {...reasons}>
                        <select value={reasonId} onChange={(e) => setReasonId(e.target.value)}>
                          <option value="">Choose a reason…</option>
                          {reasons.data?.map((r) => (
                            <option key={r.id} value={r.id}>{label(r.reason_key)}</option>
                          ))}
                        </select>
                      </Loader>
                    </label>
                    <div className="ac-actions">
                      <button type="button" className="btn btn-red btn-sm" disabled={busy} onClick={confirmCancel}>
                        {busy ? 'Cancelling…' : 'Yes, cancel it'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
                        Keep my plan
                      </button>
                    </div>
                  </>
                )}

                {!asking && canCancel && (
                  <div className="ac-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={startCancel}>
                      Cancel subscription
                    </button>
                  </div>
                )}
                {!asking && canReactivate && (
                  <div className="ac-actions">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={reactivate}>
                      {busy ? 'Turning it on…' : 'Turn renewal back on'}
                    </button>
                  </div>
                )}

                <Bad error={error} />
                <Ok on={!!ok}>{ok}</Ok>
              </div>
            )}
          </>
        )}
      </Loader>
    </>
  )
}

/* ---------- checkout success ---------- */
/**
 * Where Stripe's checkout session sends the browser back to. The purchase is
 * NOT necessarily settled yet — only the payment webhook decides that, and it
 * can land a beat after the redirect — so this reads the same `subscription`
 * resource the rest of the account page shares rather than assuming success
 * from the redirect alone, and offers a manual re-check instead of guessing.
 */
export function CheckoutSuccess({ subscription, onDone }) {
  const sub = subscription.data
  const active = !!sub?.is_premium

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">{active ? 'Payment successful' : 'Confirming your payment'}</h2>
        <p>
          {active
            ? 'Thanks — your plan is active. Everything about it lives in Subscription.'
            : 'This can take a minute to settle. Check again, or come back to My Account shortly.'}
        </p>
      </div>

      <Loader {...subscription}>
        <div className="ac-card dark">
          {active ? (
            <>
              <h3>{sub.plan ? `${label(sub.plan.name_key)} plan` : 'Premium'}</h3>
              <p className="sub" style={{ marginTop: 6, maxWidth: '52ch' }}>
                {sub.plan
                  ? `${money(sub.plan.price, sub.plan.currency)} · ${sub.auto_renew ? `renews ${date(sub.expires_at)}` : `runs until ${date(sub.expires_at)}`}`
                  : 'Welcome to RusVPN.'}
              </p>
              <div className="ac-actions">
                <button type="button" className="btn btn-white" onClick={onDone}>
                  <span>Go to my account</span><Arw />
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>Almost there</h3>
              <p className="sub" style={{ marginTop: 6, maxWidth: '52ch' }}>
                We are still waiting on confirmation from the payment provider.
              </p>
              <div className="ac-actions">
                <button
                  type="button"
                  className="btn btn-white"
                  disabled={subscription.loading}
                  onClick={subscription.reload}
                >
                  <span>{subscription.loading ? 'Checking…' : 'Check again'}</span>
                </button>
                <button type="button" className="btn btn-ghost" onClick={onDone}>
                  <span>Go to my account</span>
                </button>
              </div>
            </>
          )}
        </div>
      </Loader>
    </>
  )
}

/* ---------- billing ---------- */
export function Billing({ user }) {
  const txns = useResource(accountApi.getTransactions)
  const [error, setError] = useState(null)

  /* the payment method is not its own endpoint — the latest settled receipt is
     what knows which card was used */
  const method = txns.data?.find((t) => t.payment_method)?.payment_method

  const openInvoice = async (t) => {
    setError(null)
    try {
      const invoice = await accountApi.getInvoice(t.id)
      window.open(invoice.invoice_url, '_blank', 'noopener')
    } catch (e) {
      setError(e)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2>Billing &amp; invoices</h2>
        <p>
          Your payment method and every receipt we have issued. Invoices stay downloadable even after a plan
          ends.
        </p>
      </div>

      <div className="ac-card">
        <Row
          icon="billing"
          title={method ?? 'No payment method yet'}
          note={method ? 'Used for your most recent payment' : 'One is saved the first time you subscribe'}
        />
        <Row title="Billing email" note={user.email} />
      </div>

      <div className="ac-card">
        <h3>Invoices</h3>
        <p className="sub">Prices shown are what was charged, tax included.</p>
        <div style={{ marginTop: 18 }}>
          <Loader
            {...txns}
            empty={txns.data?.length === 0}
            emptyText="No payments yet. Receipts appear here the moment one goes through."
          >
            {/* the table needs a floor to push against, otherwise it obeys
                width:100% and crushes five columns into a phone */}
            <div className="ac-scroll">
              <table className="ac-table">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {txns.data?.map((t) => {
                    const tag = TXN_TAG[t.status] ?? { text: t.status, tone: 'warn' }
                    return (
                      <tr key={t.id}>
                        <td className="mono">{date(t.date)}</td>
                        <td>{label(t.plan_name_key)}</td>
                        <td className="amt">{money(t.amount, t.currency)}</td>
                        <td><span className={`ac-tag ${tag.tone}`}>{tag.text}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          {t.invoice_no && (
                            <button type="button" className="dl" onClick={() => openInvoice(t)}>
                              <Download />PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Loader>
          <Bad error={error} />
        </div>
      </div>
    </>
  )
}

/* ---------- devices ---------- */
export function Devices({ devices }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  const list = devices.data?.devices ?? []
  const max = devices.data?.max_devices ?? 0
  const used = devices.data?.used ?? 0

  const signOut = async (id) => {
    setBusyId(id)
    setError(null)
    try {
      await accountApi.removeDevice(id)
      await devices.reload()
    } catch (e) {
      setError(e)
    } finally {
      setBusyId(null)
    }
  }

  const signOutOthers = async () => {
    setError(null)
    setBusyId('all')
    try {
      /* one at a time, not Promise.all: the endpoint is per device and a burst
         of deletes is exactly what the rate limiter is there to stop */
      for (const d of list.filter((x) => !x.is_current)) {
        await accountApi.removeDevice(d.id)
      }
      await devices.reload()
      setOk(true)
    } catch (e) {
      setError(e)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2>Devices</h2>
        <p>
          Your plan decides how many can be signed in at once. Signing a device out here logs it out
          immediately, wherever it is.
        </p>
      </div>

      <Loader {...devices}>
        <>
          <div className="ac-card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h3>{used} of {max} slot{max === 1 ? '' : 's'} in use</h3>
              <span className="sub">{Math.max(0, max - used)} free</span>
            </div>
            <div className="meter"><i style={{ width: `${max ? Math.min(100, (used / max) * 100) : 0}%` }} /></div>
          </div>

          <div className="ac-card">
            {list.length === 0 ? (
              <p className="ac-quiet">
                No devices yet. Signing in from the RusVPN app on a phone or a desktop adds it here — the
                website itself does not take a slot.
              </p>
            ) : (
              list.map((d) => (
                <Row
                  key={d.id}
                  icon={{ name: PLATFORM_ICON[d.platform] ?? 'desktop', red: d.is_current }}
                  title={`${d.model || d.platform}${d.is_current ? ' · This device' : ''}`}
                  note={`Last active ${date(d.last_active_at)} · ${d.platform}${d.app_version ? ` ${d.app_version}` : ''}`}
                >
                  {d.is_current ? (
                    <span className="ac-tag good act">Current</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm act"
                      disabled={busyId === d.id}
                      onClick={() => signOut(d.id)}
                    >
                      {busyId === d.id ? 'Signing out…' : 'Sign out'}
                    </button>
                  )}
                </Row>
              ))
            )}
          </div>

          {list.some((d) => !d.is_current) && (
            <div className="ac-card danger">
              <h3>Sign out everywhere</h3>
              <p className="sub" style={{ marginTop: 6 }}>
                Ends every session except the one you are using right now. Handy if you lost a phone.
              </p>
              <div className="ac-actions">
                <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === 'all'} onClick={signOutOthers}>
                  {busyId === 'all' ? 'Signing them out…' : 'Sign out all other devices'}
                </button>
              </div>
              <Ok on={ok}>Done. Only this device is still signed in.</Ok>
            </div>
          )}
          <Bad error={error} />
        </>
      </Loader>
    </>
  )
}

/* ---------- security ---------- */
export function Security({ onDevicesChanged }) {
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [err, setErr] = useState({})
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputs = { cur: useRef(null), pw: useRef(null), again: useRef(null) }

  /* the same BR-09 rule the auth page and the server both apply */
  const strong = (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setOk(false)
    setError(null)

    const next = {}
    if (!cur) next.cur = 'Please enter your current password'
    if (!pw) next.pw = 'Please enter a new password'
    else if (!strong(pw)) next.pw = 'Password must be at least 8 characters and include a letter and a number.'
    else if (pw === cur) next.pw = 'Pick something different from your current password'
    if (!again) next.again = 'Please confirm your new password'
    else if (again !== pw) next.again = 'Passwords do not match'

    setErr(next)
    if (Object.keys(next).length) {
      /* the class that marks a bad field lands on the next render, so pick the
         field to focus from the errors themselves */
      inputs[['cur', 'pw', 'again'].find((k) => next[k])].current?.focus()
      return
    }

    setBusy(true)
    try {
      await accountApi.changePassword({ oldPassword: cur, newPassword: pw })
      setCur('')
      setPw('')
      setAgain('')
      setOk(true)
      /* the server revokes the other sessions, so the device list just changed
         underneath us */
      onDevicesChanged?.()
    } catch (e) {
      // AUTH-level rejections name the field they are about
      if (e?.code === 'AUTH_002' || e?.i18nKey === 'error.auth.passwordMismatch') {
        setErr({ cur: 'That is not your current password' })
        inputs.cur.current?.focus()
      } else {
        setError(e)
      }
    } finally {
      setBusy(false)
    }
  }

  const fld = (k) => `fld${err[k] ? ' bad' : ''}`

  return (
    <>
      <div className="ac-head">
        <h2>Security</h2>
        <p>Your password, and what happens to your other sessions when you change it.</p>
      </div>

      <div className="ac-card">
        <h3>Change password</h3>
        <p className="sub">Changing it signs out every other device automatically.</p>
        <form noValidate style={{ maxWidth: 420 }} onSubmit={submit}>
          <label className={fld('cur')}>
            <span>Current password</span>
            <input
              ref={inputs.cur}
              type="password"
              placeholder="Enter your current password"
              autoComplete="current-password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
            />
            <em className="err">{err.cur}</em>
          </label>
          <label className={fld('pw')}>
            <span>New password</span>
            <input
              ref={inputs.pw}
              type="password"
              placeholder="At least 8 characters, with a number"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <em className="err">{err.pw}</em>
          </label>
          <label className={fld('again')}>
            <span>Confirm new password</span>
            <input
              ref={inputs.again}
              type="password"
              placeholder="Type it once more"
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
            <em className="err">{err.again}</em>
          </label>
          <div className="ac-actions">
            <button className="btn btn-red btn-sm" type="submit" disabled={busy}>
              <span>{busy ? 'Saving…' : 'Save new password'}</span><Arw />
            </button>
          </div>
        </form>
        <Bad error={error} />
        <Ok on={ok}>Password updated. Other devices have been signed out.</Ok>
      </div>
    </>
  )
}

/* ---------- notifications ---------- */

/* The settings row stores a free-form JSON map, so the keys are the client's
   to define. These four are what this page offers. */
const PREFS = [
  { key: 'renewal_reminders', title: 'Renewal reminders', note: 'A heads-up seven days before we charge you, so nothing is a surprise.', fallback: true },
  { key: 'product_updates', title: 'Product updates', note: 'New servers, new features, app releases. Roughly once a month.', fallback: true },
  { key: 'offers', title: 'Offers and discounts', note: 'Occasional deals on longer plans. Off by default.', fallback: false },
  { key: 'signin_alerts', title: 'New sign-in alerts', note: 'An email whenever your account is used on a device we have not seen before.', fallback: true },
]

export function Notifications() {
  const settings = useResource(accountApi.getSettings)
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState(null)

  const stored = settings.data?.notifications ?? {}
  /* a key the user has never touched is absent from the map, not false — the
     default has to come from us, or every switch reads "off" on day one */
  const valueOf = (p) => (typeof stored[p.key] === 'boolean' ? stored[p.key] : p.fallback)

  const toggle = async (p, next) => {
    setBusyKey(p.key)
    setError(null)
    try {
      const saved = await accountApi.saveNotificationPrefs({ ...stored, [p.key]: next })
      settings.set(saved)
    } catch (e) {
      setError(e)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2>Notifications</h2>
        <p>We keep this short. Security emails cannot be turned off, everything else is yours to decide.</p>
      </div>

      <div className="ac-card">
        <Loader {...settings}>
          <>
            <Row title="Security alerts" note="Password changes and anything else that touches access.">
              <span className="ac-tag good act">Always on</span>
            </Row>
            {PREFS.map((p) => (
              <Row key={p.key} title={p.title} note={p.note}>
                <Switch
                  on={valueOf(p)}
                  busy={busyKey === p.key}
                  label={p.title}
                  onChange={(next) => toggle(p, next)}
                />
              </Row>
            ))}
          </>
        </Loader>
        <Bad error={error} />
      </div>
    </>
  )
}

/* ---------- support ---------- */
export function Support({ onChat, onClose, onDeleted }) {
  const [asking, setAsking] = useState(false)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const field = useRef(null)

  useEffect(() => {
    if (asking) field.current?.focus()
  }, [asking])

  const remove = async () => {
    if (!password) {
      setErr('Please enter your password to confirm')
      field.current?.focus()
      return
    }
    setBusy(true)
    setErr(null)
    setError(null)
    try {
      await accountApi.deleteAccount(password)
      onDeleted()
    } catch (e) {
      if (e?.code === 'AUTH_002') setErr('That password is not right')
      else setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2>Support</h2>
        <p>Real people in Moscow, not a bot that loops you back to the help page.</p>
      </div>

      <div className="ac-card">
        <Row icon={{ name: 'bubble', red: true }} title="Live chat" note="Usually answers in under 5 minutes, 24 hours a day.">
          <button type="button" className="btn btn-ghost btn-sm act" onClick={onChat}>Start a chat</button>
        </Row>
        <Row icon="mail" title="Email us" note="support@rusvpn.com · a reply within one working day.">
          <a href="mailto:support@rusvpn.com" className="btn btn-ghost btn-sm act">Write an email</a>
        </Row>
        <Row icon="support" title="Read the FAQ" note="Logs, servers, ownership, refunds. The short answers.">
          <a href="#faq" className="btn btn-ghost btn-sm act" onClick={(e) => { e.preventDefault(); onClose('#faq') }}>
            Open FAQ
          </a>
        </Row>
      </div>

      <div className="ac-card danger">
        <h3>Delete account</h3>
        <p className="sub" style={{ marginTop: 6 }}>
          This removes your account and everything attached to it. It cannot be undone, and any time left on
          your plan is not refunded.
        </p>
        {!asking ? (
          <div className="ac-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsking(true)}>
              Delete my account
            </button>
          </div>
        ) : (
          <>
            <label className={`fld${err ? ' bad' : ''}`} style={{ maxWidth: 420 }}>
              <span>Confirm with your password</span>
              <input
                ref={field}
                type="password"
                placeholder="Your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <em className="err">{err}</em>
            </label>
            <div className="ac-actions">
              <button type="button" className="btn btn-red btn-sm" disabled={busy} onClick={remove}>
                {busy ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAsking(false); setPassword(''); setErr(null) }}>
                Never mind
              </button>
            </div>
          </>
        )}
        <Bad error={error} />
      </div>
    </>
  )
}
