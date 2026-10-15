/* ==========================================================================
   CONTENT

   Every repeated block on the page — rail cards, feature tiles, region rows,
   app tabs, plans, questions — lives here as data. The components below stay
   markup; the copy stays editable without reading a single line of JSX.
   ========================================================================== */

/* ---------- why: the expanding rail ---------- */
export const RAIL = [
  {
    img: '/images/tier-guest.jpg',
    alt: 'RusVPN app connected to an optimized streaming server',
    title: 'Best Streaming Experience',
    body: 'We have optimized streaming servers around the globe, allowing you to get the most from your existing streaming subscription.',
    pill: 'Optimized streaming servers',
  },
  {
    img: '/images/tier-free.jpg',
    alt: 'RusVPN app screen showing the no-logs policy',
    title: 'Strict No-Logs Policy',
    body: 'RusVPN is one of the first independently audited no-log VPN providers in the industry. We do no data collection, no logging of activity, and no sharing or selling any of your data ever.',
    pill: 'Independently audited',
  },
  {
    img: '/images/tier-paid.jpg',
    alt: 'RusVPN server list, run on locally owned servers',
    title: '100% Independent Local Provider Server',
    body: 'RusVPN is run and owned by local people that care about internet privacy and security in Russia. No shadowy megacorporation abroad involvement.',
    pill: 'Owned and operated in-house',
  },
  {
    img: '/images/tier-trial.jpg',
    alt: 'RusVPN app browsing content without restrictions',
    title: 'Zero Restrictions, Unlimited Content',
    body: 'With thousands of servers in 90+ countries, you can easily access all of your favorite content – shows, music, apps, and more – regardless of where you live.',
    pill: '90+ countries',
  },
]

/* ---------- tech: the bento grid ----------
   `viz` draws the bar chart, `geo` the continent strip. A tile has at most
   one of them; most have neither. */
export const TILES = [
  {
    wide: true,
    icon: 'shieldCheck',
    title: 'DNS Leak Protection',
    body: 'Protect your privacy by ensuring your DNS isn’t being leaked to any entity.',
    more: 'Experience advanced security, blazing-fast speed, and unrestricted access with our VPN.',
    viz: [34, 58, 41, 76, 52, 88, 63, 96, 71, 45, 82, 56],
  },
  {
    icon: 'split',
    title: 'VPN Split Tunnel',
    body: 'Select the apps for which you want to route through our secure VPN.',
    more: 'With thousands of servers in 90+ countries, you can easily access all of your favorite content – shows, music, apps, and more – regardless of where you live.',
  },
  {
    icon: 'power',
    title: 'No-Log VPN',
    body: 'We are a no-log VPN meaning that we don’t store any of your traffic logs.',
    more: 'RusVPN is one of the first independently audited no-log VPN providers in the industry. We do no data collection, no logging of activity, and no sharing or selling any of your data ever.',
  },
  {
    icon: 'bolt',
    title: 'VPN Protocols',
    body: 'We offer the most advanced VPN protocols for the fastest and most secure connection.',
    more: 'RusVPN is the best guaranteed no-log VPN built from ground up locally in Russia.',
  },
  {
    icon: 'racks',
    title: 'Russian Reliability',
    body: 'Owned and operated in-house, following strict Russian security standards.',
    more: 'RusVPN is run and owned by local people that care about internet privacy and security in Russia. No shadowy megacorporation abroad involvement.',
  },
  {
    wide: true,
    icon: 'globe',
    title: 'Global Coverage',
    body: '700+ servers across 90+ countries on six continents, so there is always one close to you.',
    more: 'Pick a country and we place you on the healthiest machine inside it. Automatic switching keeps a busy node from ever becoming your problem.',
    geo: ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'],
  },
  {
    icon: 'shieldPlus',
    title: 'Unmatched Privacy',
    body: 'No third-party access. All data is securely managed from Moscow, free from Western interference.',
    more: 'Secure your online privacy with a VPN that respects your values and protects you from prying eyes as you browse.',
  },
  {
    icon: 'boltLines',
    title: 'Superior Performance',
    body: 'Advanced hardware ensures fast speeds and smooth streaming.',
    more: 'We have optimized streaming servers around the globe, allowing you to get the most from your existing streaming subscription.',
  },
  {
    wide: true,
    icon: 'stack',
    title: 'Dynamic Switching',
    body: 'Automatic server switching prevents slowdowns for uninterrupted service.',
    more: '700+ servers worldwide, spanning North America, South America, Europe, Asia, Africa, and Oceania.',
  },
]

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
      'RusVPN is one of the first independently audited no-log VPN providers in the industry.',
      'No third-party access. All data is securely managed from Moscow, free from Western interference.',
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
