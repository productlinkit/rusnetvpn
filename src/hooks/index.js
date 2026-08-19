import { useCallback, useEffect, useRef, useState } from 'react'

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
   One observer for the whole page rather than one per component. Elements
   are found after mount, which is exactly when React has put them in the
   document, so this behaves the same as the original inline script. */
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
    document.querySelectorAll('.up').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ---------- count up ----------
   Counts to `end` once the number scrolls into view, then never again. */
export function useCountUp(end, decimals = 0) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (REDUCED_MOTION) {
      el.textContent = end.toFixed(decimals)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        io.unobserve(el)
        let t0 = null
        const step = (t) => {
          if (!t0) t0 = t
          const p = Math.min((t - t0) / 1400, 1)
          el.textContent = (end * (1 - Math.pow(1 - p, 3))).toFixed(decimals)
          if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [end, decimals])
  return ref
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
    if (!el || !enabled || REDUCED_MOTION || !canHover()) return
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
    const behavior = REDUCED_MOTION ? 'auto' : 'smooth'
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
