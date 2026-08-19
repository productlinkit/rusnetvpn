import { useState } from 'react'
import { Arrow, Plus } from '../components/icons'
import { RAIL } from '../data/content'
import { canHover, useMedia } from '../hooks'

/* ==========================================================================
   WHY — the expanding rail

   Click a card and it takes the room; its siblings shrink. On a pointer
   device hovering is enough. Below 900 the rail stacks and a second tap on
   the open card closes it again, because there is nowhere for it to go.
   ========================================================================== */

export default function Why() {
  const [open, setOpen] = useState(0)
  const stacked = useMedia('(max-width:900px)')

  const toggle = (i) => {
    if (stacked && i === open) {
      setOpen(-1)
      return
    }
    setOpen(i)
  }

  return (
    <section className="sec wrap" id="why">
      <div className="sec-head">
        <div className="col up">
          <span className="eyebrow">Benefits</span>
          <h2>Why Choose RusVPN?</h2>
        </div>
        <p className="aside up" style={{ '--d': '100ms' }}>
          A secure and independent VPN solution, fully controlled from Moscow. Owned and operated in-house,
          following strict Russian security standards.
        </p>
      </div>

      <div className={`rail up${open >= 0 ? ' has-open' : ''}`}>
        {RAIL.map((card, i) => (
          <button
            key={card.title}
            className={`rcard${i === open ? ' is-open' : ''}`}
            aria-expanded={i === open}
            onClick={() => toggle(i)}
            onMouseEnter={() => {
              if (!stacked && canHover()) setOpen(i)
            }}
          >
            <figure className="media">
              <img src={card.img} alt={card.alt} width="640" height="800" loading="lazy" decoding="async" />
            </figure>
            <span className="veil" />
            <span className="num mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="plus"><Plus /></span>
            <span className="vert"><span>{card.title}</span></span>
            <span className="full">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <span className="pill"><span>{card.pill}</span><Arrow /></span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
