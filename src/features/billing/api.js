import { z } from 'zod'
import { api } from '../../shared/api/client'

/* ==========================================================================
   BILLING ENDPOINTS

   The paywall (`GET /plans`) and starting a purchase (`POST
   /subscriptions/checkout`). Shapes match backend/internal/modules/billing/dto.go.

   `planSchema` lives here rather than in features/account/api.js — it fetches
   this data — and account/api.js imports it back, so the two never drift.
   ========================================================================== */

export const planSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_key: z.string(),
  /* The server renders the key for the request's language. Optional and
     defaulted: an older backend sends only the key, and `textOf` falls back to
     the local table for exactly that case. */
  name: z.string().default(''),
  group_code: z.string(),
  device_variant: z.string(),
  duration_days: z.number(),
  price: z.string(),
  currency: z.string(),
  discount_percent: z.number(),
  offer_key: z.string().nullable(),
  max_devices: z.number(),
  features: z.array(z.string()).default([]),
  /* index-aligned with `features` */
  feature_labels: z.array(z.string()).default([]),
})

const planGroupSchema = z.object({
  group_code: z.string(),
  single: planSchema.nullable(),
  multi: planSchema.nullable(),
})

const plansResponseSchema = z.object({
  free: planSchema.nullable(),
  groups: z.array(planGroupSchema),
})

const checkoutResponseSchema = z.object({
  order_no: z.string(),
  checkout_url: z.string(),
  transaction_id: z.string(),
  provider: z.string(),
  amount: z.string(),
  currency: z.string(),
  expires_at: z.string(),
})

export const getPlans = () => api.get('/plans', plansResponseSchema)

/**
 * Starts a Stripe Checkout session. `platform: 'web'` is what tells the
 * backend to point Stripe's success/cancel redirect at this site's own
 * routes instead of the mobile app's `rusnetvpn://` deep links.
 */
export const startCheckout = (planCode) =>
  api.post('/subscriptions/checkout', { plan_code: planCode, platform: 'web' }, checkoutResponseSchema)

/* ==========================================================================
   THE LAST CHECKOUT

   Stripe sends the browser back with nothing but the route — no order number,
   no amount, no plan. The result page needs all three: to print a receipt, to
   match the order against GET /transactions while it waits on the webhook,
   and to offer "try again" on the same plan after a failed card.

   So the session is written down on the way out. sessionStorage, not local:
   it belongs to this tab's round trip to Stripe and nothing after it. Every
   access is guarded — a private window or blocked site data must cost the
   receipt, never the redirect.
   ========================================================================== */

const LAST_CHECKOUT = 'rv.checkout'

export function lastCheckout() {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_CHECKOUT)) ?? null
  } catch {
    return null
  }
}

/**
 * Start a checkout and leave for Stripe. `planName` is optional — the
 * post-sign-in path only has the code — and only feeds the receipt.
 */
export async function beginCheckout(planCode, planName = '') {
  const session = await startCheckout(planCode)
  try {
    sessionStorage.setItem(
      LAST_CHECKOUT,
      JSON.stringify({
        plan_code: planCode,
        plan_name: planName,
        order_no: session.order_no,
        amount: session.amount,
        currency: session.currency,
        started_at: new Date().toISOString(),
      }),
    )
  } catch {
    // no storage: the result page just prints less
  }
  window.location.href = session.checkout_url
  return session
}
