import { useEffect, useState } from 'react'
import { Btn } from '../components/ui'
import { Check, Warn } from '../components/icons'
import { Loader } from '../components/account/parts'
import { getPlans, startCheckout } from '../features/billing/api'
import { useResource } from '../features/account/useResource'
import { label, money, moneyParts, textOf } from '../features/account/labels'
import { useSession } from '../state/session'

/* ==========================================================================
   PRICING

   Plans come from GET /plans (backend/internal/modules/billing) — nothing
   here is hardcoded. Duration names and feature lines arrive as i18n keys
   (`plans.items.year.title`, `plans.features.allServers`); `label()` from
   features/account/labels.js is the same lookup the account page already
   uses, so the two never say different things for the same key.

   Only the `single` (1-device) variant is shown, matching the card this
   section always had. `multi` (5 devices) is in the API but not surfaced
   here yet.
   ========================================================================== */

const PAY = [
  { key: 'card', label: 'Visa / Mastercard' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'apple', label: 'Apple Pay' },
  { key: 'google', label: 'Google Pay' },
  { key: 'stripe', label: 'Stripe' },
]

function toItem(group) {
  const single = group.single
  const name = textOf(single.name, single.name_key)
  /* The currency is the plan's own, not a guess from the language picker: the
     server prices each plan in the currency the request's language maps to and
     stamps it on the payload, falling back to the plan's base currency where
     no price has been entered yet. Printing a rupiah figure with a dollar sign
     because the picker says Indonesia is exactly the bug that would cause. */
  return {
    code: single.code,
    tab: name,
    n: `${name} plan`,
    amount: single.price,
    currency: single.currency,
    per: `${money(single.price, single.currency)} / ${name}`,
    save: single.discount_percent > 0 ? `Save ${single.discount_percent}%` : '',
    cta: `Get ${name} Plan`,
    best: !!single.offer_key,
    /* the server renders these for the request's language; the keys ride
       along for the fallback */
    features: single.features.map((key, i) => ({ key, text: textOf(single.feature_labels?.[i], key) })),
  }
}

export default function Pricing() {
  const { openAuth, openAccount, user, language } = useSession()
  /* Re-fetched when the language changes: the prices themselves differ, not
     just their formatting — GET /plans quotes the currency the language maps
     to (backend domain.Plan.PriceIn). */
  const plans = useResource(getPlans)
  useEffect(() => {
    plans.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])
  const items = (plans.data?.groups ?? []).filter((g) => g.single).map(toItem)

  const [plan, setPlan] = useState(0)
  /* the amount fades out, swaps, fades back — so the digits shown lag the
     selected plan by one beat, on purpose */
  const [shown, setShown] = useState(0)
  const [flip, setFlip] = useState(false)
  const [busyCode, setBusyCode] = useState(null)
  const [buyError, setBuyError] = useState(null)

  useEffect(() => {
    if (plan === shown) return
    setFlip(true)
    const t = setTimeout(() => {
      setShown(plan)
      setFlip(false)
    }, 180)
    return () => clearTimeout(t)
  }, [plan, shown])

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

  const buy = async (code) => {
    if (!code || busyCode) return
    if (!user) {
      openAuth('up', undefined, undefined, code)
      return
    }
    setBuyError(null)
    setBusyCode(code)
    try {
      const session = await startCheckout(code)
      window.location.href = session.checkout_url
    } catch (error) {
      setBusyCode(null)
      // Already subscribed, or already on this plan: not a failure, just
      // somewhere else to look.
      if (error.code === 'SUBS_003' || error.code === 'SUBS_006') {
        openAccount('subscription')
        return
      }
      setBuyError(error.text ?? 'Could not start checkout. Please try again.')
    }
  }

  const p = items[plan]
  const showing = items[shown]
  const amount = showing ? moneyParts(showing.amount, showing.currency) : null
  const busy = !!p && busyCode === p.code

  return (
    <section className="sec wrap" id="pricing" style={{ paddingTop: 0 }}>
      <div className="sec-head">
        <div className="col up">
          <span className="eyebrow">Welcome to Our Service</span>
          <h2>Security. Privacy. Freedom. <span className="serif">For everyone.</span></h2>
          {items.length > 0 && (
            <div className="seg">
              {items.map((x, i) => (
                <button key={x.code} className={i === plan ? 'on' : undefined} onClick={() => setPlan(i)}>
                  {x.tab}
                  {x.best && <span className="best">Best Deal</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="aside up" style={{ '--d': '100ms' }}>
          Every plan gets the full service. RusVPN is the best guaranteed no-log VPN built from ground up
          locally in Russia.
        </p>
      </div>

      <Loader loading={plans.loading} error={plans.error} reload={plans.reload} empty={items.length === 0} emptyText="Pricing is not available right now.">
        {p && (
          <div className="price-grid up">
            <div className="pcard">
              <h3>{p.n}</h3>
              {/* The symbol is its own span because it is styled smaller and
                  raised; `symbol_first` decides which side it sits on, so a
                  ruble price reads "899 ₽" rather than "₽899". */}
              <div className={`amt mono${flip ? ' flip' : ''}`}>
                {amount?.symbolFirst && <span className="cur">{amount.symbol}</span>}
                <span className="val">{amount?.value}</span>
                {amount && !amount.symbolFirst && <span className="cur after">{amount.symbol}</span>}
              </div>
              <p className="per">billed once · <b>{p.per}</b></p>
              <span className="save" style={{ display: p.save ? '' : 'none' }}>
                <Check style={{ width: 13, height: 13 }} />
                {p.save}
              </span>
              <ul className="feat">
                {p.features.map((f) => (
                  <li key={f.key}><Check />{f.text}</li>
                ))}
              </ul>
              <Btn
                href="#create-account"
                variant="red"
                magnetic
                style={{ marginTop: 34, opacity: busy ? 0.55 : undefined, pointerEvents: busy ? 'none' : undefined }}
                onClick={(e) => {
                  e.preventDefault()
                  buy(p.code)
                }}
              >
                {busy ? 'Redirecting…' : p.cta}
              </Btn>
              {buyError && (
                <div className="auth-alert" role="alert" style={{ marginTop: 16 }}>
                  <Warn /><span>{buyError}</span>
                </div>
              )}
              <p className="fine">
                Auto-renewal is on by default. Turn off auto-renewal any time — you will keep access until the end
                of the paid period, and your card will not be charged again.
              </p>
            </div>

            <div className="trial">
              <div>
                <span
                  className="eyebrow"
                  style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.14)' }}
                >
                  <i className="dot" />Try at no cost
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
                  {PAY.map((m) => (
                    <span key={m.key}>
                      <img className={`paylogo pl-${m.key}`} src={`/images/pay/${m.key}.svg`} alt={m.label} />
                      {m.label}
                    </span>
                  ))}
                </div>
                <Btn
                  href="#create-account"
                  variant="white"
                  magnetic
                  style={{ marginTop: 26, opacity: busy ? 0.55 : undefined, pointerEvents: busy ? 'none' : undefined }}
                  onClick={(e) => {
                    e.preventDefault()
                    buy(p.code)
                  }}
                >
                  Try RusVPN Now
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Loader>
    </section>
  )
}
