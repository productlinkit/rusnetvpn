/* ==========================================================================
   STORE BADGES

   The official store lockup: black plate, hairline outline, brand logo beside
   two lines of type — small caption sitting over the store name. Black on the
   near-black panel would vanish, so the outline is what draws the shape.

   A grid, not a wrapping flex row: six badges of six different widths read as
   six loose links, one shared box reads as one set.
   ========================================================================== */

const AppleGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 2.9-.7s1.7.7 2.9.7 2-1.1 2.7-2.1c.9-1.2 1.2-2.4 1.2-2.4s-2.3-.9-2.3-3.5zM14.2 5.9c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3z" />
  </svg>
)

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.05" strokeLinejoin="round">
    <path fill="#4285F4" stroke="#4285F4" d="M3.6 2.6 12.6 12 3.6 21.4Z" />
    <path fill="#34A853" stroke="#34A853" d="M3.6 2.6 15.6 9.08 12.6 12Z" />
    <path fill="#FBBC04" stroke="#FBBC04" d="M15.6 9.08 21 12 15.6 14.92 12.6 12Z" />
    <path fill="#EA4335" stroke="#EA4335" d="M3.6 21.4 15.6 14.92 12.6 12Z" />
  </svg>
)

const XiaomiGlyph = () => (
  <svg viewBox="0 0 24 24">
    <defs>
      <linearGradient id="xg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2BA8FF" />
        <stop offset=".55" stopColor="#8B5CF6" />
        <stop offset="1" stopColor="#FF4D9D" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5.6" fill="url(#xg)" />
    <path fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 6.8v6.6m0 0 3-3m-3 3-3-3M7.7 16.9h8.6" />
  </svg>
)

const ApkGlyph = () => (
  <svg viewBox="0 0 24 24">
    <path fill="none" stroke="#3DDC84" strokeWidth="1.1" strokeLinecap="round" d="M8.4 5.5 7 3.3M15.6 5.5 17 3.3" />
    <path fill="#3DDC84" d="M5.6 10.5a6.4 6.4 0 0 1 12.8 0z" />
    <circle cx="9.5" cy="8.1" r=".9" fill="#000" />
    <circle cx="14.5" cy="8.1" r=".9" fill="#000" />
    <rect x="5.6" y="11.5" width="12.8" height="7.3" rx="1.3" fill="#3DDC84" />
    <rect x="2.1" y="11.5" width="2.5" height="6" rx="1.25" fill="#3DDC84" />
    <rect x="19.4" y="11.5" width="2.5" height="6" rx="1.25" fill="#3DDC84" />
    <rect x="8" y="18.6" width="2.5" height="3.5" rx="1.25" fill="#3DDC84" />
    <rect x="13.5" y="18.6" width="2.5" height="3.5" rx="1.25" fill="#3DDC84" />
  </svg>
)

const WindowsGlyph = () => (
  <svg viewBox="0 0 24 24">
    <rect x="2.4" y="2.4" width="9" height="9" fill="#F25022" />
    <rect x="12.6" y="2.4" width="9" height="9" fill="#7FBA00" />
    <rect x="2.4" y="12.6" width="9" height="9" fill="#00A4EF" />
    <rect x="12.6" y="12.6" width="9" height="9" fill="#FFB900" />
  </svg>
)

const STORES = [
  { glyph: <AppleGlyph />, caption: 'Download on the', name: 'App Store' },
  { glyph: <PlayGlyph />, caption: 'GET IT ON', name: 'Google Play' },
  { glyph: <XiaomiGlyph />, caption: 'GET IT ON', name: 'Xiaomi Apps' },
  { glyph: <ApkGlyph />, caption: 'Direct download', name: 'APK File' },
  { glyph: <WindowsGlyph />, caption: 'Download for', name: 'Windows' },
  { glyph: <AppleGlyph />, caption: 'Download app for', name: 'macOS' },
]

export default function StoreBadges() {
  return (
    <div className="stores">
      {STORES.map((s) => (
        <a href="#apps" className="store" key={s.name}>
          {s.glyph}
          <i><span>{s.caption}</span><b>{s.name}</b></i>
        </a>
      ))}
    </div>
  )
}
