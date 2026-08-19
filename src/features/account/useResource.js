import { useCallback, useEffect, useRef, useState } from 'react'

/* ==========================================================================
   useResource

   One GET, with the three states a panel actually has to render: loading,
   failed, and here-it-is. The mobile app gets this from react-query; a page
   with seven read-only panels does not need the cache, the retries or the
   window-focus refetching that come with it.

   `reload` re-runs the same fetch — used after a write, so the panel shows the
   server's version of what just happened rather than a guess.
   ========================================================================== */

export function useResource(fetcher, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled })
  /* the fetcher is usually an inline arrow, so a new identity every render;
     holding it in a ref keeps the effect from looping forever */
  const run = useRef(fetcher)
  run.current = fetcher
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await run.current()
      if (alive.current) setState({ data, error: null, loading: false })
      return data
    } catch (error) {
      if (alive.current) setState({ data: null, error, loading: false })
      return null
    }
  }, [])

  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])

  return { ...state, reload: load, set: (data) => setState({ data, error: null, loading: false }) }
}
