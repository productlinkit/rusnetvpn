import { useEffect, useRef, useState } from 'react'

/* ==========================================================================
   SEARCH FIELD — shared by the FAQ and the server list

   A labelled search input with a clear button that only exists once there is
   something to clear (`.srch.has`). Escape clears too, and stops there: the
   field sits on a page whose overlays also close on Escape, and emptying a
   search should not also dismiss whatever is open behind it.

   The field is controlled and reports every keystroke; filtering is the
   caller's, run on `useDebounced` so a list does not reflow under each letter
   — and so the live-region announcement of the result count is one sentence
   after the typing stops, not one per character.
   ========================================================================== */

const Mag = () => (
  <svg className="mag" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
    <circle cx="7" cy="7" r="4.6" />
    <path d="M10.5 10.5 14 14" />
  </svg>
)

const Cross = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)

/** `value` after it has stopped changing for `ms` — 160 is what the static page ran. */
export function useDebounced(value, ms = 160) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    /* clearing is not typing: an emptied field should show the whole list now,
       not a beat later with the stale filter still applied */
    if (value === '') {
      setSettled('')
      return
    }
    const t = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return settled
}

/**
 * `inputRef` is handed back so the empty state's "clear" button can return
 * focus to the field — clearing from a button that then disappears would
 * otherwise drop the user on <body>.
 */
export default function SearchField({ id, label, placeholder, clearLabel, value, onChange, inputRef }) {
  const own = useRef(null)
  const input = inputRef ?? own

  const clear = () => {
    onChange('')
    input.current?.focus()
  }

  return (
    <div className={`srch${value.trim() ? ' has' : ''}`} id={`${id}-srch`}>
      <Mag />
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input
        ref={input}
        type="search"
        id={id}
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !value) return
          e.stopPropagation()
          /* the browser's own Escape-clears-search would fire an input event
             after ours; let ours be the only one */
          e.preventDefault()
          clear()
        }}
      />
      <button type="button" className="clr" aria-label={clearLabel} onClick={clear}>
        <Cross />
      </button>
    </div>
  )
}
