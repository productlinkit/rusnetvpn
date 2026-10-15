/* ==========================================================================
   LABELS

   Plan names, plan features and cancel reasons arrive as translation keys —
   `plans.items.year.title`, `plans.features.unlimitedData`,
   `subscription.cancelReasons.tooExpensive`. The catalogue for those lives in
   the client, by design (BRD §13: a new language needs no API change).

   This page carries the keys it can actually receive, plus a fallback that
   turns an unknown key into readable English from its own last segment. The
   fallback is not decoration: the backend's plan seed and the mobile app's
   catalogue already disagree about which of these keys exist, so a key nobody
   has translated is the normal case, not the exception. Better "Unlimited
   data" derived from `unlimitedData` than the raw key on screen.
   ========================================================================== */

const KNOWN = {
  // plan periods, keyed by group_code rather than by name_key: the code is
  // data, and it is what the pricing section upstairs already switches on
  'plans.items.free.title': 'Free',
  'plans.items.week.title': '1 Week',
  'plans.items.month.title': '1 Month',
  'plans.items.quarter.title': '3 Months',
  'plans.items.half.title': '6 Months',
  'plans.items.year.title': '1 Year',

  'plans.features.freeServers': '5 server locations',
  'plans.features.allServers': 'All 700+ servers, 90+ countries',
  'plans.features.standardSpeed': 'Standard speed',
  'plans.features.maxSpeed': 'Full speed, never throttled',
  'plans.features.oneDevice': '1 device',
  'plans.features.fiveDevices': '5 devices at once',
  'plans.features.dataCap': '1 GB per day',
  'plans.features.unlimitedData': 'Unlimited bandwidth',
  'plans.features.allProtocols': 'Every VPN protocol',
  'plans.features.splitTunneling': 'VPN split tunnel',
  'plans.features.noAds': 'No ads',

  'subscription.cancelReasons.tooExpensive': 'Too expensive',
  'subscription.cancelReasons.notUsingEnough': 'Not using it enough',
  'subscription.cancelReasons.technicalIssues': 'Technical issues',
  'subscription.cancelReasons.foundAlternative': 'Found a better alternative',
  'subscription.cancelReasons.other': 'Other reason',
}

/** `plans.features.unlimitedData` -> "Unlimited data". */
function humanize(key) {
  const leaf = key.split('.').pop() ?? key
  const words = leaf.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function label(key) {
  if (!key) return ''
  return KNOWN[key] ?? humanize(key)
}

/**
 * The text to show for something the server sends as a key *and* as rendered
 * copy — plan names, plan features, cancel reasons.
 *
 * The server's rendering wins. It knows the request's language, and its
 * catalogue is the one the CMS and the mobile app already agree on; the table
 * above is English-only and was missing entries outright (the `unlimited` plan
 * had none, so the account page printed the word "Name" at anyone who had it).
 *
 * The table stays as the fallback, for a key the backend has no translation
 * for yet — the same reason the fallback exists at all.
 */
export function textOf(rendered, key) {
  return rendered || label(key)
}

/* ---------- plain formatting ---------- */

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** "6 Aug 2027", or a dash when the server sent null. */
export function date(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : DATE.format(d)
}

/**
 * Money is a decimal string on the wire and stays one here. Only the symbol and
 * the grouping are added — parsing "47.99" to a float to print it back is how
 * it becomes 47.989999999999995.
 *
 * How a currency is written comes from the server's catalogue (GET /locales):
 * the symbol, which side of the number it sits on, and how many decimals to
 * show. Rupiah is Rp 149.000 and a ruble is 899 ₽, and neither is derivable
 * from the amount alone.
 *
 * FALLBACK is what to use before the catalogue has arrived, or if it never
 * does. It is deliberately small: the server's list is authoritative, and a
 * full second copy here would drift the moment a currency is added in the CMS.
 */
const FALLBACK = {
  USD: { symbol: '$', decimals: 2, symbol_first: true },
  EUR: { symbol: '€', decimals: 2, symbol_first: true },
  RUB: { symbol: '₽', decimals: 2, symbol_first: false },
  IDR: { symbol: 'Rp', decimals: 0, symbol_first: true },
}

let catalogue = {}

/** Called once the catalogue is fetched. See state/session.jsx. */
export function setCurrencyCatalogue(currencies) {
  const next = {}
  for (const c of currencies ?? []) next[c.code] = c
  catalogue = next
}

/** Group the integer part and trim or pad the fraction to `decimals`. */
function render(amount, decimals) {
  const [wholeRaw, fracRaw = ''] = String(amount).split('.')
  const negative = wholeRaw.startsWith('-')
  const whole = (negative ? wholeRaw.slice(1) : wholeRaw).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = negative ? '-' : ''
  if (!decimals) return sign + whole
  return `${sign}${whole}.${fracRaw.padEnd(decimals, '0').slice(0, decimals)}`
}

/**
 * The pieces, for the pricing card — which styles the symbol and the digits
 * separately, so it cannot use a single formatted string.
 */
export function moneyParts(amount, currency = 'USD') {
  const spec = catalogue[currency] ?? FALLBACK[currency]
  if (!spec) return { symbol: currency, value: String(amount), symbolFirst: true }
  return {
    symbol: spec.symbol,
    value: render(amount, spec.decimals),
    symbolFirst: spec.symbol_first,
  }
}

export function money(amount, currency = 'USD') {
  const { symbol, value, symbolFirst } = moneyParts(amount, currency)
  return symbolFirst ? `${symbol}${value}` : `${value} ${symbol}`
}

/** The subscription status as the badge should read it. */
export const STATUS_TAG = {
  free: { text: 'Free plan', tone: 'warn' },
  active: { text: 'Active', tone: 'good' },
  past_due: { text: 'Payment due', tone: 'warn' },
  cancelled: { text: 'Cancels at period end', tone: 'warn' },
  expired: { text: 'Expired', tone: 'warn' },
}

/** Transaction status -> the pill on the invoice row. */
export const TXN_TAG = {
  paid: { text: 'Paid', tone: 'good' },
  pending: { text: 'Pending', tone: 'warn' },
  failed: { text: 'Failed', tone: 'warn' },
  refunded: { text: 'Refunded', tone: 'warn' },
}

/** Device platform -> the icon key the row renders. */
export const PLATFORM_ICON = {
  android: 'phone',
  ios: 'phone',
  macos: 'laptop',
  windows: 'desktop',
}
