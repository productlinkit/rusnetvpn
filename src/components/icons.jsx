/* ==========================================================================
   ICONS

   Every inline SVG the page uses, in one place. They are plain components
   rather than a sprite because most of them appear once or twice and carry
   their own stroke settings; the three that repeat everywhere — Arrow, Check
   and Plus — are the reason this file exists at all.
   ========================================================================== */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/* the diagonal arrow inside every round button badge */
export const Arrow = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="1.9" {...p}><path d="M4 12L12 4M6 4h6v6" /></svg>
)

/* the tick used by feature lists, pros, and the "done" screens */
export const Check = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="2.2" {...p}><path d="M3 8.5l3.2 3.2L13 5" /></svg>
)

/* a slightly different tick — the one the language menu ships with */
export const Tick = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="2.2" {...p}><path d="M3 8.5l3.5 3.5L13 5" /></svg>
)

export const Plus = (p) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}><path d="M8 3v10M3 8h10" /></svg>
)

export const Chevron = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="1.9" {...p}><path d="M4 6l4 4 4-4" /></svg>
)

export const ChevronRight = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="2" {...p}><path d="M4 8h8M8.5 4.5L12 8l-3.5 3.5" /></svg>
)

export const Back = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="1.9" {...p}><path d="M12 8H4M7.5 4.5L4 8l3.5 3.5" /></svg>
)

export const Globe = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
  </svg>
)

export const Shield = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}>
    <path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6l7-3z" />
  </svg>
)

export const Bolt = (p) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2" {...p}><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" /></svg>
)

/* the "no photo yet" frame — a picture glyph over a hatched plate */
export const PhotoGlyph = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M4 17l4.5-4.5 3.5 3.5 3-2.5L20 18" />
  </svg>
)

/* the mark on the form-level error strip */
export const Warn = (p) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="1.9" {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2h.01" />
  </svg>
)

export const Download = (p) => (
  <svg viewBox="0 0 16 16" {...stroke} strokeWidth="1.9" {...p}><path d="M8 2v8M5 7.5L8 10.5l3-3M3 13.5h10" /></svg>
)

export const Eye = (p) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="1.8" {...p}>
    <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
)

export const Google = (p) => (
  <svg viewBox="0 0 48 48" {...p}>
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
)

export const Chat = (p) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth="1.9" {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.2A8 8 0 1 1 21 12z" /></svg>
)

/* ---------- bento tile icons, keyed by TILES[].icon ---------- */
const tileStroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const TILE_ICONS = {
  shieldCheck: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6l7-3z" /><path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  ),
  split: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M4 7h5l3 5 3-5h5M4 17h5l3-5" /><path d="M17 4l3 3-3 3M17 14l3 3-3 3" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M12 4v7" /><path d="M7.5 6.5a7 7 0 1 0 9 0" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" {...tileStroke}><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" /></svg>
  ),
  racks: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  ),
  shieldPlus: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6l7-3z" /><path d="M9 12h6M12 9v6" />
    </svg>
  ),
  boltLines: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" /><path d="M20 6.5h-3M20 17.5h-4" />
    </svg>
  ),
  stack: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M4 8a8 4 0 1 0 16 0A8 4 0 1 0 4 8" /><path d="M4 8v8c0 2.2 3.6 4 8 4s8-1.8 8-4V8" /><path d="M4 12c0 2.2 3.6 4 8 4s8-1.8 8-4" />
    </svg>
  ),
}

/* ---------- account rail + row icons ---------- */
export const AC_ICONS = {
  overview: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" />
    </svg>
  ),
  subscription: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M12 3l7 3v5.5c0 4.3-3 8-7 9.5-4-1.5-7-5.2-7-9.5V6l7-3z" /><path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  ),
  billing: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18" /></svg>
  ),
  devices: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <rect x="2" y="4" width="14" height="10" rx="2" /><rect x="17" y="9" width="5" height="11" rx="1.6" /><path d="M6 18h6" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5z" /><path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </svg>
  ),
  support: (
    <svg viewBox="0 0 24 24" {...tileStroke}>
      <circle cx="12" cy="12" r="9" /><path d="M9.4 9.4a2.7 2.7 0 1 1 3.4 3.4c-.6.3-.8.8-.8 1.4" /><path d="M12 17.2h.01" />
    </svg>
  ),
  connect: (
    <svg viewBox="0 0 24 24" {...tileStroke}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  twoDevices: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="2" y="4" width="14" height="10" rx="2" /><rect x="17" y="9" width="5" height="11" rx="1.6" /></svg>
  ),
  desktop: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18.5h2" /></svg>
  ),
  laptop: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" /></svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" {...tileStroke}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
  ),
  bubble: (
    <svg viewBox="0 0 24 24" {...tileStroke}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5z" /></svg>
  ),
}

/* ---------- social ---------- */
export const Facebook = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.7v8h3.5z" /></svg>
)

export const Instagram = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.7" />
    <circle cx="16.9" cy="7.1" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const Telegram = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M21 4.5 2.9 11.4c-1 .4-1 1.7.1 2l4.6 1.4 1.7 5.2c.2.7 1.1.9 1.6.3l2.4-2.6 4.6 3.4c.7.5 1.6.1 1.8-.7L22.3 5.6c.2-.9-.5-1.5-1.3-1.1zM8.6 14.2l9.1-5.6-7.4 6.8-.3 3.2-1.4-4.4z" />
  </svg>
)

export const WhatsApp = (p) => (
  <svg viewBox="0 0 24 24" fill="#25D366" {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.5 14c-.3.8-1.5 1.4-2.1 1.5-.6.1-1.3.1-2.1-.1-.5-.2-1.1-.4-1.9-.7-3.3-1.4-5.4-4.7-5.6-4.9-.2-.2-1.4-1.8-1.4-3.5s.9-2.5 1.2-2.8c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l1 2.4c.1.2.1.4 0 .6l-.4.6-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.2.4-.2.6-.1l2.2 1.1c.3.1.5.2.6.4.1.1.1.6-.2 1.4z" />
  </svg>
)
