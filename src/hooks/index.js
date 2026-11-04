import { useCallback, useEffect, useRef, useState } from 'react'
import { cssBezier, reducedMotion } from '../shared/a11y'
import { getLocations } from '../features/servers/api'

/* ==========================================================================
   HOOKS

   The page's motion lives here. Everything that touches scroll, pointer move
   or animation frames is written the same way: read in the event, write in a
   frame, and never both in the same tick.
   ========================================================================== */

export const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover:hover) and (pointer:fine)').matches

/* ---------- reveal on scroll ----------
   One observer for the whole page rather than one per component.

   Looking for `.up` once at mount is not enough: the server rows and the
   pricing card only render after their API call answers, so they arrived
   after the scan, were never observed, and sat at opacity 0 for good — a
   section with a heading and nothing under it. A mutation observer hands
   every `.up` that turns up later to the same intersection observer. */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('in')
          io.unobserve(e.target)
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 },
    )
    const watch = (root) => {
      if (root.nodeType !== 1) return
      if (root.matches('.up:not(.in)')) io.observe(root)
      root.querySelectorAll('.up:not(.in)').forEach((el) => io.observe(el))
    }
    watch(document.body)
    const mo = new MutationObserver((records) => {
      records.forEach((r) => r.addedNodes.forEach(watch))
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [])
}

/* ---------- count up ----------
   Counts to `end` once the number scrolls into view, then never again.

   The curve is --ease-enter, read off the stylesheet and sampled, so a number
   finding its value and a panel arriving on screen are the same gesture — change
   the token and both move. Duration follows how far the number has to travel:
   on a flat 1400ms the 6 for continents spent as long crossing six integers as
   700 spent crossing seven hundred, so the small tile visibly stepped while the
   large one blurred. `order` staggers a group 90ms apart, because four numbers
   landing on one frame read as one element repainting, not four facts.

   `end` may arrive late — the server and country totals wait on the API — so
   nothing is observed until it is a real number, and the tile shows 0 until
   then, exactly as the static page did before its script ran.

   The final value is asserted by a timer, not left to the frame loop. rAF stops
   in a backgrounded tab and was caught stalling outright on the static page,
   leaving 429 under a heading that claims 700. The timer is the contract; the
   animation is only how it looks on the way. */
const COUNT_LEAD = 90
let easeEnter = null
export function useCountUp(end, { decimals = 0, order = 0 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !Number.isFinite(end)) return
    if (reducedMotion()) {
      el.textContent = end.toFixed(decimals)
      return
    }
    easeEnter ??= cssBezier('--ease-enter', [0.21, 0.78, 0.26, 1])
    const dur = 700 + 260 * String(Math.abs(Math.round(end))).length
    const lead = COUNT_LEAD * order
    let raf = 0
    let timer = 0
    let landed = false
    const land = () => {
      if (landed) return
      landed = true
      cancelAnimationFrame(raf)
      el.textContent = end.toFixed(decimals)
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.unobserve(el)
        let t0 = null
        const step = (t) => {
          if (landed) return
          if (t0 === null) t0 = t
          const p = (t - t0 - lead) / dur
          if (p < 0) {
            raf = requestAnimationFrame(step) /* still in the stagger */
            return
          }
          if (p >= 1) {
            land()
            return
          }
          el.textContent = (end * easeEnter(p)).toFixed(decimals)
          raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
        timer = setTimeout(land, lead + dur + 120)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [end, decimals, order])
  return ref
}

/* ---------- FACTS — one source for every number the page claims ----------
   The static page typed "700+ servers / 90+ countries" by hand in nine places
   while the counters were seeded separately; on a product sold on trust, two
   numbers that disagree read as carelessness at best. There the region table
   was the source. Here the fleet itself is: GET /servers/locations, the same
   list the coverage section and the app's server picker render, summed once.

   One request per page load, shared by every caller — the hero, the rail and
   the bento all ask, and none of them should cost a round trip of its own.

   Continents are the one count the API does not carry (a location has a
   country, not a continent), so they come from the same list the marquee and
   the Global Coverage tile print. */
export const CONTINENTS = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania']
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

let factsPromise = null
const loadFacts = () =>
  (factsPromise ??= getLocations()
    .then((rows) => ({
      servers: rows.reduce((n, r) => n + r.server_count, 0),
      countries: new Set(rows.map((r) => r.country_code)).size,
    }))
    .catch((error) => {
      /* forget the failure, so the next mount gets to try again */
      factsPromise = null
      throw error
    }))

export function useFacts() {
  const [counts, setCounts] = useState(null)
  useEffect(() => {
    let alive = true
    loadFacts()
      .then((f) => alive && setCounts(f))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return {
    servers: counts?.servers,
    countries: counts?.countries,
    continents: CONTINENTS.length,
    continentsWord: NUMBER_WORDS[CONTINENTS.length] ?? String(CONTINENTS.length),
  }
}

/* ---------- retire the placeholder once the real photo decodes ----------
   A .media frame paints a labelled "no photo yet" plate under its <img>. Once
   the image has real pixels the plate is hidden outright (.media.has-img), so
   a transparent PNG or a slow decode never shows the label through it. Load
   does not bubble, so this listens in the capture phase — one listener covers
   every image, including the ones that render after an API call answers. */
export function usePlaceholderRetire() {
  useEffect(() => {
    const settle = (img) => {
      if (img.naturalWidth > 0) img.closest('.media')?.classList.add('has-img')
    }
    document.querySelectorAll('.media img').forEach((img) => img.complete && settle(img))
    const onLoad = (e) => {
      if (e.target instanceof HTMLImageElement) settle(e.target)
    }
    document.addEventListener('load', onLoad, true)
    return () => document.removeEventListener('load', onLoad, true)
  }, [])
}

/* ---------- header state + reading progress ----------
   Scroll fires far more often than the screen refreshes. Both writes are
   batched into one frame so a fast flick cannot queue up a hundred layouts. */
export function useScrollProgress() {
  const barRef = useRef(null)
  const [small, setSmall] = useState(false)
  useEffect(() => {
    let ticking = false
    const paint = () => {
      ticking = false
      const y = window.scrollY || 0
      setSmall(y > 24)
      const h = document.body.scrollHeight - window.innerHeight
      if (barRef.current) barRef.current.style.width = (h > 0 ? (y / h) * 100 : 0) + '%'
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(paint)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    paint()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return { barRef, small }
}

/* ---------- outside click / Escape ----------
   Used by the language menu, the account dropdown, the bento and the chat
   button. It listens on the document rather than relying on stopPropagation,
   because React's synthetic events are delivered at the root and a stopped
   synthetic event still reaches document listeners. */
export function useDismiss(open, close, ref) {
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref?.current?.contains(e.target)) return
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, ref])
}

/* ---------- a body class, driven by state ----------
   The stylesheet keys the mobile sheet and the signed-in nav off classes on
   <body>, so those classes stay the source of truth and React just mirrors
   its state onto them. */
export function useBodyClass(name, on) {
  useEffect(() => {
    document.body.classList.toggle(name, !!on)
    return () => document.body.classList.remove(name)
  }, [name, on])
}

/* ---------- scroll lock ----------
   Several overlays can want the page frozen at once (the sheet is still open
   behind the auth page). Counting them means the last one to close is the one
   that gives scrolling back. */
let locks = 0
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return
    locks += 1
    document.body.style.overflow = 'hidden'
    return () => {
      locks -= 1
      if (locks <= 0) {
        locks = 0
        document.body.style.overflow = ''
      }
    }
  }, [locked])
}

/* ---------- magnetic buttons ----------
   The pointer pulls the button a few pixels towards it. Writing the transform
   straight from the mousemove handler means a transform per event; this keeps
   the latest position and writes it once per frame instead. */
export function useMagnetic(enabled = true) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled || reducedMotion() || !canHover()) return
    let raf = 0
    let x = 0
    let y = 0
    const paint = () => {
      raf = 0
      el.style.transform = `translate(${x}px,${y}px)`
    }
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      x = (e.clientX - r.left - r.width / 2) * 0.12
      y = (e.clientY - r.top - r.height / 2) * 0.22
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      el.style.transform = ''
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [enabled])
  return ref
}

/* ---------- viewport width predicate ----------
   Reads a media query and re-reads it when it flips. Used where the layout
   changes behaviour, not just looks: the rail collapses below 900, and the
   account dropdown becomes a direct link below 1180. */
export function useMedia(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

/* ---------- smooth scroll to a hash target ---------- */
export function useScrollToHash() {
  return useCallback((href) => {
    if (!href || href.charAt(0) !== '#') return
    const behavior = reducedMotion() ? 'auto' : 'smooth'
    if (href === '#top') {
      window.scrollTo({ top: 0, behavior })
      return
    }
    document.querySelector(href)?.scrollIntoView({ behavior, block: 'start' })
  }, [])
}

/* ---------- warm the phone screenshots ----------
   Four tabs, twelve photos. Fetching them while the browser is idle means a
   tab switch swaps an image that is already decoded rather than starting a
   request and showing an empty frame for a beat. */
export function usePrefetch(urls) {
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => {
      urls.forEach((src) => {
        const img = new Image()
        img.decoding = 'async'
        img.src = src
      })
    })
    return () => cancel(id)
    // urls is a module constant; re-running on identity change would refetch
    // the same twelve files for nothing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
