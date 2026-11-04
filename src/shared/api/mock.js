/* ==========================================================================
   MOCK BACKEND — development only

   Turned on with VITE_MOCK_API=true (see .env.example). Answers every endpoint
   the page calls with a plausible envelope, so the site can be walked end to
   end — sign in, pricing, checkout, My Account — without the Go backend.

   It sits under `send()` in client.js, which means the envelope unwrapping,
   the error mapping and the zod schemas all still run: a mock that skipped
   validation would happily show shapes the real API never sends.

   State that should survive a reload (who is signed in, what was bought) lives
   in localStorage under `rv.mock`. Clear it to start over.

     · Any email and password sign in. Any 6-digit code verifies.
     · Checkout skips Stripe and lands on #checkout-success. The plan stays
       "pending" for a few seconds, the way a real webhook trails the redirect,
       then turns active.
     · Buy the 1 Week plan to see a declined payment instead.
   ========================================================================== */

const KEY = 'rv.mock'
const LATENCY_MS = 350
const WEBHOOK_DELAY_MS = 6000
/* the plan that always declines, so the failed screen is reachable too */
const DECLINED_PLAN = 'week'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}
const write = (patch) => {
  const next = { ...read(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private window: the mock just forgets on reload
  }
  return next
}

const iso = (ms = 0) => new Date(Date.now() + ms).toISOString()
const DAY = 864e5

/* ---------- catalogue ----------
   The tables are functions, not constants: a top-level `[...].map()` is a
   call the bundler cannot prove pure, so it would survive tree-shaking and
   ship the fixtures in the production bundle. */

const FEATURES = {
  free: ['plans.features.freeServers', 'plans.features.standardSpeed', 'plans.features.oneDevice'],
  paid: [
    'plans.features.allServers',
    'plans.features.maxSpeed',
    'plans.features.unlimitedData',
    'plans.features.allProtocols',
    'plans.features.splitTunneling',
    'plans.features.noAds',
  ],
}

const plan = (code, days, price, discount = 0, offer = null) => ({
  id: `plan-${code}`,
  code,
  name_key: `plans.items.${code}.title`,
  name: '',
  group_code: code,
  device_variant: 'single',
  duration_days: days,
  price,
  currency: 'USD',
  discount_percent: discount,
  offer_key: offer,
  max_devices: 1,
  features: code === 'free' ? FEATURES.free : FEATURES.paid,
  feature_labels: [],
})

const PLANS = () => [plan('week', 7, '2.99'), plan('month', 30, '7.99'), plan('half', 182, '35.99', 25), plan('year', 365, '47.99', 50, 'best')]
const FREE = () => plan('free', 0, '0')

/* ---------- account ---------- */

function userPayload(s) {
  return {
    id: 'mock-user',
    account_type: 'registered',
    name: s.name ?? null,
    email: s.email ?? 'you@example.com',
    phone: null,
    language: 'en',
    is_verified: true,
    tier: isPremium(s) ? 'premium' : 'free',
  }
}

const session = (s) => ({
  user: userPayload(s),
  tokens: { access_token: 'mock-access', refresh_token: 'mock-refresh', token_type: 'Bearer', expires_at: iso(DAY) },
})

/* paid, and the pretend webhook has had time to land */
const isPremium = (s) => !!s.order && s.order.outcome === 'paid' && Date.now() - s.order.at >= WEBHOOK_DELAY_MS

function subscription(s) {
  if (!isPremium(s)) {
    return {
      status: 'free', plan: null, pending_plan: null, started_at: null, expires_at: null, cancelled_at: null,
      auto_renew: false, days_remaining: 0, max_devices: 1, is_premium: false, daily_minutes: 180, benefits: [],
    }
  }
  const p = PLANS().find((x) => x.code === s.order.plan_code)
  const expires = s.order.at + p.duration_days * DAY
  const autoRenew = s.auto_renew !== false
  return {
    status: autoRenew ? 'active' : 'cancelled',
    plan: p,
    pending_plan: null,
    started_at: new Date(s.order.at).toISOString(),
    expires_at: new Date(expires).toISOString(),
    cancelled_at: autoRenew ? null : iso(),
    auto_renew: autoRenew,
    days_remaining: Math.max(0, Math.ceil((expires - Date.now()) / DAY)),
    max_devices: p.max_devices,
    is_premium: true,
    daily_minutes: -1,
    benefits: p.features,
  }
}

function transactions(s) {
  if (!s.order) return []
  const settled = Date.now() - s.order.at >= WEBHOOK_DELAY_MS
  const status = s.order.outcome === 'failed' ? 'failed' : settled ? 'paid' : 'pending'
  return [{
    id: 'txn-1',
    order_no: s.order.order_no,
    date: new Date(s.order.at).toISOString(),
    plan_name_key: `plans.items.${s.order.plan_code}.title`,
    plan_name: '',
    amount: s.order.amount,
    currency: 'USD',
    status,
    payment_method: status === 'paid' ? 'Visa •••• 4242' : null,
    invoice_no: status === 'paid' ? 'INV-0001' : null,
  }]
}

/* ---------- public content ---------- */

const LOCATIONS = () => [
  ['us', 'United States', 'New York', '🇺🇸', 48, true, 34],
  ['de', 'Germany', 'Frankfurt', '🇩🇪', 32, true, 21],
  ['nl', 'Netherlands', 'Amsterdam', '🇳🇱', 24, false, 18],
  ['gb', 'United Kingdom', 'London', '🇬🇧', 28, false, 41],
  ['sg', 'Singapore', 'Singapore', '🇸🇬', 20, true, 27],
  ['jp', 'Japan', 'Tokyo', '🇯🇵', 18, false, 39],
  ['br', 'Brazil', 'São Paulo', '🇧🇷', 12, false, 52],
  ['ae', 'United Arab Emirates', 'Dubai', '🇦🇪', 8, false, 30],
].map(([cc, name, city, flag, n, free, load], i) => ({
  id: `loc-${i}`, country_code: cc, country_name: name, city, flag_emoji: flag, server_count: n, has_free: free, best_load: load,
}))

const FAQS = () => [
  ['Is RusVPN free to use?', 'Yes. The free plan connects to five locations with a daily allowance. Premium unlocks every server, full speed and no limits.'],
  ['Do you keep logs?', 'No. We do not record what you browse, which servers you use or when — there is nothing to hand over.'],
  ['How many devices can I use?', 'One device on a single plan, five at once on a multi-device plan.'],
  ['Can I cancel at any time?', 'Yes. Turn auto-renewal off in My Account and your plan runs until the end of the period you paid for.'],
  ['Which payment methods do you accept?', 'Visa, Mastercard, PayPal, Apple Pay and Google Pay, processed securely by Stripe.'],
].map(([question, answer], i) => ({ id: `faq-${i}`, category: 'general', question, answer, sort_order: i }))

/* ---------- routing ---------- */

const ok = (data) => ({ status: 200, body: { status: true, msg: 'success.ok', data } })
const fail = (status, code, text) => ({
  status,
  body: { status: false, error_code: code, msg: `error.${code}`, msg_localized: text },
})

function route(method, path, body) {
  const s = read()
  const signedIn = !!s.email
  const [p] = path.split('?')

  // public
  if (p === '/plans') return ok({ free: FREE(), groups: PLANS().map((x) => ({ group_code: x.code, single: x, multi: null })) })
  if (p === '/locales') {
    return ok({
      languages: [
        { code: 'en', name: 'English', native_name: 'English', currency_code: 'USD', is_default: true },
        { code: 'id', name: 'Indonesian', native_name: 'Bahasa Indonesia', currency_code: 'USD', is_default: false },
      ],
      currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, symbol_first: true }],
      default_language: 'en',
      resolved_language: 'en',
      resolved_currency: 'USD',
    })
  }
  if (p === '/servers/locations') return ok(LOCATIONS())
  if (p === '/content/faqs') return ok(FAQS())
  if (p.startsWith('/content/legal/')) {
    return ok({ type: p.split('/').pop(), version: '1.0', content: 'Mock legal document.', published_at: iso(-30 * DAY) })
  }

  // auth
  if (p === '/auth/login' || p === '/auth/google') {
    const email = body?.email ?? 'google.user@example.com'
    return ok(session(write({ email, name: s.email === email ? s.name : null })))
  }
  if (p === '/auth/register') {
    write({ pendingEmail: body.email, pendingName: body.name })
    return ok({ user: { ...userPayload({ email: body.email, name: body.name }), is_verified: false }, otp_expires_at: iso(10 * 60e3), resend_after_ms: 60e3 })
  }
  if (p === '/auth/otp/verify') {
    if (!/^\d{6}$/.test(body?.code ?? '')) return fail(422, 'VALIDATION_001', 'Enter the 6-digit code.')
    if (body.purpose === 'register') {
      return ok(session(write({ email: s.pendingEmail ?? body.email, name: s.pendingName ?? null })))
    }
    return ok({ verified: true })
  }
  if (p === '/auth/otp/resend' || p === '/auth/forgot-password') {
    return ok({ email: body.email, purpose: body.purpose ?? 'reset_password', expires_at: iso(10 * 60e3), resend_after_ms: 60e3 })
  }
  if (p === '/auth/reset-password') return ok(null)
  if (p === '/auth/logout') {
    write({ email: null })
    return ok(null)
  }

  // everything below needs a session
  if (!signedIn) return fail(401, 'AUTH_001', 'Please sign in again.')

  if (p === '/me' && method === 'GET') return ok({ ...userPayload(s), member_since: iso(-90 * DAY) })
  if (p === '/me' && method === 'DELETE') {
    localStorage.removeItem(KEY)
    return ok(null)
  }
  if (p === '/me/password') return ok(null)
  if (p === '/subscriptions/current') return ok(subscription(s))
  if (p === '/subscriptions/checkout') {
    if (isPremium(s)) return fail(409, 'SUBS_003', 'You already have an active subscription.')
    const chosen = PLANS().find((x) => x.code === body.plan_code)
    if (!chosen) return fail(404, 'UNKNOWN', 'That plan does not exist.')
    const outcome = chosen.code === DECLINED_PLAN ? 'failed' : 'paid'
    const order = { order_no: `RV-${Date.now().toString(36).toUpperCase()}`, plan_code: chosen.code, amount: chosen.price, at: Date.now(), outcome }
    write({ order })
    /* a changed query string forces the full reload a real Stripe round trip
       is, so the page boots cold on the result route exactly as it would */
    const back = outcome === 'failed' ? '#checkout-failed' : '#checkout-success'
    return ok({
      order_no: order.order_no,
      checkout_url: `${location.pathname}?mock-checkout=${order.order_no}${back}`,
      transaction_id: 'txn-1',
      provider: 'stripe',
      amount: chosen.price,
      currency: 'USD',
      expires_at: iso(30 * 60e3),
    })
  }
  if (p === '/subscriptions/cancel') {
    write({ auto_renew: false })
    return ok(null)
  }
  if (p === '/subscriptions/reactivate') {
    write({ auto_renew: true })
    return ok(null)
  }
  if (p === '/cancel-reasons') {
    return ok(['tooExpensive', 'notUsingEnough', 'technicalIssues', 'foundAlternative', 'other'].map((k, i) => ({
      id: `cr-${i}`, reason_key: `subscription.cancelReasons.${k}`, reason: '', sort_order: i,
    })))
  }
  if (p === '/transactions') return ok(transactions(s))
  if (/^\/transactions\/[^/]+\/invoice$/.test(p)) {
    return ok({ invoice_no: 'INV-0001', invoice_url: 'about:blank', generated_at: iso() })
  }
  if (p === '/me/devices' && method === 'GET') {
    const removed = s.removedDevices ?? []
    const devices = [
      { id: 'dev-1', model: 'iPhone 15', platform: 'ios', os_version: '18.1', app_version: '2.4.0', last_active_at: iso(-2 * 3600e3), is_current: false },
      { id: 'dev-2', model: 'MacBook Air', platform: 'macos', os_version: '15.1', app_version: '2.4.0', last_active_at: iso(-DAY), is_current: false },
    ].filter((d) => !removed.includes(d.id))
    return ok({ max_devices: subscription(s).max_devices, used: devices.length, devices })
  }
  if (p.startsWith('/me/devices/') && method === 'DELETE') {
    write({ removedDevices: [...(s.removedDevices ?? []), p.split('/').pop()] })
    return ok(null)
  }
  if (p === '/me/settings') {
    const notifications = method === 'PUT' ? { ...(s.notifications ?? {}), ...body.notifications } : s.notifications ?? {}
    if (method === 'PUT') write({ notifications })
    return ok({
      kill_switch: true, auto_connect: false, split_tunneling_enabled: false, preferred_protocol_code: null,
      notifications, updated_at: iso(),
    })
  }
  if (p === '/notifications') {
    return ok([{ id: 'n-1', type: 'system', title: 'Welcome to RusVPN', body: 'Your account is ready.', is_read: false, sent_at: iso(-DAY) }])
  }

  return fail(404, 'UNKNOWN', `Mock has no route for ${method} ${p}`)
}

/** Stands in for fetch: same `{ response, body }` pair client.js expects. */
export async function mockSend(path, { method = 'GET', body } = {}) {
  await new Promise((r) => setTimeout(r, LATENCY_MS))
  const { status, body: payload } = route(method, path, body)
  return { response: { ok: status < 400, status }, body: payload }
}
