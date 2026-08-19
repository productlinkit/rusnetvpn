import { useEffect, useRef, useState } from 'react'
import { Arrow, ChevronRight } from '../components/icons'
import { FAQ } from '../data/content'
import { REDUCED_MOTION } from '../hooks'

/* ==========================================================================
   FAQ — split master / detail

   One list, two readings of it. Above 880 the questions are a nav and the
   answer lives in the panel beside them; below that the panel is hidden and
   each question opens inline instead.
   ========================================================================== */

const pad = (n) => String(n).padStart(2, '0')

export default function Faq() {
  const [active, setActive] = useState(0)
  /* what the panel is currently showing — it trails `active` through the
     fade so the text never changes while it is still visible */
  const [shown, setShown] = useState(0)
  const [swap, setSwap] = useState(false)
  const items = useRef([])

  useEffect(() => {
    if (active === shown) return
    if (REDUCED_MOTION) {
      setShown(active)
      return
    }
    setSwap(true)
    const t = setTimeout(() => {
      setShown(active)
      setSwap(false)
    }, 200)
    return () => clearTimeout(t)
  }, [active, shown])

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + FAQ.length) % FAQ.length
    setActive(next)
    items.current[next]?.focus()
  }

  const q = FAQ[shown]

  return (
    <section className="sec wrap" id="faq" style={{ paddingTop: 0 }}>
      <div className="sec-head">
        <div className="col up">
          <span className="eyebrow is-neutral">FAQ</span>
          <h2>Questions we get a lot</h2>
        </div>
        <p className="aside up" style={{ '--d': '100ms' }}>
          Still stuck? Send a message to customer service on WhatsApp or Telegram and a person writes back.
        </p>
      </div>

      <div className="qsplit up" onKeyDown={onKeyDown}>
        <div className="qnav">
          {FAQ.map((item, i) => (
            <div className={`qrow${i === active ? ' is-on' : ''}`} key={item.q}>
              <button
                className="qitem"
                aria-expanded={i === active}
                ref={(el) => { items.current[i] = el }}
                onClick={() => setActive(i)}
              >
                <span className="qn mono">{pad(i + 1)}</span>
                <span className="qt">{item.q}</span>
                <span className="qc"><ChevronRight /></span>
              </button>
              <div className="qinline"><div><p>{item.a}</p></div></div>
            </div>
          ))}
        </div>

        <div className={`qpanel${swap ? ' swap' : ''}`}>
          <span className="ghost mono">{pad(shown + 1)}</span>
          <div className="qp-top">
            <span className="qp-count mono">{pad(shown + 1)} / {pad(FAQ.length)}</span>
            <span className="qp-cat">{q.cat}</span>
          </div>
          <div className="qp-body">
            <h3 className="qp-q">{q.q}</h3>
            <p className="qp-a">{q.a}</p>
          </div>
          <div className="qp-foot">
            <span className="hint">Didn&apos;t find it here?</span>
            <a href="#faq" className="link-u">
              Send a Message
              <Arrow style={{ width: 13, height: 13 }} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
