import { useEffect, useRef, useState } from 'react'
import { Arrow, ChevronRight } from '../components/icons'
import { Loader } from '../components/account/parts'
import SearchField, { useDebounced } from '../components/SearchField'
import { StateCard } from '../components/States'
import { getFaqs } from '../features/content/api'
import { useResource } from '../features/account/useResource'
import { useSession } from '../state/session'
import { reducedMotion, say } from '../shared/a11y'

/* ==========================================================================
   FAQ — split master / detail, with a search

   One list, two readings of it. Above 880 the questions are a nav and the
   answer lives in the panel beside them; below that the panel is hidden and
   each question opens inline instead.

   The questions come from GET /content/faqs, which is what the CMS edits — so
   support can answer a recurring question by adding it here rather than by
   asking for a deploy. The server returns them already in the request's
   language, hence the refetch when the picker changes.

   A dozen answers is past the point where scanning a list works, so it gets a
   search. It runs over the question, the answer and the category, so
   "refund", "money back" and "Billing" all reach the same row. The result
   count is announced — a list that silently rearranges itself is invisible to
   anyone not watching it.
   ========================================================================== */

const pad = (n) => String(n).padStart(2, '0')

/* "Send a message" opens the chat launcher, as it does everywhere on the page.
   The launcher owns a delegated [data-fab-open] handler; this is the fallback
   for when it does not, run after the click has finished so the launcher's
   own outside-click dismissal cannot take it straight back down. */
function openChat(e) {
  e.preventDefault()
  setTimeout(() => {
    const fab = document.querySelector('.fab')
    if (!fab) return
    if (!fab.classList.contains('on')) fab.querySelector('.toggle')?.click()
    requestAnimationFrame(() => fab.querySelector('.opts a')?.focus())
  }, 0)
}

export default function Faq() {
  const { language } = useSession()
  const faqs = useResource(getFaqs)
  useEffect(() => {
    faqs.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const all = faqs.data ?? []
  const [active, setActive] = useState(0)
  /* what the panel is currently showing — it trails `active` through the
     fade so the text never changes while it is still visible */
  const [shown, setShown] = useState(0)
  const [swap, setSwap] = useState(false)
  const buttons = useRef([])
  const panel = useRef(null)
  const input = useRef(null)

  const [query, setQuery] = useState('')
  const term = useDebounced(query).trim()
  const needle = term.toLowerCase()
  const hit = (q) => !needle || `${q.question} ${q.answer} ${q.category}`.toLowerCase().includes(needle)
  const live = all.map((q, i) => i).filter((i) => hit(all[i]))
  const count = !term ? '' : `${live.length} ${live.length === 1 ? 'answer' : 'answers'} for “${term}”`

  /* The list length changes when the language does; an index left pointing
     past the end would render a blank panel. */
  useEffect(() => {
    if (active < all.length) return
    setActive(0)
    setShown(0)
  }, [all.length, active])

  /* Announce the search once it settles, and keep the detail panel on
     something that is actually still on screen. */
  useEffect(() => {
    if (term) say(live.length === 0 ? `No answers match ${term}` : count)
    if (live.length && !live.includes(active)) {
      setActive(live[0])
      setShown(live[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  useEffect(() => {
    if (active === shown) return
    if (reducedMotion()) {
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

  /* The panel is sticky and scrolls internally once an answer outruns a short
     window, and that offset is the old answer's, not the new one's — every
     question opens at its first line. */
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = 0
  }, [shown])

  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    /* only when the caret is actually on a question — otherwise arrow keys in
       the answer panel would jump the list out from under the reader */
    if (!document.activeElement?.classList.contains('qitem')) return
    /* search may have hidden most of the list; walk what is on screen */
    if (live.length < 2) return
    e.preventDefault()
    let here = live.indexOf(active)
    if (here === -1) here = 0
    const j =
      e.key === 'Home' ? 0
        : e.key === 'End' ? live.length - 1
          : e.key === 'ArrowDown' ? (here + 1) % live.length
            : (here - 1 + live.length) % live.length
    setActive(live[j])
    buttons.current[live[j]]?.focus()
  }

  const clear = () => {
    setQuery('')
    input.current?.focus()
  }

  const q = all[shown]
  const none = live.length === 0

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

      <Loader
        loading={faqs.loading}
        error={faqs.error}
        reload={faqs.reload}
        empty={all.length === 0}
        emptyText="No questions have been published yet."
      >
        <div className="qsearch up" style={{ marginBottom: 22 }}>
          <SearchField
            id="q-q"
            label="Search the FAQ"
            placeholder="Search help — refunds, devices, protocols…"
            clearLabel="Clear search"
            value={query}
            onChange={setQuery}
            inputRef={input}
          />
          <p className="srch-count" id="q-count">{count}</p>
        </div>

        <div className="qsplit up" id="qsplit" onKeyDown={onKeyDown}>
          <div className="qnav">
            {all.map((item, i) => (
              <div className={`qrow${i === active ? ' is-on' : ''}`} key={item.id} data-cat={item.category} hidden={!hit(item)}>
                <button
                  className="qitem"
                  id={`qbtn-${i + 1}`}
                  aria-expanded={i === active}
                  aria-controls={`qans-${i + 1}`}
                  ref={(el) => { buttons.current[i] = el }}
                  onClick={() => setActive(i)}
                >
                  <span className="qn mono">{pad(i + 1)}</span>
                  <span className="qt">{item.question}</span>
                  <span className="qc"><ChevronRight /></span>
                </button>
                <div className="qinline" id={`qans-${i + 1}`} role="region" aria-labelledby={`qbtn-${i + 1}`}>
                  <div><p>{item.answer}</p></div>
                </div>
              </div>
            ))}

            {/* a search that finds nothing has to offer the next move, not
                just go blank */}
            <StateCard
              id="q-empty"
              on={none}
              icon="search"
              title={<>No answer matches “<span id="q-empty-term">{term}</span>”</>}
              actions={
                <div className="ac-actions" style={{ justifyContent: 'center' }}>
                  <button type="button" className="btn btn-ghost btn-sm" id="q-empty-clear" onClick={clear}>
                    Clear the search
                  </button>
                  <a href="#" className="btn btn-primary btn-sm" data-fab-open onClick={openChat}>
                    <span>Send a message</span>
                    <span className="arw"><Arrow aria-hidden="true" focusable="false" /></span>
                  </a>
                </div>
              }
            >
              Try a shorter word, or ask us directly — someone writes back rather than a bot.
            </StateCard>
          </div>

          <div className={`qpanel${swap ? ' swap' : ''}`} id="qpanel" ref={panel} style={none ? { display: 'none' } : undefined}>
            <span className="ghost mono" id="qp-ghost">{pad(shown + 1)}</span>
            <div className="qp-top">
              <span className="qp-count mono" id="qp-count">{pad(shown + 1)} / {pad(all.length)}</span>
              <span className="qp-cat" id="qp-cat">{q?.category}</span>
            </div>
            <div className="qp-body">
              <h3 className="qp-q" id="qp-q">{q?.question}</h3>
              <p className="qp-a" id="qp-a">{q?.answer}</p>
            </div>
            <div className="qp-foot">
              <span className="hint">Didn&apos;t find it here?</span>
              <a href="#" className="link-u" data-fab-open onClick={openChat}>
                Send a Message
                <Arrow style={{ width: 13, height: 13 }} aria-hidden="true" focusable="false" />
              </a>
            </div>
          </div>
        </div>
      </Loader>
    </section>
  )
}
