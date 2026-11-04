import { useState } from 'react'
import { Arrow, Plus } from '../components/icons'
import { canHover, useFacts, useMedia } from '../hooks'

/* ==========================================================================
   WHY — the expanding rail

   Click a card and it takes the room; its siblings shrink. On a pointer
   device hovering is enough. Below 900 the rail stacks and a second tap on
   the open card closes it again, because there is nowhere for it to go.

   The copy lives here rather than in data/content.js because two of the
   cards state the fleet's size, and those numbers come from the API (see
   useFacts) — a constant could only ever repeat a number typed by hand.

   "Strict No-Logs Policy" says the audit is in progress, because it is. It
   used to read "independently audited", as settled fact, in five places on
   the page and was true in none of them.
   ========================================================================== */

const n = (v) => v ?? '…'

const cards = (f) => [
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
    body: 'RusVPN is committed to independent, no-log auditing — that audit is in progress. We don’t store your browsing activity, traffic logs, DNS queries, or connection history tied to your account.',
    pill: 'Audit in progress',
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
    title: 'Access Your Favorite Content',
    body: `With ${n(f.servers)}+ servers in ${n(f.countries)}+ countries, you can easily access all of your favorite content – shows, music, apps, and more – regardless of where you live.`,
    pill: `${n(f.countries)}+ countries`,
  },
]

export default function Why() {
  const [open, setOpen] = useState(0)
  const stacked = useMedia('(max-width:900px)')
  const facts = useFacts()

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

      <div className={`rail up${open >= 0 ? ' has-open' : ''}`} id="rail">
        {cards(facts).map((card, i) => (
          <button
            key={card.title}
            className={`rcard${i === open ? ' is-open' : ''}`}
            data-i={i}
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
