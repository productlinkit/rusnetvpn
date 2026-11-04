import { useRef, useState } from 'react'
import { Arw } from '../ui'
import { Download } from '../icons'
import { useDialog, useToast } from '../Feedback'
import { Bad, Field, FormAlert, Loader, Ok, Row, Switch, busyProps, fixLead, useFieldCheck } from './parts'
import * as accountApi from '../../features/account/api'
import { useResource } from '../../features/account/useResource'
import { resolveFieldMessage } from '../../shared/api/messages'
import { say, shout } from '../../shared/a11y'
import {
  PLATFORM_ICON,
  STATUS_TAG,
  TXN_TAG,
  date,
  textOf,
  money,
} from '../../features/account/labels'

/* ==========================================================================
   ACCOUNT PANELS

   One panel per feature, each reading its own endpoint. Three shapes recur and
   are worth naming once:

     · A free account is the normal state, not an edge case. Everything here
       has to read correctly when `plan` is null, there are no transactions and
       no devices — which is exactly what a fresh sign-up looks like.
     · A write is followed by a re-read, not by a local guess. The server
       decides what a cancellation did to `expires_at`; echoing our own
       assumption would be right until the day it is not.
     · Anything destructive goes through the shared dialog: what it does, what
       you keep, what it costs, and a way out that holds the default focus.
       The confirm used to expand inline under the button, where it looked
       different on every card and could sit below the fold unseen.
   ========================================================================== */

/** "Unlimited", "3 hours", "45 minutes" — from the server's own allowance. */
function dailyLabel(sub) {
  const mins = sub?.daily_minutes
  if (mins == null) return '—'
  if (mins < 0) return 'Unlimited'
  if (mins % 60 === 0) {
    const h = mins / 60
    return `${h} hour${h === 1 ? '' : 's'}`
  }
  return `${mins} minutes`
}

/**
 * Focus the first of `ids` that exists, once the dialog that led here has
 * finished closing.
 *
 * A dialog action can outrun the dialog's own exit: the request answers while
 * the close animation is still playing, and focus() on anything behind an open
 * modal <dialog> is refused. The dialog then restores focus to its opener a
 * tick after it closes — so this waits for it to close, and lands one tick
 * after that, so the element that actually exists now gets the last word.
 */
const focusSoon = (...ids) => {
  let tries = 0
  const tick = () => {
    if (document.getElementById('dlg')?.open && tries++ < 40) {
      setTimeout(tick, 50)
      return
    }
    setTimeout(() => {
      const el = ids.map((id) => document.getElementById(id)).find(Boolean)
      el?.focus()
    }, 10)
  }
  setTimeout(tick, 0)
}

/** Server field errors -> this form's keys, via a wire-name table. */
function mapFields(error, table) {
  const out = {}
  for (const [wire, text] of Object.entries(error?.fieldErrors ?? {})) {
    if (table[wire]) out[table[wire]] = text
  }
  return out
}

/* ---------- overview ---------- */
export function Overview({ user, subscription, devices, onClose, enabled = true }) {
  /* Guarded like the fetches in AccountPage: this panel is in the render tree
     even while the account page is closed, so without it every anonymous
     visit to the marketing page fired an authenticated request and collected
     a 401. */
  const notifications = useResource(accountApi.getNotifications, { enabled })
  const sub = subscription.data
  const dev = devices.data
  const premium = sub?.is_premium

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Hei, <span id="ac-hello">{user.local}</span></h2>
        <p>
          Everything about your account lives here. Your plan, your invoices, the devices you are signed in
          on, and the switches that decide what we email you.
        </p>
      </div>

      <div className="ac-grid">
        <div className="ac-stat">
          <div className="k">Current plan</div>
          <div className="v" id="ac-plan-name">{sub ? (sub.plan ? textOf(sub.plan.name, sub.plan.name_key) : 'Free') : '—'}</div>
          <div className="n" id="ac-plan-note">
            {sub?.plan ? 'Premium, every feature included' : 'Upgrade for the full service'}
          </div>
        </div>
        <div className="ac-stat">
          <div className="k">{sub?.auto_renew ? 'Renews on' : 'Ends on'}</div>
          <div className="v mono" id="ac-renew">{date(sub?.expires_at)}</div>
          <div className="n" id="ac-renew-note">
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
            <span id="ac-dev-count">{dev ? dev.used : '—'}</span> <em>/ {dev ? dev.max_devices : sub?.max_devices ?? '—'}</em>
          </div>
          <div className="n">
            {dev && dev.used >= dev.max_devices ? 'Sign one out to free a slot' : 'Slots free'}
          </div>
        </div>
        <div className="ac-stat">
          {/* The product meters VPN *time*, not data — the free tier gets
              FREE_SESSION_MINUTES_PER_DAY minutes (BR-01/BR-02), which is a
              deployment setting the server now answers with. This tile used to
              read "1 GB / day", a limit that has never existed. */}
          <div className="k">Daily VPN time</div>
          <div className="v">{dailyLabel(sub)}</div>
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
  const dialog = useDialog()
  const toast = useToast()
  const [reasonId, setReasonId] = useState('')
  const [reasonErr, setReasonErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  const sub = subscription.data
  /* `cancelled` still has time on the clock — the plan runs to expires_at and
     only then drops to free, so it is not the same as having no plan */
  const canCancel = sub?.plan && sub.auto_renew
  const canReactivate = sub?.plan && !sub.auto_renew && sub.status !== 'expired'
  const ends = date(sub?.expires_at)
  const tag = sub?.status === 'cancelled'
    ? { text: `Cancels ${ends}`, tone: 'warn' }
    : STATUS_TAG[sub?.status] ?? { text: sub?.status ?? '', tone: 'warn' }

  /* the reasons are only worth fetching for someone who can actually cancel */
  const reasons = useResource(accountApi.getCancelReasons, { enabled: !!canCancel })

  /* The reason is asked on the card, before the dialog, because the API will
     not cancel without one (`reason_id` is `required,uuid` on
     billing.CancelRequest) — and a dialog that collects a field it then cannot
     show an error against is one you get bounced back out of. */
  const startCancel = () => {
    setError(null)
    setOk(null)
    if (!reasonId) {
      const msg = 'Choose the reason closest to yours, then cancel'
      setReasonErr(msg)
      shout(`Why are you leaving? ${msg}`)
      document.getElementById('ac-reason')?.focus()
      return
    }
    setReasonErr(null)
    dialog({
      kind: 'warn',
      title: 'Cancel your subscription?',
      body: (
        <>
          You keep every premium feature until <b>{ends}</b> — nothing switches off today. After that your
          subscription ends, your account remains available, and you can resubscribe at any time.
        </>
      ),
      actions: [
        { label: 'Keep my plan', style: 'btn-ghost' },
        { label: 'Cancel subscription', style: 'btn-red', act: confirmCancel },
      ],
    })
  }

  const confirmCancel = async () => {
    setBusy(true)
    setError(null)
    try {
      await accountApi.cancelSubscription({ reasonId })
      const fresh = await subscription.reload()
      const until = date(fresh?.expires_at ?? sub.expires_at)
      setOk(`Cancelled. Premium stays on until ${until}.`)
      toast(`Subscription cancelled. Premium stays on until ${until}.`, 'ok')
      focusSoon('ac-reactivate', 'acp-subscription')
    } catch (e) {
      /* the server names the one input this card has — show it there, in its
         own words, rather than as "check the highlighted fields" */
      const named = e?.fieldErrors?.reason_id
      if (named) {
        setReasonErr(named)
        focusSoon('ac-reason')
      } else {
        setError(e)
      }
      shout(named || e?.text || 'The subscription could not be cancelled.')
    } finally {
      setBusy(false)
    }
  }

  const reactivate = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await accountApi.reactivateSubscription()
      setOk('Auto-renewal is back on.')
      toast('Auto-renewal is back on.', 'ok')
      await subscription.reload()
      focusSoon('ac-cancel', 'acp-subscription')
    } catch (e) {
      setError(e)
      shout(e?.text || 'Auto-renewal could not be turned back on.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Subscription</h2>
        <p>What you are on now, when it renews, and how to change either of those.</p>
      </div>

      <Loader {...subscription}>
        {sub && (
          <>
            <div className="ac-card dark">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <h3 id="ac-sub-plan">{sub.plan ? `${textOf(sub.plan.name, sub.plan.name_key)} plan` : 'Free plan'}</h3>
                  <p className="sub" style={{ marginTop: 6 }}>
                    {sub.plan
                      ? `${money(sub.plan.price, sub.plan.currency)} · ${sub.plan.max_devices} device${sub.plan.max_devices > 1 ? 's' : ''} · ${sub.plan.duration_days} days`
                      : 'No charge, and no expiry. Limited servers and a daily time cap.'}
                  </p>
                </div>
                <span className={`ac-tag ${tag.tone}`} id="ac-sub-state" style={{ marginLeft: 'auto' }}>{tag.text}</span>
              </div>
              <div className="ac-facts">
                <div><div className="sub">Started</div><b className="mono">{date(sub.started_at)}</b></div>
                <div>
                  <div className="sub" id="ac-sub-endlabel">{sub.auto_renew ? 'Renews' : 'Ends'}</div>
                  <b className="mono" id="ac-sub-end">{ends}</b>
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
                  <span id="ac-auto-note">
                    {!sub.plan
                      ? 'There is nothing to renew on the free plan.'
                      : sub.auto_renew
                        ? `On. We will charge ${money(sub.plan.price, sub.plan.currency)} on ${ends} and your access carries on without a gap.`
                        : `Off. Premium access remains active until ${ends}. Your subscription will not renew after this date.`}
                  </span>
                }
              >
                {/* turning this off IS the cancellation — the backend has no
                    separate switch, so it takes the same path as the button */}
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
                  ? 'Everything your plan carries right now. Nothing here is sold as an add-on.'
                  : 'Upgrade to unlock the full service.'}
              </p>
              <div className="ac-grid" style={{ marginTop: 18, gap: 10 }}>
                {(sub.benefits.length ? sub.benefits : sub.plan?.features ?? []).map((key, i) => (
                  <span
                    key={key}
                    className="ac-tag good"
                    style={{ textTransform: 'none', letterSpacing: 0, fontSize: 'var(--fs-200)', fontWeight: 600 }}
                  >
                    {/* index-aligned with the keys — see PlanPayload.FeatureLabels */}
                    {textOf(sub.plan?.feature_labels?.[i], key)}
                  </span>
                ))}
              </div>
            </div>

            {(canCancel || canReactivate || ok) && (
              <div className="ac-card danger">
                {canReactivate ? (
                  <>
                    <h3>Restart auto-renewal</h3>
                    <p className="sub" style={{ marginTop: 6 }}>
                      Your plan is set to end on {ends}. Turn renewal back on and nothing changes.
                    </p>
                    <div className="ac-actions">
                      <button {...busyProps(busy, 'btn btn-ghost btn-sm')} type="button" id="ac-reactivate" onClick={reactivate}>
                        <span className="spin" aria-hidden="true" />
                        <span>Turn renewal back on</span>
                      </button>
                    </div>
                  </>
                ) : canCancel ? (
                  <>
                    <h3>Cancel subscription</h3>
                    <p className="sub" style={{ marginTop: 6 }}>
                      Your premium access stays active until the end of your current billing period. After that
                      your subscription ends and your account remains available.
                    </p>
                    <Loader {...reasons}>
                      <div className={`fld${reasonErr ? ' bad' : ''}`} id="fld-reason" style={{ maxWidth: 420 }}>
                        <label className="lbl" htmlFor="ac-reason">Why are you leaving?</label>
                        <select
                          id="ac-reason"
                          value={reasonId}
                          aria-invalid={reasonErr ? true : undefined}
                          aria-describedby="hint-reason er-reason"
                          onChange={(e) => {
                            setReasonId(e.target.value)
                            if (e.target.value) setReasonErr(null)
                          }}
                        >
                          <option value="">Choose a reason…</option>
                          {reasons.data?.map((r) => (
                            <option key={r.id} value={r.id}>{textOf(r.reason, r.reason_key)}</option>
                          ))}
                        </select>
                        <span className="hint" id="hint-reason">One answer, so we know what to fix. It does not change what happens to your plan.</span>
                        <em className="err" id="er-reason">{reasonErr}</em>
                      </div>
                    </Loader>
                    {/* the confirm used to expand inline here. It now goes
                        through the shared dialog, so "are you sure" looks and
                        dismisses the same way everywhere and cannot be missed
                        below the fold. */}
                    <div className="ac-actions" id="ac-cancel-wrap">
                      <button {...busyProps(busy, 'btn btn-ghost btn-sm')} type="button" id="ac-cancel" onClick={startCancel}>
                        <span className="spin" aria-hidden="true" />
                        <span>Cancel subscription</span>
                      </button>
                    </div>
                  </>
                ) : null}

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
      shout(e?.text || 'The invoice could not be opened.')
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Billing &amp; invoices</h2>
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
        <Row title="Billing email" note={<span id="ac-bill-mail">{user.email}</span>} />
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
                  <tr>
                    <th scope="col">Date</th><th scope="col">Description</th><th scope="col">Amount</th>
                    <th scope="col">Status</th><th scope="col"><span className="sr-only">Invoice</span></th>
                  </tr>
                </thead>
                <tbody>
                  {txns.data?.map((t) => {
                    const tag = TXN_TAG[t.status] ?? { text: t.status, tone: 'warn' }
                    return (
                      <tr key={t.id}>
                        <td className="mono">{date(t.date)}</td>
                        <td>{textOf(t.plan_name, t.plan_name_key)}</td>
                        <td className="amt">{money(t.amount, t.currency)}</td>
                        <td><span className={`ac-tag ${tag.tone}`}>{tag.text}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          {t.invoice_no && (
                            /* "PDF" six times over is six identical names —
                               the label says which receipt each one is */
                            <button
                              type="button"
                              className="dl"
                              aria-label={`Invoice for ${date(t.date)}, PDF`}
                              onClick={() => openInvoice(t)}
                            >
                              <Download aria-hidden="true" focusable="false" />PDF
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
  const dialog = useDialog()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)

  const list = devices.data?.devices ?? []
  const max = devices.data?.max_devices ?? 0
  const used = devices.data?.used ?? 0
  const others = list.filter((x) => !x.is_current)
  const nameOf = (d) => d.model || d.platform

  const signOut = (d) => {
    dialog({
      kind: 'warn',
      title: `Sign out ${nameOf(d)}?`,
      body: (
        <>
          It is signed out straight away, wherever it is, and frees a slot on your plan. Getting back on
          from that device takes your password.
        </>
      ),
      actions: [
        { label: 'Keep it signed in', style: 'btn-ghost' },
        {
          label: 'Sign it out',
          style: 'btn-red',
          act: async () => {
            setBusyId(d.id)
            setError(null)
            setOk(false)
            try {
              await accountApi.removeDevice(d.id)
              await devices.reload()
              toast(`${nameOf(d)} signed out.`, 'ok')
              /* its row is gone, and the button with it — land on the panel
                 rather than on <body> */
              focusSoon('acp-devices')
            } catch (e) {
              setError(e)
              shout(e?.text || `${nameOf(d)} could not be signed out.`)
            } finally {
              setBusyId(null)
            }
          },
        },
      ],
    })
  }

  const signOutOthers = () => {
    const n = others.length
    const count = `${n} device${n === 1 ? '' : 's'}`
    dialog({
      kind: 'warn',
      title: 'Sign out other devices?',
      body: (
        <>
          This signs out <b>{count}</b> and leaves this one signed in. Anyone using them will need your
          password to get back on.
        </>
      ),
      actions: [
        { label: 'Leave them signed in', style: 'btn-ghost' },
        {
          label: 'Sign them out',
          style: 'btn-red',
          act: async () => {
            setError(null)
            setBusyId('all')
            try {
              /* one at a time, not Promise.all: the endpoint is per device and a
                 burst of deletes is exactly what the rate limiter is there to stop */
              for (const d of others) {
                await accountApi.removeDevice(d.id)
              }
              await devices.reload()
              setOk(true)
              toast(`${count} signed out.`, 'ok')
              focusSoon('acp-devices')
            } catch (e) {
              setError(e)
              shout(e?.text || 'Not every device could be signed out.')
            } finally {
              setBusyId(null)
            }
          },
        },
      ],
    })
  }

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Devices</h2>
        <p>
          Your plan decides how many can be signed in at once. Signing a device out here logs it out
          immediately, wherever it is.
        </p>
      </div>

      <Loader {...devices}>
        <>
          <div className="ac-card">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h3><span id="ac-dev-n">{used}</span> of {max} slot{max === 1 ? '' : 's'} in use</h3>
              <span className="sub" id="ac-dev-free">{Math.max(0, max - used)} free</span>
            </div>
            <div className="meter"><i id="ac-dev-bar" style={{ width: `${max ? Math.min(100, (used / max) * 100) : 0}%` }} /></div>
          </div>

          <div className="ac-card" id="ac-dev-list">
            {list.length === 0 ? (
              <p className="ac-quiet">
                No devices yet. Signing in from the RusVPN app on a phone or a desktop adds it here — the
                website itself does not take a slot.
              </p>
            ) : (
              list.map((d) => (
                <Row
                  key={d.id}
                  data-device=""
                  icon={{ name: PLATFORM_ICON[d.platform] ?? 'desktop', red: d.is_current }}
                  title={`${nameOf(d)}${d.is_current ? ' · This device' : ''}`}
                  note={`Last active ${date(d.last_active_at)} · ${d.platform}${d.app_version ? ` ${d.app_version}` : ''}`}
                >
                  {d.is_current ? (
                    <span className="ac-tag good act">Current</span>
                  ) : (
                    <button
                      {...busyProps(busyId === d.id, 'btn btn-ghost btn-sm act')}
                      type="button"
                      data-signout=""
                      /* "Sign out" on every row is a list of identical names */
                      aria-label={`Sign out ${nameOf(d)}`}
                      onClick={() => busyId === null && signOut(d)}
                    >
                      <span className="spin" aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  )}
                </Row>
              ))
            )}
          </div>

          {(others.length > 0 || ok) && (
            <div className="ac-card danger">
              <h3>Sign out everywhere</h3>
              <p className="sub" style={{ marginTop: 6 }}>
                Ends every session except the one you are using right now. Handy if you lost a phone.
              </p>
              {others.length > 0 && (
                <div className="ac-actions">
                  <button
                    {...busyProps(busyId === 'all', 'btn btn-ghost btn-sm')}
                    type="button"
                    id="ac-dev-all"
                    onClick={() => busyId === null && signOutOthers()}
                  >
                    <span className="spin" aria-hidden="true" />
                    <span>Sign out all other devices</span>
                  </button>
                </div>
              )}
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

const PW_LABEL = { cur: 'Current password', pw: 'New password', again: 'Confirm new password' }
const PW_ID = { cur: 'ac-cur', pw: 'ac-new', again: 'ac-again' }
const PW_SLOT = { cur: 'cur', pw: 'new', again: 'again' }

/* the same rules and the same timing the auth page uses, so a form inside the
   account never behaves differently from one outside it. The strength rule is
   the server's BR-09, stated in its own terms. */
function checkPw(k, v) {
  if (k === 'cur' && !v.cur) return 'Enter the password you use now'
  if (k === 'pw') {
    if (!v.pw) return 'Enter the password you want to switch to'
    if (v.pw.length < 8 || !/[A-Za-z]/.test(v.pw) || !/\d/.test(v.pw)) {
      return 'Use at least 8 characters, with at least one letter and one number'
    }
    if (v.pw === v.cur) return 'This is your current password — pick a different one'
  }
  if (k === 'again') {
    if (!v.again) return 'Type the new password a second time to confirm it'
    if (v.again !== v.pw) return resolveFieldMessage('error.validation.confirmMismatch') || 'The two passwords do not match'
  }
  return null
}

export function Security({ onDevicesChanged }) {
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [alert, setAlert] = useState(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputs = { cur: useRef(null), pw: useRef(null), again: useRef(null) }
  const fields = useFieldCheck({ cur, pw, again }, checkPw)

  /* Wire name -> the input it belongs to. The server validates `old_password`
     and `new_password` (user.ChangePasswordRequest); this form calls them cur
     and pw. */
  const FIELD_MAP = { old_password: 'cur', new_password: 'pw' }

  const summarise = (bad) => {
    const lead = fixLead(bad.length)
    setAlert({
      kind: 'bad',
      lead,
      items: bad.map((b) => ({ id: PW_ID[b.key], label: PW_LABEL[b.key], msg: b.msg })),
    })
    shout(`${lead}. ${bad.map((b) => `${PW_LABEL[b.key]}, ${b.msg}`).join('. ')}`)
    inputs[bad[0].key].current?.focus()
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setOk(false)
    setAlert(null)

    const bad = fields.validate(['cur', 'pw', 'again'])
    if (bad.length) {
      summarise(bad)
      return
    }

    setBusy(true)
    say('Saving your new password…')
    try {
      await accountApi.changePassword({ oldPassword: cur, newPassword: pw })
      setCur('')
      setPw('')
      setAgain('')
      fields.reset()
      setOk(true)
      say('Password updated. Other devices have been signed out.')
      /* the server revokes the other sessions, so the device list just changed
         underneath us */
      onDevicesChanged?.()
    } catch (err) {
      const mapped = mapFields(err, FIELD_MAP)

      /* A wrong current password is an auth rejection, not a validation one —
         the server answers AUTH_002 with no `error[]`, because nothing about
         the request was malformed. It is still about one input, so it is shown
         there, in the server's own words rather than ours. */
      if (!Object.keys(mapped).length && (err?.code === 'AUTH_002' || err?.i18nKey === 'error.auth.passwordMismatch')) {
        mapped.cur = err.text
      }

      const named = ['cur', 'pw', 'again'].filter((k) => mapped[k]).map((k) => ({ key: k, msg: mapped[k] }))
      if (named.length) {
        fields.show(mapped)
        summarise(named)
      } else {
        const text = err?.text || 'Your password could not be changed. Please try again.'
        setAlert({ kind: 'bad', body: text })
        shout(text)
      }
    } finally {
      setBusy(false)
    }
  }

  const field = (k) => ({ id: PW_ID[k], slot: PW_SLOT[k], label: PW_LABEL[k], inputRef: inputs[k], ...fields.props(k) })

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Security</h2>
        <p>Your password, and what we do when someone signs in from somewhere new.</p>
      </div>

      <div className="ac-card">
        <h3>Change password</h3>
        <p className="sub">Changing it signs out every other device automatically.</p>
        <form id="ac-pw-form" noValidate style={{ maxWidth: 440 }} onSubmit={submit} aria-busy={busy}>
          <FormAlert alert={alert} id="ac-pw-alert" />
          <Field
            {...field('cur')}
            type="password"
            placeholder="Enter your current password"
            autoComplete="current-password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
          />
          <Field
            {...field('pw')}
            hint="At least 8 characters, with a letter and a number, and different from your current one."
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Field
            {...field('again')}
            type="password"
            placeholder="Type it once more"
            autoComplete="new-password"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
          />
          <div className="ac-actions">
            <button {...busyProps(busy, 'btn btn-red btn-sm')} type="submit">
              <span className="spin" aria-hidden="true" />
              <span>Save new password</span><Arw />
            </button>
          </div>
        </form>
        <Ok on={ok}>Password updated. Other devices have been signed out.</Ok>
      </div>

      {/* Two-factor sits on this card in the design. It is left out until the
          backend has an endpoint for it — a switch that saves nothing would be
          a promise about the account that is not true. */}
      <div className="ac-card">
        <PrefRows prefs={[SIGNIN_ALERTS]} />
      </div>
    </>
  )
}

/* ---------- notifications ---------- */

/* The settings row stores a free-form JSON map, so the keys are the client's
   to define. Sign-in alerts are a security control as much as an email, so
   that one is offered on the Security panel; it is the same stored key. */
const SIGNIN_ALERTS = {
  key: 'signin_alerts',
  title: 'Alert me about new sign-ins',
  label: 'New sign-in alerts',
  note: 'An email whenever your account is used on a device we have not seen before.',
  fallback: true,
}
const PREFS = [
  { key: 'renewal_reminders', title: 'Renewal reminders', note: 'A heads-up seven days before we charge you, so nothing is a surprise.', fallback: true },
  { key: 'product_updates', title: 'Product updates', note: 'New servers, new features, app releases. Roughly once a month.', fallback: true },
  { key: 'offers', title: 'Offers and discounts', note: 'Occasional deals on longer plans. Off by default.', fallback: false },
]

/** A run of switches, each one a key in the stored notifications map. */
function PrefRows({ prefs, lead }) {
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
      say(`${p.label ?? p.title} ${next ? 'on' : 'off'}`)
    } catch (e) {
      setError(e)
      shout(e?.text || `${p.label ?? p.title} could not be saved.`)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <>
      <Loader {...settings}>
        <>
          {lead}
          {prefs.map((p) => (
            <Row key={p.key} title={p.title} note={p.note}>
              <Switch
                on={valueOf(p)}
                busy={busyKey === p.key}
                label={p.label ?? p.title}
                onChange={(next) => toggle(p, next)}
              />
            </Row>
          ))}
        </>
      </Loader>
      <Bad error={error} />
    </>
  )
}

export function Notifications() {
  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Notifications</h2>
        <p>We keep this short. Security emails cannot be turned off, everything else is yours to decide.</p>
      </div>

      <div className="ac-card">
        <PrefRows
          prefs={PREFS}
          lead={
            <Row title="Security alerts" note="New sign-ins, password changes, anything that touches access.">
              <span className="ac-tag good act">Always on</span>
            </Row>
          }
        />
      </div>
    </>
  )
}

/* ---------- support ---------- */
export function Support({ onChat, onClose, onDeleted }) {
  const dialog = useDialog()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const field = useRef(null)

  /* The password is asked on the card, before the dialog: DeleteAccountRequest
     will not go through without it, and the dialog cannot show an error
     against a field it has already closed over. Empty is caught here because
     the dialog should never ask "are you sure" about a request that cannot
     succeed; a wrong one is the server's call. */
  const ask = () => {
    setError(null)
    if (!password) {
      const msg = 'Enter your password to confirm it is you'
      setErr(msg)
      shout(`Confirm with your password. ${msg}`)
      field.current?.focus()
      return
    }
    setErr(null)
    dialog({
      kind: 'danger',
      title: 'Delete your account?',
      body: (
        <>
          This removes the account, every device signed in on it, and your invoice history.{' '}
          <b>It cannot be undone</b>, and the time left on your plan is not refunded.
          <br /><br />
          If you only want the billing to stop, cancelling the subscription keeps your account and your
          invoices.
        </>
      ),
      actions: [
        { label: 'Keep my account', style: 'btn-ghost' },
        { label: 'Delete everything', style: 'btn-red', act: remove },
      ],
    })
  }

  const remove = async () => {
    /* A wrong password is AUTH_002 and carries no `error[]` — it is still
       about this input, so it is shown here. */
    setBusy(true)
    try {
      await accountApi.deleteAccount(password)
      toast('Account deleted.', 'ok')
      onDeleted()
    } catch (e) {
      const named = e?.fieldErrors?.password
      if (named || e?.code === 'AUTH_002') {
        setErr(named || e.text)
        focusSoon('ac-del-pw')
      } else {
        setError(e)
      }
      shout(named || e?.text || 'The account could not be deleted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="ac-head">
        <h2 id="ac-title">Support</h2>
        <p>Real people in Moscow, not a bot that loops you back to the help page.</p>
      </div>

      <div className="ac-card">
        <Row icon={{ name: 'bubble', red: true }} title="Live chat" note="Usually answers in under 5 minutes, 24 hours a day.">
          <button type="button" className="btn btn-ghost btn-sm act" id="ac-chat" onClick={onChat}>Start a chat</button>
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
        <div style={{ maxWidth: 420 }}>
          <Field
            id="ac-del-pw"
            slot="del-pw"
            label="Confirm with your password"
            hint="So nobody can delete the account from a session you left open."
            error={err}
            inputRef={field}
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (err && e.target.value) setErr(null)
            }}
          />
        </div>
        <div className="ac-actions" id="ac-del-wrap">
          <button {...busyProps(busy, 'btn btn-ghost btn-sm')} type="button" id="ac-del" onClick={() => !busy && ask()}>
            <span className="spin" aria-hidden="true" />
            <span>Delete my account</span>
          </button>
        </div>
        <Bad error={error} />
      </div>
    </>
  )
}
