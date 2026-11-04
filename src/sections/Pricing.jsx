import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Btn } from '../components/ui'
import { Check, Chevron, Warn } from '../components/icons'
import { Loader } from '../components/account/parts'
import Tooltip from '../components/Tooltip'
import { GLOSSARY, PAY_METHODS } from '../data/content'
import { getPlans } from '../features/billing/api'
import { useResource } from '../features/account/useResource'
import { money, moneyParts, textOf } from '../features/account/labels'
import { useSession } from '../state/session'
import { reducedMotion, say, shout, tablistKeys } from '../shared/a11y'

/* ==========================================================================
   PRICING

   Plans come from GET /plans (backend/internal/modules/billing) — nothing
   here is hardcoded. Duration names and feature lines arrive as i18n keys
   (`plans.items.year.title`, `plans.features.allServers`); `textOf()` from
   features/account/labels.js is the same lookup the account page already
   uses, so the two never say different things for the same key.

   Only the `single` (1-device) variant is shown, matching the card this
   section always had. `multi` (5 devices) is in the API but not surfaced
   here yet.

   Only the price and the term are taken from the payload; the per-month
   equivalent, the "Save 25%" badges and the comparison table are all derived
   from those two, so the switcher can never advertise a discount the price no
   longer supports. Savings are measured against the 1-month rate — the
   shortest plan a buyer would realistically compare against — and that
   baseline is stated in the table's caption rather than left for them to
   reverse-engineer. Without a monthly plan to measure against, the server's
   own discount_percent stands in.
   ========================================================================== */

/* One primary CTA, so it is one string rather than a per-plan field that the
   rows have to keep agreeing on. The plan is already named in the card above
   the button; the button says what pressing it does. */
const BUY_CTA = 'Get RusVPN'
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

/* A month is a twelfth of a year, so a week is 1/4.345 of one. Anything a
   month or longer is a whole number of months — 182 days is "6 Months", and
   dividing by 30.4 would print 5.98 of them and a per-month figure a cent off. */
const monthsOf = (days) => (days < 28 ? (days * 12) / 365 : Math.max(1, Math.round((days * 12) / 365)))

/* CSS time is seconds unless it says ms. Read off the stylesheet so a
   duration lives in one place and the swap lands exactly as the exit ends. */
function cssMs(prop, fallback) {
  const v = String(getComputedStyle(document.documentElement).getPropertyValue(prop)).trim()
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return fallback
  return /ms\s*$/.test(v) ? n : n * 1000
}

function toItems(groups) {
  const items = groups
    .filter((g) => g.single)
    .map(({ single }) => {
      const name = textOf(single.name, single.name_key)
      const price = Number(single.price)
      const months = monthsOf(single.duration_days)
      /* The currency is the plan's own, not a guess from the language picker:
         the server prices each plan in the currency the request's language
         maps to and stamps it on the payload. Printing a rupiah figure with a
         dollar sign because the picker says Indonesia is exactly the bug that
         would cause. */
      return {
        code: single.code,
        group: single.group_code,
        short: name,
        n: `${name.replace(' ', '-')} plan`,
        amount: single.price,
        currency: single.currency,
        price,
        months,
        perMonth: price / months,
        per: `${money(single.price, single.currency)} / ${name}`,
        offer: !!single.offer_key,
        discount: single.discount_percent,
        /* the server renders these for the request's language; the keys ride
           along for the fallback */
        features: single.features.map((key, i) => ({ key, text: textOf(single.feature_labels?.[i], key) })),
      }
    })

  const base = items.find((x) => x.group === 'month') ?? items.find((x) => x.months === 1) ?? null
  for (const x of items) {
    if (base) {
      const pct = Math.round((1 - x.perMonth / base.perMonth) * 100)
      x.savePct = pct > 0 ? pct : 0
      /* what the same coverage would have cost month-to-month, minus what it costs */
      x.saveCash = x.savePct ? base.perMonth * x.months - x.price : 0
    } else {
      x.savePct = x.discount > 0 ? x.discount : 0
      x.saveCash = 0
    }
  }
  /* the server's offer flag names the best deal; failing that, the biggest saving */
  const best = items.find((x) => x.offer) ?? items.reduce((a, b) => (b.savePct > (a?.savePct ?? -1) ? b : a), null)
  for (const x of items) {
    x.best = x === best
    x.save = x.savePct ? `Save ${x.savePct}%${x.best ? ' · best deal' : ''}` : ''
  }
  return { items, base }
}

export default function Pricing() {
  const { openAccount, openCheckout, selectPlan, language } = useSession()
  /* Re-fetched when the language changes: the prices themselves differ, not
     just their formatting — GET /plans quotes the currency the language maps
     to (backend domain.Plan.PriceIn). */
  const plans = useResource(getPlans)
  useEffect(() => {
    plans.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])
  const { items, base } = useMemo(() => toItems(plans.data?.groups ?? []), [plans.data])

  const [plan, setPlan] = useState(0)
  /* the figure on the card — it trails `plan` through the roll, so the digits
     never change while they are still visible */
  const [shown, setShown] = useState(0)
  const [busyCode, setBusyCode] = useState(null)
  const [buyError, setBuyError] = useState(null)
  const [cmpOpen, setCmpOpen] = useState(false)
  const amt = useRef(null)
  const panel = useRef(null)
  const timers = useRef({ roll: 0, land: 0, rolling: false })

  useEffect(() => () => {
    clearTimeout(timers.current.roll)
    clearTimeout(timers.current.land)
  }, [])

  /* once the catalogue loads, default to the best-value plan instead of the
     first tab — falls back to the last one if nothing is flagged */
  useEffect(() => {
    if (!plans.data) return
    const bestIndex = items.findIndex((x) => x.best)
    const next = bestIndex >= 0 ? bestIndex : items.length - 1
    if (next < 0) return
    setPlan(next)
    setShown(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans.data])

  /* ---------- the price roll ----------
     Out on the exit curve, swap, then in. Deliberately a timer and not
     'animationend': an animation on an element the engine is not currently
     painting stays pending, and the price has to be correct whether or not
     anyone painted it. Every way this can fail fails with the number on
     screen — see the .roll-* rules in pricing.css. */
  const roll = (next) => {
    const el = amt.current
    const t = timers.current
    if (!el || reducedMotion()) {
      setShown(next)
      return
    }
    /* off and on with a reflow between, so switching plans faster than the
       roll finishes restarts the exit rather than leaving the old figure
       mid-flight */
    el.classList.remove('roll-out', 'roll-set', 'roll-done')
    void el.offsetWidth
    el.classList.add('roll-out')
    clearTimeout(t.roll)
    clearTimeout(t.land)
    t.roll = setTimeout(() => {
      t.rolling = true
      setShown(next)
    }, cssMs('--t-1', 150) + 16)
  }

  /* The new figure is in the DOM: park it below with transitions off, force
     the reflow that commits that state, then drop back to the resting style so
     the rise is a transition from where it now is — all in one synchronous
     block, because waiting a frame would keep the price hidden for as long as
     frames are not arriving. A timer then asserts the landing. */
  useLayoutEffect(() => {
    const el = amt.current
    const t = timers.current
    if (!el || !t.rolling) return
    t.rolling = false
    el.classList.remove('roll-out')
    el.classList.add('roll-set')
    void el.offsetWidth
    el.classList.remove('roll-set')
    clearTimeout(t.land)
    t.land = setTimeout(() => el.classList.add('roll-done'), cssMs('--t-4', 420) + 80)
  }, [shown])

  const choose = (i) => {
    if (i === plan) return
    setPlan(i)
    roll(i)
    const d = items[i]
    say(
      `${d.n}, ${d.per}, ${money(d.perMonth.toFixed(2), d.currency)} a month` +
        (d.savePct ? `, saving ${d.savePct} percent` : ''),
    )
  }

  const buy = async (x) => {
    if (!x || busyCode) return
    setBuyError(null)
    setBusyCode(x.code)
    try {
      await openCheckout(x.code, x.short)
    } catch (error) {
      // Already subscribed, or already on this plan: not a failure, just
      // somewhere else to look.
      if (error.code === 'SUBS_003' || error.code === 'SUBS_006') {
        openAccount('subscription')
        return
      }
      const text = error.text ?? 'Could not start checkout. Please try again.'
      setBuyError(text)
      shout(text)
    } finally {
      setBusyCode(null)
    }
  }

  const p = items[plan]
  /* tell the session which plan is on the card, so the header's and the
     hero's "Get RusVPN" buy this one rather than a default */
  useEffect(() => {
    selectPlan(p?.code, p?.short)
  }, [p?.code, p?.short, selectPlan])
  const showing = items[shown]
  const amount = showing ? moneyParts(showing.amount, showing.currency) : null
  const busy = !!p && busyCode === p.code
  const busyStyle = { opacity: busy ? 0.55 : undefined, pointerEvents: busy ? 'none' : undefined }
  const count = WORDS[items.length] ?? String(items.length)

  const buyButton = (variant, marginTop, id) => (
    <Btn
      href="#"
      id={id}
      variant={variant}
      magnetic
      aria-busy={busy || undefined}
      style={{ marginTop, ...busyStyle }}
      onClick={(e) => {
        e.preventDefault()
        buy(p)
      }}
    >
      {busy ? 'Opening checkout…' : BUY_CTA}
    </Btn>
  )

  return (
    <section className="sec wrap" id="pricing" style={{ paddingTop: 0 }}>
      <div className="sec-head">
        <div className="col up">
          <span className="eyebrow">Welcome to Our Service</span>
          <h2>Security. Privacy. Freedom. <span className="serif">For everyone.</span></h2>
          {/* a row of buttons that swap one panel is a tablist: arrow keys move
              between plans and the selected one is stated */}
          {items.length > 0 && (
            <div className="seg" id="seg" role="tablist" aria-label="Billing period" onKeyDown={tablistKeys}>
              {items.map((x, i) => (
                <button
                  key={x.code}
                  type="button"
                  role="tab"
                  id={`seg-${i}`}
                  aria-selected={i === plan}
                  aria-controls="plan-panel"
                  tabIndex={i === plan ? 0 : -1}
                  className={i === plan ? 'on' : undefined}
                  onClick={() => choose(i)}
                >
                  {x.short}
                  {x.best && <span className="best">Best Deal</span>}
                  {x.savePct > 0 && <span className="segsave">Save {x.savePct}%</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="aside up" style={{ '--d': '100ms' }}>
          Every plan gets the full service. RusVPN is a privacy-focused VPN with a strict no-logs policy, built
          from the ground up locally in Russia.
        </p>
      </div>

      <Loader loading={plans.loading} error={plans.error} reload={plans.reload} empty={items.length === 0} emptyText="Pricing is not available right now.">
        {p && (
          <div className="price-grid up">
            <div className="pcard" id="plan-panel" role="tabpanel" aria-labelledby={`seg-${plan}`} ref={panel}>
              <h3 id="p-name">{p.n}</h3>
              {/* The symbol is its own span because it is styled smaller and
                  raised; `symbol_first` decides which side it sits on, so a
                  ruble price reads "899 ₽" rather than "₽899". */}
              <div className="amt mono" id="p-amt" ref={amt}>
                {amount?.symbolFirst && <span className="cur">{amount.symbol}</span>}
                <span className="val" id="p-val">{amount?.value}</span>
                {amount && !amount.symbolFirst && <span className="cur after">{amount.symbol}</span>}
              </div>
              <p className="per">billed once · <b id="p-per">{p.per}</b></p>
              <span className="save" id="p-save" style={{ display: p.save ? '' : 'none' }}>
                <Check style={{ width: 13, height: 13 }} />
                {p.save}
              </span>
              <ul className="feat">
                {p.features.map((f) => {
                  const g = GLOSSARY[f.key]
                  return (
                    <li key={f.key}>
                      <Check />
                      {g ? <Tooltip id={f.key.split('.').pop()} term={f.text} lead={g.lead} body={g.body} /> : f.text}
                    </li>
                  )
                })}
              </ul>
              {buyButton('red', 34, 'p-cta')}
              {buyError && (
                <div className="auth-alert" role="alert" style={{ marginTop: 16 }}>
                  <Warn /><span>{buyError}</span>
                </div>
              )}
              {/* The billing term people actually ask about, explained where
                  they read it rather than only in the FAQ. */}
              <p className="fine">
                <Tooltip id="renew" term="Auto-renewal" name="auto-renewal" lead={GLOSSARY.renew.lead} body={GLOSSARY.renew.body} />
                {' '}is on by default. Turn off auto-renewal any time — you will keep access until the end of the
                paid period, and your card will not be charged again.
              </p>
            </div>

            <div className="trial">
              <div>
                <span
                  className="eyebrow"
                  style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.14)' }}
                >
                  <i className="dot" />30-Day Money-Back Guarantee
                </span>
                <h3 style={{ marginTop: 18 }}>A secure and independent VPN solution.</h3>
                <p>
                  Fully controlled from Moscow. Secure your online privacy with a VPN that respects your values and
                  protects you from prying eyes as you browse.
                </p>
              </div>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <p className="tiny" style={{ color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>
                  Total payable at checkout
                </p>
                {/* white chips: half these marks are black or near-black, so on the
                    dark card they need their own light plate rather than a recolour
                    that breaks the brand */}
                <div className="paylist">
                  {PAY_METHODS.map((m) => (
                    <span key={m.key}>
                      <img className={`paylogo pl-${m.key}`} src={`/images/pay/${m.key}.svg`} alt={m.aria} />
                      {m.label}
                    </span>
                  ))}
                </div>
                {buyButton('white', 26)}
              </div>
            </div>

            {/* ---------- COMPARE ----------
                The switcher shows one plan at a time, which is enough to pick
                but not enough to choose: "Save 37%" is meaningless unless you
                can see the thing it is 37% cheaper than. A real <table> with
                scope headers, so a screen reader walks it by row and column
                instead of hearing thirty loose cells. */}
            {items.length > 1 && (
              <>
                <div className="cmp-toggle up">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    id="cmp-btn"
                    aria-expanded={cmpOpen}
                    aria-controls="cmp"
                    onClick={() => {
                      setCmpOpen((o) => !o)
                      say(cmpOpen ? 'Plan comparison hidden' : `Plan comparison shown, ${count} plans`)
                    }}
                  >
                    <span id="cmp-btn-label">{cmpOpen ? 'Hide the comparison' : `Compare all ${count} plans`}</span>
                    <span className="arw" style={{ background: 'var(--paper-2)' }}>
                      <Chevron aria-hidden="true" focusable="false" />
                    </span>
                  </button>
                </div>
                <div className={`cmp${cmpOpen ? ' on' : ''}`} id="cmp">
                  <div className="cmp-scroll">
                    <table>
                      <caption>
                        Every plan includes the same features. Longer terms cost less per month
                        {base && (
                          <>
                            {' '}— the saving is measured against the{' '}
                            <span id="cmp-base">{base.short.toLowerCase().replace(' ', '-')}</span> rate
                          </>
                        )}
                        .
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Plan</th>
                          <th scope="col">Per month</th>
                          <th scope="col">You pay</th>
                          <th scope="col">Saving</th>
                          <th scope="col"><span className="sr-only">Choose a plan</span></th>
                        </tr>
                      </thead>
                      <tbody id="cmp-body">
                        {items.map((x, i) => (
                          <tr key={x.code} className={x.best ? 'is-best' : undefined}>
                            <th scope="row" className="plan">
                              {x.short}
                              {x.best && (
                                <span className="ac-tag good" style={{ fontSize: 10, padding: '4px 8px', marginLeft: 6 }}>
                                  Best deal
                                </span>
                              )}
                            </th>
                            <td className="mo">{money(x.perMonth.toFixed(2), x.currency)}</td>
                            <td className="tot">
                              {money(x.amount, x.currency)} <span style={{ color: 'var(--muted)' }}>once</span>
                            </td>
                            <td>
                              {x.savePct ? (
                                <span className="sv">
                                  Save {x.savePct}%
                                  {x.saveCash > 0 && (
                                    <>
                                      <br />
                                      <span style={{ fontWeight: 500, fontSize: 'var(--fs-200)' }}>
                                        {money(x.saveCash.toFixed(2), x.currency)} over the term
                                      </span>
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="sv none">{x === base ? 'Baseline rate' : '—'}</span>
                              )}
                            </td>
                            <td className="pick">
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                  choose(i)
                                  /* send them back to the card they just chose,
                                     and put focus on its tab, so the choice does
                                     not silently happen off-screen */
                                  panel.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
                                  document.getElementById(`seg-${i}`)?.focus({ preventScroll: true })
                                }}
                              >
                                Choose
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Loader>
    </section>
  )
}
