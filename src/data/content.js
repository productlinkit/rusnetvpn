/* ==========================================================================
   CONTENT

   Repeated blocks the API does not provide — app tabs, pros and cons, region
   groups, payment methods, the glossary — live here as data. The components
   stay markup; the copy stays editable without reading a line of JSX.
   ========================================================================== */

/* ---------- apps: phone screenshots ---------- */
export const SHOT = {
  connected: '/images/shots/connected.jpg',
  tooltip: '/images/shots/tooltip.jpg',
  freehome: '/images/shots/freehome.jpg',
  servers: '/images/shots/servers.jpg',
  serversPrem: '/images/shots/serversPrem.jpg',
  freeServers: '/images/shots/freeServers.jpg',
  split: '/images/shots/split.jpg',
  settings: '/images/shots/settings.jpg',
  protocol: '/images/shots/protocol.jpg',
  notifs: '/images/shots/notifs.jpg',
  menuFree: '/images/shots/menuFree.jpg',
}

export const APP_TABS = [
  {
    label: 'No-Log VPN',
    m: 'connected', l: 'tooltip', r: 'freehome',
    copy: [
      'We are a no-log VPN meaning that we don’t store any of your traffic logs.',
      'RusVPN is committed to independent, no-log auditing — that audit is in progress.',
      'No third-party access to your VPN traffic. All data is securely managed from Moscow, free from Western interference.',
    ],
  },
  {
    label: 'Global Coverage',
    m: 'servers', l: 'serversPrem', r: 'freeServers',
    copy: [
      '700+ servers worldwide, spanning North America, South America, Europe, Asia, Africa, and Oceania.',
      'Automatic server switching prevents slowdowns for uninterrupted service.',
      'We have optimized streaming servers around the globe, allowing you to get the most from your existing streaming subscription.',
    ],
  },
  {
    label: 'VPN Split Tunnel',
    m: 'split', l: 'settings', r: 'protocol',
    copy: [
      'Select the apps for which you want to route through our secure VPN.',
      'Protect your privacy by ensuring your DNS isn’t being leaked to any entity.',
      'Experience advanced security, blazing-fast speed, and unrestricted access with our VPN.',
    ],
  },
  {
    label: 'VPN Protocols',
    m: 'settings', l: 'notifs', r: 'menuFree',
    copy: [
      'We offer the most advanced VPN protocols for the fastest and most secure connection.',
      'Advanced hardware ensures fast speeds and smooth streaming.',
      'Owned and operated in-house, following strict Russian security standards.',
    ],
  },
]

export const PROS_CONS = [
  {
    label: 'Download Apps',
    pro: ['Security & Safety', 'Automatic Updates', 'Official & Verified', 'Easier Management', 'Better Compatibility'],
    con: ['Regional Restrictions', 'Delayed Updates', 'Limited Apps', 'Forced Updates/Removals'],
  },
  {
    label: 'Download APK',
    pro: ['Access to Restricted Apps', 'Early Updates', 'Modified Apps', 'No Google Dependency'],
    con: ['Security Risks', 'Manual Updates', 'Compatibility Issues', 'No Official Support'],
  },
  {
    label: 'Download for Windows',
    pro: ['Best performance on desktop', 'Supports all app features', 'Stable for long sessions', 'Easy installation and setup'],
    con: ['Only for Windows devices', 'Needs manual update for new installer versions'],
  },
  {
    label: 'Download for Mac',
    pro: ['Native macOS experience', 'Best performance on Apple Silicon', 'Easy drag-and-drop installation'],
    con: ['Only for Mac devices'],
  },
]

/* ---------- servers: the six region rows ----------
   GET /servers/locations is per country — the list the app's server picker
   shows. The section reads it a level up, as continents, because six rows is
   a coverage claim you can take in at a glance and ninety is a phone book.

   The API carries no continent, so the grouping is here: ISO 3166 alpha-2
   codes per region (the Middle East and the Caucasus count as Asia, which is
   where a buyer looks for them). Every count on the row is still summed from
   the response; this table only says which row a country belongs on. A
   country missing from it is not dropped — it lands on a trailing "Other
   locations" row, so a new location the CMS adds next week is counted rather
   than silently lost. Oceania has no photo yet, so it gets no hover preview. */
export const REGIONS = [
  {
    key: 'europe', name: 'Europe', photo: '/images/region-europe.jpg',
    codes: 'ad al at ba be bg by ch cy cz de dk ee es fi fo fr gb gg gi gr hr hu ie im is it je li lt lu lv mc md me mk mt nl no pl pt ro rs ru se si sk sm ua va xk',
  },
  {
    key: 'namerica', name: 'North America', photo: '/images/region-namerica.jpg',
    codes: 'ag ai aw bb bm bs bz ca cr cu cw dm do gd gl gt hn ht jm kn ky lc mq mx ni pa pr sv tc tt us vc vg vi',
  },
  {
    key: 'asia', name: 'Asia', photo: '/images/region-apac.jpg',
    codes: 'ae af am az bd bh bn bt cn ge hk id il in iq ir jo jp kg kh kr kw kz la lb lk mm mn mo mv my np om ph pk ps qa sa sg sy th tj tl tm tr tw uz vn ye',
  },
  {
    key: 'samerica', name: 'South America', photo: '/images/region-latam.jpg',
    codes: 'ar bo br cl co ec fk gf gy pe py sr uy ve',
  },
  {
    key: 'africa', name: 'Africa', photo: '/images/region-mea.jpg',
    codes: 'ao bf bi bj bw cd cf cg ci cm cv dj dz eg er et ga gh gm gn gq gw ke km lr ls ly ma mg ml mr mu mw mz na ne ng re rw sc sd sl sn so ss st sz td tg tn tz ug za zm zw',
  },
  {
    key: 'oceania', name: 'Oceania', photo: null,
    codes: 'as au ck fj fm gu ki mh mp nc nr nu nz pf pg pw sb to tv vu wf ws',
  },
]

/* ---------- pricing: payment marks ----------
   The four methods the site actually takes, the same four the checkout and
   the FAQ name. `aria` is the accessible name of the mark itself; the visible
   label beside it stays the short form people scan for. */
export const PAY_METHODS = [
  { key: 'card', label: 'Visa / Mastercard', aria: 'Visa and Mastercard' },
  { key: 'paypal', label: 'PayPal', aria: 'PayPal' },
  { key: 'apple', label: 'Apple Pay', aria: 'Apple Pay' },
  { key: 'google', label: 'Google Pay', aria: 'Google Pay' },
]

/* ---------- pricing: the glossary behind the "?" chips ----------
   A plan's feature lines come from GET /plans as keys; the explanation of a
   term is not something the API carries, so it lives here, keyed by the same
   feature key. A feature with an entry gets a "?" beside it, one without reads
   as plain text — so the backend adding a feature never breaks the card, it
   just arrives without a tooltip until someone writes one.

   `renew` is the billing term in the fine print rather than a feature line. */
export const GLOSSARY = {
  'plans.features.noLogs': {
    lead: 'No record is kept of what you do.',
    body: 'No connection times, no traffic, no DNS queries. Servers run from RAM, so a machine that powers down keeps nothing.',
  },
  'plans.features.dnsLeakProtection': {
    lead: 'Stops your browsing escaping the tunnel.',
    body: 'Without it the name lookups your device makes can still travel to your provider, which reveals every site you visit even while the VPN is on.',
  },
  'plans.features.splitTunneling': {
    lead: 'Choose what goes through the VPN.',
    body: 'Route your browser through RusVPN while your banking app or local printer keeps using the normal connection.',
  },
  'plans.features.dynamicSwitching': {
    lead: 'Moves you off a busy machine automatically.',
    body: 'If the server you are on gets crowded, the app hands you to a healthier one in the same country without dropping the session.',
  },
  renew: {
    lead: 'Your plan continues at the same price until you stop it.',
    body: 'We charge the card on file on the renewal date. Turning it off keeps your access to the end of the period you already paid for — it is not a cancellation of the current term.',
  },
}

/* ---------- nav ---------- */
export const NAV_LINKS = [
  { href: '#why', label: 'Benefits' },
  { href: '#tech', label: 'Features' },
  { href: '#servers', label: 'Global Coverage' },
  { href: '#apps', label: 'Download App' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export const RENEW_ON = '6 Aug 2027'
export const AUTO_ON_NOTE = `On. We will charge $47.99 on ${RENEW_ON} and your access carries on without a gap.`
export const AUTO_OFF_NOTE = `Off. Premium runs out on ${RENEW_ON} and the account drops to the free tier.`
